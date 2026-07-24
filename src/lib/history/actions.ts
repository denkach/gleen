import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { HistoryRepository } from '@/lib/history/repository';
import { createSupabaseHistoryRepository } from '@/lib/history/supabase-repository';
import type { SupabaseHistoryClient } from '@/lib/history/supabase-repository';
import { resultTitleEditSchema } from '@/lib/result-workspace/edit-schemas';
import {
  createSupabaseResultUserStateRepository,
  type ResultUserStateRepository,
  type SupabaseResultUserStateClient,
} from '@/lib/result-workspace/user-state-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { IntakeActionState } from '@/lib/youtube-intake/action-state';
import { reanalyzeIntake } from '@/lib/youtube-intake/actions';
import type {
  AnalysisIntake,
  IntakeRepository,
} from '@/lib/youtube-intake/repository';
import {
  createSupabaseIntakeRepository,
  type ResultTitleRepository,
  type SupabaseIntakeClient,
} from '@/lib/youtube-intake/supabase-repository';

export type HistoryActionResult<T = undefined> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{
      ok: false;
      code: 'unauthorized' | 'not-found' | 'invalid' | 'conflict' | 'failed';
      message: string;
    }>;

type HistoryAuthenticatedContext = Readonly<{
  userId: string;
  history: Pick<
    HistoryRepository,
    'findOwnedReusableDuplicate' | 'deleteOwned'
  >;
  intake: Pick<IntakeRepository, 'findOwned'> & ResultTitleRepository;
  userState: Pick<ResultUserStateRepository, 'savePreference' | 'markOpened'>;
  reanalyze(sourceId: string): Promise<Readonly<{ redirectTo: string }>>;
}>;

export type HistoryActionDependencies = Readonly<{
  authenticate(): Promise<HistoryAuthenticatedContext | null>;
  revalidateHistory(): void;
  now?: () => Date;
}>;

const analysisIdentitySchema = z.object({ analysisId: z.uuid() }).strict();
const favoriteSchema = analysisIdentitySchema
  .extend({ favorite: z.boolean() })
  .strict();

const failures = {
  unauthorized: {
    ok: false,
    code: 'unauthorized',
    message: 'Your session has expired. Sign in and try again.',
  },
  'not-found': {
    ok: false,
    code: 'not-found',
    message: 'This saved analysis is no longer available.',
  },
  invalid: {
    ok: false,
    code: 'invalid',
    message: 'Check the requested change and try again.',
  },
  conflict: {
    ok: false,
    code: 'conflict',
    message: 'This title changed elsewhere. Refresh and try again.',
  },
  failed: {
    ok: false,
    code: 'failed',
    message: 'We could not update History. Try again.',
  },
} as const satisfies Record<
  Exclude<HistoryActionResult<never>, { ok: true }>['code'],
  Exclude<HistoryActionResult<never>, { ok: true }>
>;

async function ownedIntake(
  context: HistoryAuthenticatedContext,
  analysisId: string,
): Promise<AnalysisIntake | null> {
  return context.intake.findOwned(context.userId, analysisId);
}

export function createHistoryActions(dependencies: HistoryActionDependencies) {
  async function authenticate(): Promise<
    HistoryAuthenticatedContext | HistoryActionResult<never>
  > {
    try {
      return (await dependencies.authenticate()) ?? failures.unauthorized;
    } catch {
      return failures.failed;
    }
  }

  function success<T>(data: T): HistoryActionResult<T> {
    dependencies.revalidateHistory();
    return { ok: true, data };
  }

  return {
    async toggleHistoryFavorite(input: unknown): Promise<HistoryActionResult> {
      const parsed = favoriteSchema.safeParse(input);
      if (!parsed.success) return failures.invalid;

      const context = await authenticate();
      if ('ok' in context) return context;
      try {
        if (!(await ownedIntake(context, parsed.data.analysisId))) {
          return failures['not-found'];
        }
        await context.userState.savePreference({
          userId: context.userId,
          ...parsed.data,
        });
        return success(undefined);
      } catch {
        return failures.failed;
      }
    },

    async renameHistoryItem(
      input: unknown,
    ): Promise<HistoryActionResult<Readonly<{ updatedAt: string }>>> {
      const parsed = resultTitleEditSchema.safeParse(input);
      if (!parsed.success) return failures.invalid;

      const context = await authenticate();
      if ('ok' in context) return context;
      try {
        if (!(await ownedIntake(context, parsed.data.analysisId))) {
          return failures['not-found'];
        }
        const updatedAt = await context.intake.saveOwnedTitle({
          userId: context.userId,
          ...parsed.data,
        });
        return updatedAt ? success({ updatedAt }) : failures.conflict;
      } catch {
        return failures.failed;
      }
    },

    async deleteHistoryItem(input: unknown): Promise<HistoryActionResult> {
      const parsed = analysisIdentitySchema.safeParse(input);
      if (!parsed.success) return failures.invalid;

      const context = await authenticate();
      if ('ok' in context) return context;
      try {
        if (!(await ownedIntake(context, parsed.data.analysisId))) {
          return failures['not-found'];
        }
        const deleted = await context.history.deleteOwned(
          context.userId,
          parsed.data.analysisId,
        );
        return deleted ? success(undefined) : failures['not-found'];
      } catch {
        return failures.failed;
      }
    },

    async reanalyzeHistoryDuplicate(
      input: unknown,
    ): Promise<HistoryActionResult<Readonly<{ redirectTo: string }>>> {
      const parsed = analysisIdentitySchema.safeParse(input);
      if (!parsed.success) return failures.invalid;

      const context = await authenticate();
      if ('ok' in context) return context;
      try {
        const reusable = await context.history.findOwnedReusableDuplicate(
          context.userId,
          parsed.data.analysisId,
        );
        if (!reusable) return failures['not-found'];

        return success(await context.reanalyze(reusable.sourceId));
      } catch {
        return failures.failed;
      }
    },

    async markHistoryItemOpened(input: unknown): Promise<HistoryActionResult> {
      const parsed = analysisIdentitySchema.safeParse(input);
      if (!parsed.success) return failures.invalid;

      const context = await authenticate();
      if ('ok' in context) return context;
      try {
        if (!(await ownedIntake(context, parsed.data.analysisId))) {
          return failures['not-found'];
        }
        await context.userState.markOpened({
          userId: context.userId,
          analysisId: parsed.data.analysisId,
          openedAt: (dependencies.now?.() ?? new Date()).toISOString(),
        });
        return success(undefined);
      } catch {
        return failures.failed;
      }
    },
  };
}

async function productionContext(): Promise<HistoryAuthenticatedContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const intake = createSupabaseIntakeRepository(
    supabase as unknown as SupabaseIntakeClient,
  );

  return {
    userId: user.id,
    history: createSupabaseHistoryRepository(
      supabase as unknown as SupabaseHistoryClient,
    ),
    intake,
    userState: createSupabaseResultUserStateRepository(
      supabase as unknown as SupabaseResultUserStateClient,
    ),
    async reanalyze(sourceId) {
      const source = await intake.findOwned(user.id, sourceId);
      if (!source) throw new Error('owned source unavailable');

      const previousState: IntakeActionState = {
        status: 'duplicate',
        rawUrl: source.canonicalUrl,
        configuration: {
          ...source.configuration,
          artifacts: [...source.configuration.artifacts],
          summaryPreset: source.configuration.summaryPreset ?? 'balanced',
          flashcardPreset: source.configuration.flashcardPreset ?? 18,
        },
        existingId: source.id,
        duplicateConfiguration: source.configuration,
      };
      const formData = new FormData();
      formData.set('sourceId', sourceId);
      const result = await reanalyzeIntake(previousState, formData);
      if (result.status !== 'ready' || !result.redirectTo) {
        throw new Error('reanalysis unavailable');
      }
      return { redirectTo: result.redirectTo };
    },
  };
}

const productionActions = createHistoryActions({
  authenticate: productionContext,
  revalidateHistory: () => revalidatePath('/app/history'),
});

export async function toggleHistoryFavorite(
  input: unknown,
): Promise<HistoryActionResult> {
  'use server';
  return productionActions.toggleHistoryFavorite(input);
}

export async function renameHistoryItem(
  input: unknown,
): Promise<HistoryActionResult<Readonly<{ updatedAt: string }>>> {
  'use server';
  return productionActions.renameHistoryItem(input);
}

export async function deleteHistoryItem(
  input: unknown,
): Promise<HistoryActionResult> {
  'use server';
  return productionActions.deleteHistoryItem(input);
}

export async function reanalyzeHistoryDuplicate(
  input: unknown,
): Promise<HistoryActionResult<Readonly<{ redirectTo: string }>>> {
  'use server';
  return productionActions.reanalyzeHistoryDuplicate(input);
}

export async function markHistoryItemOpened(
  input: unknown,
): Promise<HistoryActionResult> {
  'use server';
  return productionActions.markHistoryItemOpened(input);
}

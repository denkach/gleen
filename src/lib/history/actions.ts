import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { historyMessages } from '@/lib/i18n/messages/history';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import {
  decodeHistoryCursor,
  parseHistoryQuery,
  serializeHistoryQuery,
} from '@/lib/history/query';
import type { HistoryPage, HistoryRepository } from '@/lib/history/repository';
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
import { retryAnalysis } from '@/lib/analysis-pipeline/retry-actions';
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
    }>;

type HistoryAuthenticatedContext = Readonly<{
  userId: string;
  history: Pick<
    HistoryRepository,
    'findOwnedReusableDuplicate' | 'deleteOwned' | 'listOwned'
  >;
  intake: Pick<IntakeRepository, 'findOwned'> & ResultTitleRepository;
  userState: Pick<ResultUserStateRepository, 'savePreference' | 'markOpened'>;
  reanalyze(sourceId: string): Promise<Readonly<{ redirectTo: string }>>;
  retryPartialAnalysis(
    analysisId: string,
  ): Promise<
    | Readonly<{ ok: true; attempt: number }>
    | Readonly<{ ok: false; error: 'retry_failed' }>
  >;
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
const loadMoreSchema = z
  .object({
    query: z.string().max(2_048),
    cursor: z.string().min(1).max(1_024),
  })
  .strict();

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

const failures = {
  unauthorized: { ok: false, code: 'unauthorized' },
  'not-found': { ok: false, code: 'not-found' },
  invalid: { ok: false, code: 'invalid' },
  conflict: { ok: false, code: 'conflict' },
  failed: { ok: false, code: 'failed' },
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

  function parseLoadMoreInput(
    input: unknown,
  ): Readonly<{ query: ReturnType<typeof parseHistoryQuery> }> | null {
    const parsed = loadMoreSchema.safeParse(input);
    if (!parsed.success) return null;

    const parameters = new URLSearchParams(parsed.data.query);
    if (parameters.has('cursor')) return null;

    const queryWithoutCursor = parseHistoryQuery(parameters);
    if (
      serializeHistoryQuery(queryWithoutCursor).toString() !== parsed.data.query
    ) {
      return null;
    }

    const cursor = decodeHistoryCursor(parsed.data.cursor);
    if (!cursor || cursor.sort !== queryWithoutCursor.sort) return null;

    const query = parseHistoryQuery(
      new URLSearchParams(
        `${parsed.data.query}${
          parsed.data.query ? '&' : ''
        }cursor=${encodeURIComponent(parsed.data.cursor)}`,
      ),
    );
    return query.cursor ? { query } : null;
  }

  return {
    async loadMoreHistory(
      input: unknown,
    ): Promise<HistoryActionResult<HistoryPage>> {
      const parsed = parseLoadMoreInput(input);
      if (!parsed) return failures.invalid;

      const context = await authenticate();
      if ('ok' in context) return context;
      try {
        return {
          ok: true,
          data: await context.history.listOwned(
            context.userId,
            parsed.query,
            20,
          ),
        };
      } catch {
        return failures.failed;
      }
    },

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

        return success(await context.reanalyze(reusable.id));
      } catch {
        return failures.failed;
      }
    },

    async retryPartialHistoryAnalysis(
      input: unknown,
    ): Promise<HistoryActionResult<Readonly<{ attempt: number }>>> {
      const parsed = analysisIdentitySchema.safeParse(input);
      if (!parsed.success) return failures.invalid;

      const context = await authenticate();
      if ('ok' in context) return context;
      try {
        const result = await context.retryPartialAnalysis(
          parsed.data.analysisId,
        );
        return result.ok
          ? success({ attempt: result.attempt })
          : failures.failed;
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
        if (
          !(await context.history.findOwnedReusableDuplicate(
            context.userId,
            parsed.data.analysisId,
          ))
        ) {
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
  const locale = await getRequestLocale();
  const copy = selectMessages(
    historyMessages,
    locale,
    'history',
    reportMissingTranslation,
  );
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
      { locale, copy },
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
    async retryPartialAnalysis(analysisId) {
      const formData = new FormData();
      formData.set('analysisId', analysisId);
      const result = await retryAnalysis(formData);
      return result.ok
        ? { ok: true, attempt: result.attempt }
        : { ok: false, error: 'retry_failed' };
    },
  };
}

const productionActions = createHistoryActions({
  authenticate: productionContext,
  revalidateHistory: () => {
    revalidatePath('/app/history');
    revalidatePath('/app');
  },
});

export async function toggleHistoryFavorite(
  input: unknown,
): Promise<HistoryActionResult> {
  'use server';
  return productionActions.toggleHistoryFavorite(input);
}

export async function loadMoreHistory(
  input: unknown,
): Promise<HistoryActionResult<HistoryPage>> {
  'use server';
  return productionActions.loadMoreHistory(input);
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

export async function retryPartialHistoryAnalysis(
  input: unknown,
): Promise<HistoryActionResult<Readonly<{ attempt: number }>>> {
  'use server';
  return productionActions.retryPartialHistoryAnalysis(input);
}

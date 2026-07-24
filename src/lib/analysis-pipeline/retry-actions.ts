'use server';

import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { AnalysisSnapshot } from './domain';
import type { AnalysisRepository } from './repository';
import { startAnalysis } from './start';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from './supabase-repository';
import { createNoopUsageLedger, type UsageLedger } from './usage-ledger';

export type RetryActionResult =
  | Readonly<{ ok: true; attempt: number }>
  | Readonly<{
      ok: false;
      error: 'invalid_request' | 'unauthorized' | 'retry_failed';
    }>;

type RetryDependencies = Readonly<{
  currentUserId(): Promise<string | null>;
  repository: AnalysisRepository;
  ledger: UsageLedger;
  start(
    jobId: string,
    repository: AnalysisRepository,
    ledger: UsageLedger,
  ): Promise<unknown>;
}>;

const analysisIdSchema = z.string().uuid();

export async function retryAnalysisWithDependencies(
  formData: FormData,
  dependencies: RetryDependencies,
): Promise<RetryActionResult> {
  const parsedId = analysisIdSchema.safeParse(formData.get('analysisId'));
  if (!parsedId.success) return { ok: false, error: 'invalid_request' };

  const userId = await dependencies.currentUserId();
  if (!userId) return { ok: false, error: 'unauthorized' };

  try {
    const snapshot = await dependencies.repository.prepareRetry(
      userId,
      parsedId.data,
    );
    await dependencies.start(
      snapshot.job.id,
      dependencies.repository,
      dependencies.ledger,
    );
    return { ok: true, attempt: snapshot.job.attempt };
  } catch {
    return { ok: false, error: 'retry_failed' };
  }
}

async function productionDependencies(): Promise<RetryDependencies> {
  const supabase = await createServerSupabaseClient();
  const repository = createSupabaseAnalysisRepository(
    supabase as unknown as SupabaseAnalysisClient,
  );
  return {
    currentUserId: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    repository,
    ledger: createNoopUsageLedger(repository),
    start: startAnalysis,
  };
}

export async function retryAnalysis(
  formData: FormData,
): Promise<RetryActionResult> {
  return retryAnalysisWithDependencies(
    formData,
    await productionDependencies(),
  );
}

export async function refreshAnalysisSnapshot(
  analysisId: string,
): Promise<AnalysisSnapshot | null> {
  const parsedId = analysisIdSchema.safeParse(analysisId);
  if (!parsedId.success) return null;
  const dependencies = await productionDependencies();
  const userId = await dependencies.currentUserId();
  if (!userId) return null;
  try {
    return await dependencies.repository.findOwnedSnapshot(
      userId,
      parsedId.data,
    );
  } catch {
    return null;
  }
}

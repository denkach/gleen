import { describe, expect, it, vi } from 'vitest';

import { UsageLimitReachedError } from '@/lib/analysis-pipeline/supabase-repository';

import { createIntakeActions } from './action-factory';
import { createInitialIntakeActionState } from './action-state';

const previousState = createInitialIntakeActionState({
  outputLocale: 'en',
  summaryPreset: 'balanced',
  flashcardPreset: 18,
});

function validForm(): FormData {
  const formData = new FormData();
  formData.set('rawUrl', 'https://youtu.be/abcdefghijk');
  formData.set('outputLocale', 'en');
  formData.set('summaryPreset', 'balanced');
  formData.set('flashcardPreset', '18');
  formData.append('artifacts', 'summary');
  return formData;
}

describe('intake action factory', () => {
  it('maps a usage reservation rejection to the closed limit redirect state', async () => {
    const submit = vi
      .fn()
      .mockRejectedValue(
        new UsageLimitReachedError('2026-08-01T00:00:00.000Z'),
      );
    const actions = createIntakeActions({
      authenticate: vi.fn(async () => ({
        userId: '22222222-2222-4222-8222-222222222222',
        service: { submit, reanalyze: vi.fn() } as never,
      })),
    });

    await expect(actions.submit(previousState, validForm())).resolves.toEqual({
      status: 'error',
      code: 'usage_limit_reached',
      redirectTo: '/app/subscription/limit-reached',
      rawUrl: 'https://youtu.be/abcdefghijk',
      configuration: {
        outputLocale: 'en',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
        artifacts: ['summary'],
        analysisContractVersion: 1,
      },
    });
  });
});

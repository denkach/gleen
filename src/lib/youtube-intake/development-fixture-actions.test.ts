import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IntakeActionState } from './action-state';
import { createInitialIntakeActionState } from './action-state';
import {
  submitProviderOutageFixture,
  submitUsageLimitFixture,
} from './development-fixture-actions';

const initialState = createInitialIntakeActionState({
  outputLocale: 'en',
  summaryPreset: 'balanced',
  flashcardPreset: 18,
});

function validForm() {
  const formData = new FormData();
  formData.set('rawUrl', 'https://youtu.be/dQw4w9WgXcQ');
  formData.set('outputLocale', 'en');
  formData.set('summaryPreset', 'balanced');
  formData.set('flashcardPreset', '18');
  formData.append('artifacts', 'summary');
  return formData;
}

describe('development fixture actions', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('keeps provider-outage feedback pending long enough to be observable', async () => {
    vi.useFakeTimers();
    let settled = false;
    const submission = submitProviderOutageFixture(
      initialState,
      validForm(),
    ).finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(199);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(submission).resolves.toMatchObject({ status: 'error' });
  });

  it('keeps the usage-limit action unavailable in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(
      submitUsageLimitFixture({} as IntakeActionState, new FormData()),
    ).rejects.toThrow(
      'Development intake fixtures are unavailable in production.',
    );
  });
});

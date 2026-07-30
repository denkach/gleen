import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IntakeActionState } from './action-state';
import { submitUsageLimitFixture } from './development-fixture-actions';

describe('development fixture actions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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

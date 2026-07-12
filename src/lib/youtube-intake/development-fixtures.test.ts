import { expect, test } from 'vitest';

import { createDevelopmentIntakeFixture } from './development-fixtures';

test.each([
  ['ready', 'ready'],
  ['duplicate', 'duplicate'],
  ['video-unavailable', 'video_unavailable'],
  ['transcript-unavailable', 'transcript_unavailable'],
  ['provider-outage', 'provider_unavailable'],
] as const)(
  'provides deterministic %s dependencies',
  async (scenario, expected) => {
    const fixture = createDevelopmentIntakeFixture(scenario, 'development');
    const result = await fixture.service
      .submit({
        userId: fixture.userId,
        rawUrl: 'https://youtu.be/dQw4w9WgXcQ',
        configuration: fixture.configuration,
      })
      .catch((error: { code: string }) => ({ code: error.code }));

    expect('kind' in result ? result.kind : result.code).toBe(expected);
  },
);

test('creates a deterministic second re-analysis attempt', async () => {
  const fixture = createDevelopmentIntakeFixture('reanalysis', 'test');
  await expect(
    fixture.service.reanalyze(fixture.userId, fixture.saved.id),
  ).resolves.toMatchObject({
    kind: 'ready',
    intake: { attempt: 2, reanalysisOf: fixture.saved.id },
  });
});

test('cannot construct fixture dependencies in production', () => {
  expect(() => createDevelopmentIntakeFixture('ready', 'production')).toThrow(
    'Development intake fixtures are unavailable in production.',
  );
});

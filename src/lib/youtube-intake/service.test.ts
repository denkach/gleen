import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IntakeConfiguration } from './configuration';
import { createDuplicateKey } from './fingerprint';
import type { IntakeErrorCode } from './providers';
import type { AnalysisIntake, IntakeRepository } from './repository';
import { createIntakeService, IntakeServiceError } from './service';

const configuration: IntakeConfiguration = {
  outputLocale: 'en',
  summaryPreset: 'balanced',
  flashcardPreset: 18,
  artifacts: ['summary', 'timestamps', 'transcript'],
  analysisContractVersion: 1,
};
const segments = [{ text: 'Hello', offsetMs: 0, durationMs: 1200 }];
const existing: AnalysisIntake = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  youtubeVideoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Old title',
  channelTitle: 'Old channel',
  durationSeconds: 212,
  thumbnailUrl: 'https://i.ytimg.com/old.jpg',
  transcriptLanguage: 'en',
  transcriptSegments: segments,
  configuration: { ...configuration, flashcardPreset: null },
  duplicateKey: 'a'.repeat(64),
  attempt: 1,
  status: 'ready',
  reanalysisOf: null,
  createdAt: '2026-07-12T10:00:00.000Z',
};
const validInput = {
  userId: existing.userId,
  rawUrl: '  https://youtu.be/dQw4w9WgXcQ?t=3  ',
  configuration,
};

function setup() {
  const pipeline = {
    createAndStart: vi.fn().mockResolvedValue(undefined),
  };
  const metadata = {
    getVideo: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        videoId: 'dQw4w9WgXcQ',
        title: 'Fresh title',
        channelTitle: 'Fresh channel',
        durationSeconds: 213,
        thumbnailUrl: 'https://i.ytimg.com/fresh.jpg',
        captionAvailable: true,
      },
    }),
  };
  const transcript = {
    getNativeTranscript: vi.fn().mockResolvedValue({
      ok: true,
      language: 'en',
      segments,
    }),
  };
  const repository: IntakeRepository = {
    findReusable: vi.fn().mockResolvedValue(null),
    insertReady: vi.fn().mockImplementation(async (input) => ({
      kind: 'inserted' as const,
      intake: {
        ...input,
        id: '33333333-3333-4333-8333-333333333333',
        attempt: 1,
        status: 'ready' as const,
        reanalysisOf: null,
        createdAt: '2026-07-12T11:00:00.000Z',
      },
    })),
    findOwned: vi.fn().mockResolvedValue(existing),
    createReanalysis: vi
      .fn()
      .mockImplementation(async (_userId, sourceId, input) => ({
        ...input,
        id: '44444444-4444-4444-8444-444444444444',
        attempt: 2,
        status: 'ready' as const,
        reanalysisOf: sourceId,
        createdAt: '2026-07-12T12:00:00.000Z',
      })),
  };
  return { metadata, transcript, repository, pipeline };
}

describe('createIntakeService', () => {
  beforeEach(() => vi.restoreAllMocks());

  test('rejects an invalid URL before calling providers or storage', async () => {
    const dependencies = setup();
    const service = createIntakeService(dependencies);

    await expect(
      service.submit({ ...validInput, rawUrl: 'https://example.com/video' }),
    ).rejects.toMatchObject({ code: 'invalid_url' });
    expect(dependencies.metadata.getVideo).not.toHaveBeenCalled();
    expect(dependencies.repository.findReusable).not.toHaveBeenCalled();
  });

  test('reuses an exact intake before requesting a paid transcript', async () => {
    const dependencies = setup();
    vi.mocked(dependencies.repository.findReusable).mockResolvedValue(existing);

    await expect(
      createIntakeService(dependencies).submit(validInput),
    ).resolves.toEqual({
      kind: 'duplicate',
      intake: existing,
    });
    expect(dependencies.metadata.getVideo).toHaveBeenCalledBefore(
      vi.mocked(dependencies.repository.findReusable),
    );
    expect(dependencies.transcript.getNativeTranscript).not.toHaveBeenCalled();
    expect(dependencies.repository.insertReady).not.toHaveBeenCalled();
  });

  test('validates providers and stores a transcript snapshot for a new intake', async () => {
    const dependencies = setup();

    await expect(
      createIntakeService(dependencies).submit(validInput),
    ).resolves.toMatchObject({
      kind: 'ready',
      intake: { status: 'ready' },
    });
    expect(dependencies.transcript.getNativeTranscript).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'en',
    );
    expect(dependencies.repository.insertReady).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: validInput.userId,
        title: 'Fresh title',
        transcriptSegments: segments,
        configuration: { ...configuration, flashcardPreset: null },
      }),
    );
    expect(dependencies.pipeline.createAndStart).toHaveBeenCalledWith(
      validInput.userId,
      '33333333-3333-4333-8333-333333333333',
    );
  });

  test.each<IntakeErrorCode>([
    'video_unavailable',
    'video_restricted',
    'live_not_ready',
    'unsupported_duration',
    'provider_configuration',
    'provider_unavailable',
  ])('returns metadata error code %s without downstream work', async (code) => {
    const dependencies = setup();
    dependencies.metadata.getVideo.mockResolvedValue({
      ok: false,
      code,
    } as never);

    await expect(
      createIntakeService(dependencies).submit(validInput),
    ).rejects.toEqual(new IntakeServiceError(code));
    expect(dependencies.repository.findReusable).not.toHaveBeenCalled();
    expect(dependencies.transcript.getNativeTranscript).not.toHaveBeenCalled();
  });

  test.each<IntakeErrorCode>([
    'transcript_unavailable',
    'transcript_language_unavailable',
    'provider_configuration',
    'provider_unavailable',
  ])('returns transcript error code %s without inserting', async (code) => {
    const dependencies = setup();
    dependencies.transcript.getNativeTranscript.mockResolvedValue({
      ok: false,
      code,
    } as never);

    await expect(
      createIntakeService(dependencies).submit(validInput),
    ).rejects.toEqual(new IntakeServiceError(code));
    expect(dependencies.repository.insertReady).not.toHaveBeenCalled();
  });

  test('returns duplicate when a concurrent insert winner is recovered', async () => {
    const dependencies = setup();
    vi.mocked(dependencies.repository.insertReady).mockResolvedValue({
      kind: 'recovered',
      intake: existing,
    });

    await expect(
      createIntakeService(dependencies).submit(validInput),
    ).resolves.toEqual({
      kind: 'duplicate',
      intake: existing,
    });
    expect(dependencies.transcript.getNativeTranscript).toHaveBeenCalledTimes(
      1,
    );
    expect(dependencies.repository.insertReady).toHaveBeenCalledTimes(1);
    expect(dependencies.pipeline.createAndStart).not.toHaveBeenCalled();
  });

  test('rejects re-analysis when the source is not owned', async () => {
    const dependencies = setup();
    vi.mocked(dependencies.repository.findOwned).mockResolvedValue(null);

    await expect(
      createIntakeService(dependencies).reanalyze(
        validInput.userId,
        existing.id,
      ),
    ).rejects.toMatchObject({ code: 'persistence_failure' });
    expect(dependencies.metadata.getVideo).not.toHaveBeenCalled();
    expect(dependencies.repository.createReanalysis).not.toHaveBeenCalled();
  });

  test('revalidates re-analysis and atomically stores a fresh snapshot from owned configuration', async () => {
    const dependencies = setup();

    await expect(
      createIntakeService(dependencies).reanalyze(
        validInput.userId,
        existing.id,
      ),
    ).resolves.toMatchObject({ kind: 'ready', intake: { attempt: 2 } });
    expect(dependencies.metadata.getVideo).toHaveBeenCalledWith(
      existing.youtubeVideoId,
    );
    expect(dependencies.transcript.getNativeTranscript).toHaveBeenCalledWith(
      existing.canonicalUrl,
      existing.configuration.outputLocale,
    );
    expect(dependencies.repository.createReanalysis).toHaveBeenCalledWith(
      validInput.userId,
      existing.id,
      expect.objectContaining({
        userId: validInput.userId,
        title: 'Fresh title',
        transcriptSegments: segments,
        configuration: existing.configuration,
        duplicateKey: createDuplicateKey(
          existing.youtubeVideoId,
          existing.configuration,
        ),
      }),
    );
    expect(dependencies.pipeline.createAndStart).toHaveBeenCalledWith(
      validInput.userId,
      '44444444-4444-4444-8444-444444444444',
    );
  });
});

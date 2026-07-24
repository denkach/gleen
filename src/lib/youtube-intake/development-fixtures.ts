import type {
  IntakeConfiguration,
  NormalizedIntakeConfiguration,
} from './configuration';
import { createIntakeService } from './service';
import type { TranscriptProvider, VideoMetadataProvider } from './providers';
import type {
  AnalysisIntake,
  IntakeRepository,
  NewAnalysisIntake,
} from './repository';

export type DevelopmentIntakeScenario =
  | 'ready'
  | 'duplicate'
  | 'invalid-url'
  | 'video-unavailable'
  | 'transcript-unavailable'
  | 'provider-outage'
  | 'reanalysis';

const userId = '22222222-2222-4222-8222-222222222222';
const configuration: IntakeConfiguration = {
  outputLocale: 'en',
  summaryPreset: 'balanced',
  flashcardPreset: 18,
  artifacts: ['summary', 'timestamps', 'transcript'],
  analysisContractVersion: 1,
};
const normalizedConfiguration: NormalizedIntakeConfiguration = {
  ...configuration,
  flashcardPreset: null,
};

export const fixtureSavedIntake: AnalysisIntake = {
  id: '11111111-1111-4111-8111-111111111111',
  userId,
  youtubeVideoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'How one video becomes reusable knowledge',
  channelTitle: 'Gleen Fixture Channel',
  durationSeconds: 212,
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  transcriptLanguage: 'en',
  transcriptSegments: [
    { text: 'Fixture transcript segment', offsetMs: 0, durationMs: 1200 },
  ],
  configuration: normalizedConfiguration,
  duplicateKey: 'a'.repeat(64),
  attempt: 1,
  status: 'ready',
  reanalysisOf: null,
  createdAt: '2026-07-12T10:00:00.000Z',
};

export function createDevelopmentIntakeFixture(
  scenario: DevelopmentIntakeScenario,
  nodeEnv: string | undefined = process.env.NODE_ENV,
) {
  if (nodeEnv === 'production')
    throw new Error(
      'Development intake fixtures are unavailable in production.',
    );

  const metadata: VideoMetadataProvider = {
    getVideo: async () =>
      scenario === 'video-unavailable'
        ? { ok: false as const, code: 'video_unavailable' as const }
        : scenario === 'provider-outage'
          ? { ok: false as const, code: 'provider_unavailable' as const }
          : {
              ok: true,
              data: {
                videoId: fixtureSavedIntake.youtubeVideoId,
                title: fixtureSavedIntake.title,
                channelTitle: fixtureSavedIntake.channelTitle,
                durationSeconds: fixtureSavedIntake.durationSeconds,
                thumbnailUrl: fixtureSavedIntake.thumbnailUrl,
                captionAvailable: true,
              },
            },
  };
  const transcript: TranscriptProvider = {
    getNativeTranscript: async () =>
      scenario === 'transcript-unavailable'
        ? { ok: false as const, code: 'transcript_unavailable' as const }
        : {
            ok: true,
            language: 'en',
            segments: fixtureSavedIntake.transcriptSegments,
          },
  };
  const repository: IntakeRepository = {
    findReusable: async () =>
      scenario === 'duplicate' || scenario === 'reanalysis'
        ? fixtureSavedIntake
        : null,
    insertReady: async (input: NewAnalysisIntake) => ({
      kind: 'inserted',
      intake: {
        ...input,
        id: '33333333-3333-4333-8333-333333333333',
        attempt: 1,
        status: 'ready',
        reanalysisOf: null,
        createdAt: '2026-07-12T11:00:00.000Z',
      },
    }),
    findOwned: async (_owner, id) =>
      id === fixtureSavedIntake.id ? fixtureSavedIntake : null,
    createReanalysis: async (_owner, sourceId, input) => ({
      ...input,
      id: '44444444-4444-4444-8444-444444444444',
      attempt: 2,
      status: 'ready',
      reanalysisOf: sourceId,
      createdAt: '2026-07-12T12:00:00.000Z',
    }),
  };
  const pipeline = {
    createAndStart: async () => undefined,
  };
  return {
    userId,
    configuration,
    saved: fixtureSavedIntake,
    service: createIntakeService({
      metadata,
      transcript,
      repository,
      pipeline,
    }),
  };
}

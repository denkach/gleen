import { ZodError } from 'zod';

import { normalizeIntakeConfiguration } from './configuration';
import type { IntakeConfiguration } from './configuration';
import { createDuplicateKey } from './fingerprint';
import type {
  IntakeErrorCode,
  TranscriptProvider,
  VideoMetadataProvider,
} from './providers';
import type {
  AnalysisIntake,
  IntakeRepository,
  NewAnalysisIntake,
} from './repository';
import { parseYouTubeUrl } from './url';

export type IntakeServiceDependencies = Readonly<{
  metadata: VideoMetadataProvider;
  transcript: TranscriptProvider;
  repository: IntakeRepository;
}>;

export type SubmitIntakeInput = Readonly<{
  userId: string;
  rawUrl: string;
  configuration: IntakeConfiguration;
}>;

export type IntakeServiceResult =
  | Readonly<{ kind: 'duplicate'; intake: AnalysisIntake }>
  | Readonly<{ kind: 'ready'; intake: AnalysisIntake }>;

export class IntakeServiceError extends Error {
  constructor(readonly code: IntakeErrorCode) {
    super(code);
    this.name = 'IntakeServiceError';
  }
}

function fail(code: IntakeErrorCode): never {
  throw new IntakeServiceError(code);
}

export function createIntakeService(dependencies: IntakeServiceDependencies) {
  const validateProviders = async (
    videoId: string,
    canonicalUrl: string,
    preferredLanguage: string,
  ) => {
    const metadataResult = await dependencies.metadata.getVideo(videoId);
    if (!metadataResult.ok) fail(metadataResult.code);

    const transcriptResult = await dependencies.transcript.getNativeTranscript(
      canonicalUrl,
      preferredLanguage,
    );
    if (!transcriptResult.ok) fail(transcriptResult.code);

    return { metadata: metadataResult.data, transcript: transcriptResult };
  };

  return {
    async submit(input: SubmitIntakeInput): Promise<IntakeServiceResult> {
      const url = parseYouTubeUrl(input.rawUrl);
      if (!url.ok) fail(url.code);

      let configuration;
      try {
        configuration = normalizeIntakeConfiguration(input.configuration);
      } catch (error) {
        if (error instanceof ZodError) fail('invalid_url');
        throw error;
      }

      const metadataResult = await dependencies.metadata.getVideo(url.videoId);
      if (!metadataResult.ok) fail(metadataResult.code);

      const duplicateKey = createDuplicateKey(url.videoId, configuration);
      const reusable = await dependencies.repository.findReusable(
        input.userId,
        duplicateKey,
      );
      if (reusable) return { kind: 'duplicate', intake: reusable };

      const transcriptResult =
        await dependencies.transcript.getNativeTranscript(
          url.canonicalUrl,
          configuration.outputLocale,
        );
      if (!transcriptResult.ok) fail(transcriptResult.code);

      const intake = await dependencies.repository.insertReady({
        userId: input.userId,
        youtubeVideoId: url.videoId,
        canonicalUrl: url.canonicalUrl,
        title: metadataResult.data.title,
        channelTitle: metadataResult.data.channelTitle,
        durationSeconds: metadataResult.data.durationSeconds,
        thumbnailUrl: metadataResult.data.thumbnailUrl,
        transcriptLanguage: transcriptResult.language,
        transcriptSegments: transcriptResult.segments,
        configuration,
        duplicateKey,
      });
      return { kind: 'ready', intake };
    },

    async reanalyze(
      userId: string,
      sourceId: string,
    ): Promise<Extract<IntakeServiceResult, { kind: 'ready' }>> {
      const source = await dependencies.repository.findOwned(userId, sourceId);
      if (!source) fail('persistence_failure');

      const refreshed = await validateProviders(
        source.youtubeVideoId,
        source.canonicalUrl,
        source.configuration.outputLocale,
      );
      const snapshot: NewAnalysisIntake = {
        userId,
        youtubeVideoId: source.youtubeVideoId,
        canonicalUrl: source.canonicalUrl,
        title: refreshed.metadata.title,
        channelTitle: refreshed.metadata.channelTitle,
        durationSeconds: refreshed.metadata.durationSeconds,
        thumbnailUrl: refreshed.metadata.thumbnailUrl,
        transcriptLanguage: refreshed.transcript.language,
        transcriptSegments: refreshed.transcript.segments,
        configuration: source.configuration,
        duplicateKey: createDuplicateKey(
          source.youtubeVideoId,
          source.configuration,
        ),
      };
      const intake = await dependencies.repository.createReanalysis(
        userId,
        sourceId,
        snapshot,
      );
      return { kind: 'ready', intake };
    },
  };
}

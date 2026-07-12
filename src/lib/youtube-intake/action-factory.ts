import type { IntakeActionState } from './action-state';
import {
  intakeConfigurationSchema,
  type IntakeConfiguration,
} from './configuration';
import type { IntakeErrorCode } from './providers';
import { IntakeServiceError } from './service';
import type { createIntakeService } from './service';

type IntakeService = ReturnType<typeof createIntakeService>;

export type IntakeActionDependencies = Readonly<{
  authenticate(): Promise<Readonly<{
    userId: string;
    service: IntakeService;
  }> | null>;
  resultPathPrefix?: string;
}>;

const safeMessages: Record<IntakeErrorCode, string> = {
  invalid_url: 'Enter a supported YouTube URL and valid analysis options.',
  video_unavailable: 'This video is private or unavailable.',
  video_restricted: 'This video is restricted or cannot be embedded.',
  live_not_ready: 'This live video is not ready for analysis.',
  unsupported_duration: 'This video duration is not supported.',
  transcript_unavailable:
    'A native transcript is not available for this video.',
  transcript_language_unavailable:
    'A transcript is not available in the selected language.',
  provider_configuration: 'Video analysis is temporarily unavailable.',
  provider_unavailable:
    'The video service is temporarily unavailable. Try again.',
  session_expired: 'Your session has expired. Sign in and try again.',
  persistence_failure: 'We could not save this analysis. Try again.',
};

function formConfiguration(
  formData: FormData,
  previous: IntakeConfiguration,
): IntakeConfiguration {
  return {
    outputLocale: formData.get('outputLocale') ?? previous.outputLocale,
    summaryPreset: formData.get('summaryPreset') ?? previous.summaryPreset,
    flashcardPreset: Number(
      formData.get('flashcardPreset') ?? previous.flashcardPreset,
    ),
    artifacts: formData.getAll('artifacts'),
    analysisContractVersion: 1,
  } as IntakeConfiguration;
}

function errorState(
  rawUrl: string,
  configuration: IntakeConfiguration,
  code: IntakeErrorCode,
): IntakeActionState {
  return {
    status: 'error',
    rawUrl,
    configuration,
    message: safeMessages[code],
  };
}

function codeFrom(error: unknown): IntakeErrorCode {
  return error instanceof IntakeServiceError
    ? error.code
    : 'persistence_failure';
}

export function createIntakeActions(dependencies: IntakeActionDependencies) {
  const resultPathPrefix = dependencies.resultPathPrefix ?? '/app/video';
  return {
    async submit(
      previousState: IntakeActionState,
      formData: FormData,
    ): Promise<IntakeActionState> {
      const rawUrl = String(formData.get('rawUrl') ?? '');
      const configuration = formConfiguration(
        formData,
        previousState.configuration,
      );
      let authenticated;
      try {
        authenticated = await dependencies.authenticate();
      } catch {
        return errorState(rawUrl, configuration, 'provider_configuration');
      }
      if (!authenticated)
        return errorState(rawUrl, configuration, 'session_expired');

      const parsed = intakeConfigurationSchema.safeParse(configuration);
      if (!parsed.success) {
        const artifactsIssue = parsed.error.issues.some(
          (issue) => issue.path[0] === 'artifacts',
        );
        return {
          status: 'error',
          rawUrl,
          configuration,
          message: artifactsIssue
            ? 'Choose at least one artifact.'
            : safeMessages.invalid_url,
        };
      }
      try {
        const result = await authenticated.service.submit({
          userId: authenticated.userId,
          rawUrl,
          configuration: parsed.data,
        });
        return result.kind === 'duplicate'
          ? {
              status: 'duplicate',
              rawUrl,
              configuration: parsed.data,
              existingId: result.intake.id,
            }
          : {
              status: 'ready',
              rawUrl,
              configuration: parsed.data,
              redirectTo: `${resultPathPrefix}/${result.intake.id}`,
            };
      } catch (error) {
        return errorState(rawUrl, configuration, codeFrom(error));
      }
    },
    async reanalyze(
      previousState: IntakeActionState,
      formData: FormData,
    ): Promise<IntakeActionState> {
      let authenticated;
      try {
        authenticated = await dependencies.authenticate();
      } catch {
        return errorState(
          previousState.rawUrl,
          previousState.configuration,
          'provider_configuration',
        );
      }
      if (!authenticated)
        return errorState(
          previousState.rawUrl,
          previousState.configuration,
          'session_expired',
        );
      try {
        const result = await authenticated.service.reanalyze(
          authenticated.userId,
          String(formData.get('sourceId') ?? ''),
        );
        return {
          status: 'ready',
          rawUrl: previousState.rawUrl,
          configuration: previousState.configuration,
          redirectTo: `${resultPathPrefix}/${result.intake.id}`,
        };
      } catch (error) {
        return errorState(
          previousState.rawUrl,
          previousState.configuration,
          codeFrom(error),
        );
      }
    },
  };
}

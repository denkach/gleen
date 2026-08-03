import type { IntakeActionState } from './action-state';
import { UsageLimitReachedError } from '@/lib/analysis-pipeline/supabase-repository';
import {
  intakeConfigurationSchema,
  normalizeIntakeConfiguration,
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

const actionCodeByServiceCode: Record<
  IntakeErrorCode,
  NonNullable<IntakeActionState['code']>
> = {
  invalid_url: 'invalid_url',
  video_unavailable: 'video_unavailable',
  video_restricted: 'video_unavailable',
  live_not_ready: 'video_unavailable',
  unsupported_duration: 'video_unavailable',
  transcript_unavailable: 'transcript_unavailable',
  transcript_language_unavailable: 'transcript_unavailable',
  provider_configuration: 'provider_outage',
  provider_unavailable: 'provider_outage',
  session_expired: 'session_expired',
  usage_limit_reached: 'usage_limit_reached',
  persistence_failure: 'unexpected',
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
  serviceCode: IntakeErrorCode,
): IntakeActionState {
  const code = actionCodeByServiceCode[serviceCode];
  if (code === 'usage_limit_reached') {
    return {
      status: 'error',
      code,
      redirectTo: '/app/subscription/limit-reached',
      rawUrl,
      configuration,
    };
  }
  return {
    status: 'error',
    rawUrl,
    configuration,
    code,
  };
}

function codeFrom(error: unknown): IntakeErrorCode {
  if (error instanceof UsageLimitReachedError) return 'usage_limit_reached';
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
          code: artifactsIssue ? 'no_artifacts' : 'invalid_url',
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
              duplicateConfiguration: normalizeIntakeConfiguration({
                ...result.intake.configuration,
                summaryPreset:
                  result.intake.configuration.summaryPreset ?? 'balanced',
                flashcardPreset:
                  result.intake.configuration.flashcardPreset ?? 18,
              }),
            }
          : {
              status: 'ready',
              rawUrl,
              configuration: parsed.data,
              analysisId: result.intake.id,
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

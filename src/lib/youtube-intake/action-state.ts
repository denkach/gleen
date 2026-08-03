import {
  defaultArtifactSelection,
  type IntakeConfiguration,
  type NormalizedIntakeConfiguration,
} from './configuration';

export type IntakeActionErrorCode =
  | 'invalid_url'
  | 'video_unavailable'
  | 'live_not_ready'
  | 'unsupported_duration'
  | 'transcript_unavailable'
  | 'transcript_language_unavailable'
  | 'provider_outage'
  | 'no_artifacts'
  | 'session_expired'
  | 'usage_limit_reached'
  | 'unexpected';

export type IntakeActionState = Readonly<{
  status: 'idle' | 'error' | 'duplicate' | 'ready';
  rawUrl: string;
  configuration: IntakeConfiguration;
  existingId?: string;
  duplicateConfiguration?: NormalizedIntakeConfiguration;
  analysisId?: string;
  code?: IntakeActionErrorCode;
  redirectTo?: string;
}>;

type IntakeProfileDefaults = Pick<
  IntakeConfiguration,
  'outputLocale' | 'summaryPreset' | 'flashcardPreset'
>;

export function createInitialIntakeActionState(
  defaults: IntakeProfileDefaults,
): IntakeActionState {
  return {
    status: 'idle',
    rawUrl: '',
    configuration: {
      ...defaults,
      artifacts: [...defaultArtifactSelection],
      analysisContractVersion: 1,
    },
  };
}

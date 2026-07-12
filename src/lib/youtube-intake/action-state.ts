import {
  defaultArtifactSelection,
  type IntakeConfiguration,
} from './configuration';

export type IntakeActionState = Readonly<{
  status: 'idle' | 'error' | 'duplicate' | 'ready';
  rawUrl: string;
  configuration: IntakeConfiguration;
  message?: string;
  existingId?: string;
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

'use server';

import { validateProviderEnv } from '@/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import {
  defaultArtifactSelection,
  intakeConfigurationSchema,
  type IntakeConfiguration,
} from './configuration';
import type { IntakeErrorCode } from './providers';
import { createIntakeService, IntakeServiceError } from './service';
import { createSupabaseIntakeRepository } from './supabase-repository';
import type { SupabaseIntakeClient } from './supabase-repository';
import { createSupadataProvider } from './supadata-provider';
import { createYouTubeProvider } from './youtube-provider';

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

function formConfiguration(
  formData: FormData,
  previous: IntakeConfiguration,
): IntakeConfiguration {
  const outputLocale = formData.get('outputLocale') ?? previous.outputLocale;
  const summaryPreset = formData.get('summaryPreset') ?? previous.summaryPreset;
  const flashcardValue =
    formData.get('flashcardPreset') ?? previous.flashcardPreset;

  return {
    outputLocale,
    summaryPreset,
    flashcardPreset: Number(flashcardValue),
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

async function authenticatedService() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const environment = validateProviderEnv(process.env);
  const service = createIntakeService({
    metadata: createYouTubeProvider(environment.YOUTUBE_DATA_API_KEY),
    transcript: createSupadataProvider(environment.SUPADATA_API_KEY),
    repository: createSupabaseIntakeRepository(
      supabase as unknown as SupabaseIntakeClient,
    ),
  });
  return { user, service };
}

function codeFrom(error: unknown): IntakeErrorCode {
  return error instanceof IntakeServiceError
    ? error.code
    : 'persistence_failure';
}

export async function submitYouTubeIntake(
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
    authenticated = await authenticatedService();
  } catch {
    return errorState(rawUrl, configuration, 'provider_configuration');
  }
  if (!authenticated) {
    return errorState(rawUrl, configuration, 'session_expired');
  }

  const parsedConfiguration =
    intakeConfigurationSchema.safeParse(configuration);
  if (!parsedConfiguration.success) {
    const artifactsIssue = parsedConfiguration.error.issues.some(
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
      userId: authenticated.user.id,
      rawUrl,
      configuration: parsedConfiguration.data,
    });
    if (result.kind === 'duplicate') {
      return {
        status: 'duplicate',
        rawUrl,
        configuration: parsedConfiguration.data,
        existingId: result.intake.id,
      };
    }
    return {
      status: 'ready',
      rawUrl,
      configuration: parsedConfiguration.data,
      redirectTo: `/app/video/${result.intake.id}`,
    };
  } catch (error) {
    return errorState(rawUrl, configuration, codeFrom(error));
  }
}

export async function reanalyzeIntake(
  previousState: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const sourceId = String(formData.get('sourceId') ?? '');
  let authenticated;
  try {
    authenticated = await authenticatedService();
  } catch {
    return errorState(
      previousState.rawUrl,
      previousState.configuration,
      'provider_configuration',
    );
  }
  if (!authenticated) {
    return errorState(
      previousState.rawUrl,
      previousState.configuration,
      'session_expired',
    );
  }

  try {
    const result = await authenticated.service.reanalyze(
      authenticated.user.id,
      sourceId,
    );
    return {
      status: 'ready',
      rawUrl: previousState.rawUrl,
      configuration: previousState.configuration,
      redirectTo: `/app/video/${result.intake.id}`,
    };
  } catch (error) {
    return errorState(
      previousState.rawUrl,
      previousState.configuration,
      codeFrom(error),
    );
  }
}

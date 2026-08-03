'use server';

import type { IntakeActionState } from './action-state';
import { createIntakeActions } from './action-factory';
import {
  createDevelopmentIntakeFixture,
  type DevelopmentIntakeScenario,
} from './development-fixtures';

function actions(scenario: DevelopmentIntakeScenario) {
  return createIntakeActions({
    resultPathPrefix: '/app-shell-fixture/app/video',
    authenticate: async () => {
      const fixture = createDevelopmentIntakeFixture(scenario);
      return { userId: fixture.userId, service: fixture.service };
    },
  });
}

async function submit(
  scenario: DevelopmentIntakeScenario,
  previous: IntakeActionState,
  formData: FormData,
) {
  if (scenario === 'ready')
    await new Promise((resolve) => setTimeout(resolve, 1_800));
  if (scenario === 'provider-outage')
    await new Promise((resolve) => setTimeout(resolve, 200));
  const result = await actions(scenario).submit(previous, formData);
  if (scenario === 'ready' && result.redirectTo) {
    const params = new URLSearchParams({
      outputLocale: String(formData.get('outputLocale')),
      summaryPreset: String(formData.get('summaryPreset')),
    });
    if (formData.getAll('artifacts').includes('flashcards'))
      params.set('flashcardPreset', String(formData.get('flashcardPreset')));
    return {
      ...result,
      redirectTo: `${result.redirectTo}?${params}`,
    };
  }
  return result;
}

export async function submitReadyFixture(
  previous: IntakeActionState,
  formData: FormData,
) {
  return submit('ready', previous, formData);
}
export async function submitDuplicateFixture(
  previous: IntakeActionState,
  formData: FormData,
) {
  return submit('duplicate', previous, formData);
}
export async function submitInvalidUrlFixture(
  previous: IntakeActionState,
  formData: FormData,
) {
  return submit('invalid-url', previous, formData);
}
export async function submitVideoUnavailableFixture(
  previous: IntakeActionState,
  formData: FormData,
) {
  return submit('video-unavailable', previous, formData);
}
export async function submitTranscriptUnavailableFixture(
  previous: IntakeActionState,
  formData: FormData,
) {
  return submit('transcript-unavailable', previous, formData);
}
export async function submitProviderOutageFixture(
  previous: IntakeActionState,
  formData: FormData,
) {
  return submit('provider-outage', previous, formData);
}
export async function submitUsageLimitFixture(
  previous: IntakeActionState,
  _formData: FormData,
) {
  void _formData;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Development intake fixtures are unavailable in production.',
    );
  }
  return {
    ...previous,
    status: 'error',
    code: 'usage_limit_reached',
    redirectTo: '/app/subscription/limit-reached',
  } as const;
}
export async function submitReanalysisFixture(
  previous: IntakeActionState,
  formData: FormData,
) {
  return submit('reanalysis', previous, formData);
}
export async function reanalyzeFixture(
  previous: IntakeActionState,
  formData: FormData,
) {
  return actions('reanalysis').reanalyze(previous, formData);
}

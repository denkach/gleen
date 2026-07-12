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
    await new Promise((resolve) => setTimeout(resolve, 250));
  return actions(scenario).submit(previous, formData);
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

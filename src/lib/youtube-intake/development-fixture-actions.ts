'use server';

import { cookies } from 'next/headers';

import type { SummaryModeActionState } from '@/lib/settings/actions';
import { summaryModeSchema } from '@/lib/summary-mode';

import type { IntakeActionState } from './action-state';
import { createIntakeActions } from './action-factory';
import {
  createDevelopmentIntakeFixture,
  type DevelopmentIntakeScenario,
} from './development-fixtures';
import {
  fixtureAnalysisSummaryCookie,
  fixtureSummaryDefaultCookie,
} from './development-fixture-preferences';

function ensureDevelopmentFixture() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Development intake fixtures are unavailable in production.',
    );
  }
}

async function persistFixtureSummaryMode(name: string, mode: string) {
  const cookieStore = await cookies();
  cookieStore.set(name, mode, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });
}

export async function setFixtureSummaryMode(
  _previousState: SummaryModeActionState,
  formData: FormData,
): Promise<SummaryModeActionState> {
  ensureDevelopmentFixture();
  const parsed = summaryModeSchema.safeParse(formData.get('summaryMode'));
  if (!parsed.success) {
    return { status: 'error', code: 'invalid_summary_mode' };
  }

  await persistFixtureSummaryMode(fixtureSummaryDefaultCookie, parsed.data);
  return { status: 'success', mode: parsed.data };
}

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
  if (scenario === 'ready' && result.status === 'ready') {
    const summaryPreset = summaryModeSchema.parse(
      formData.get('summaryPreset'),
    );
    await persistFixtureSummaryMode(
      fixtureAnalysisSummaryCookie,
      summaryPreset,
    );
  }
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
  ensureDevelopmentFixture();
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

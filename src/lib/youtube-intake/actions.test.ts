import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  getUser,
  submit,
  reanalyze,
  createYouTubeProvider,
  createSupadataProvider,
  createSupabaseIntakeRepository,
  createIntakeService,
} = vi.hoisted(() => {
  const submit = vi.fn();
  const reanalyze = vi.fn();
  return {
    getUser: vi.fn(),
    submit,
    reanalyze,
    createYouTubeProvider: vi.fn(() => ({ getVideo: vi.fn() })),
    createSupadataProvider: vi.fn(() => ({ getNativeTranscript: vi.fn() })),
    createSupabaseIntakeRepository: vi.fn(() => ({})),
    createIntakeService: vi.fn(() => ({ submit, reanalyze })),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/env', () => ({
  validateProviderEnv: vi.fn(() => ({
    YOUTUBE_DATA_API_KEY: 'youtube-key',
    SUPADATA_API_KEY: 'supadata-key',
  })),
}));
vi.mock('./youtube-provider', () => ({ createYouTubeProvider }));
vi.mock('./supadata-provider', () => ({ createSupadataProvider }));
vi.mock('./supabase-repository', () => ({ createSupabaseIntakeRepository }));
vi.mock('./service', async (importOriginal) => {
  const original = await importOriginal<typeof import('./service')>();
  return { ...original, createIntakeService };
});

import { reanalyzeIntake, submitYouTubeIntake } from './actions';
import { createInitialIntakeActionState } from './action-state';
import { IntakeServiceError } from './service';

const previousState = createInitialIntakeActionState({
  outputLocale: 'en',
  summaryPreset: 'balanced',
  flashcardPreset: 18,
});

function form(overrides: Record<string, string | string[]> = {}) {
  const data = new FormData();
  const values: Record<string, string | string[]> = {
    rawUrl: ' https://youtu.be/dQw4w9WgXcQ ',
    outputLocale: 'de',
    summaryPreset: 'detailed',
    flashcardPreset: '30',
    artifacts: ['transcript', 'flashcards'],
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) {
    for (const entry of Array.isArray(value) ? value : [value])
      data.append(key, entry);
  }
  return data;
}

describe('intake server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: '22222222-2222-4222-8222-222222222222' } },
    });
  });

  test('creates first-render state from profile defaults and domain artifact defaults', () => {
    expect(previousState).toEqual({
      status: 'idle',
      rawUrl: '',
      configuration: {
        outputLocale: 'en',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
        artifacts: ['summary', 'timestamps', 'transcript'],
        analysisContractVersion: 1,
      },
    });
  });

  test('authenticates before provider setup and returns safe session-expiry copy', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const state = await submitYouTubeIntake(previousState, form());

    expect(state).toMatchObject({
      status: 'error',
      rawUrl: ' https://youtu.be/dQw4w9WgXcQ ',
      message: 'Your session has expired. Sign in and try again.',
    });
    expect(state.configuration.artifacts).toEqual(['transcript', 'flashcards']);
    expect(createYouTubeProvider).not.toHaveBeenCalled();
    expect(createIntakeService).not.toHaveBeenCalled();
  });

  test('passes authenticated identity and repeated artifacts while preserving raw form state', async () => {
    submit.mockRejectedValue(new IntakeServiceError('transcript_unavailable'));
    const state = await submitYouTubeIntake(previousState, form());

    expect(submit).toHaveBeenCalledWith({
      userId: '22222222-2222-4222-8222-222222222222',
      rawUrl: ' https://youtu.be/dQw4w9WgXcQ ',
      configuration: {
        outputLocale: 'de',
        summaryPreset: 'detailed',
        flashcardPreset: 30,
        artifacts: ['transcript', 'flashcards'],
        analysisContractVersion: 1,
      },
    });
    expect(state).toMatchObject({
      status: 'error',
      rawUrl: ' https://youtu.be/dQw4w9WgXcQ ',
      message: 'A native transcript is not available for this video.',
    });
    expect(state.configuration.artifacts).toEqual(['transcript', 'flashcards']);
  });

  test('preserves an empty artifact selection after local validation failure', async () => {
    const state = await submitYouTubeIntake(
      previousState,
      form({ artifacts: [] }),
    );

    expect(state).toMatchObject({
      status: 'error',
      message: 'Choose at least one artifact.',
      configuration: { artifacts: [] },
    });
    expect(submit).not.toHaveBeenCalled();
  });

  test('duplicate state exposes the saved normalized configuration without private intake data', async () => {
    submit.mockResolvedValue({
      kind: 'duplicate',
      intake: {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Must not leak through state',
        transcriptSegments: [{ text: 'private', offsetMs: 0, durationMs: 1 }],
        configuration: {
          outputLocale: 'uk',
          summaryPreset: null,
          flashcardPreset: 30,
          artifacts: ['transcript', 'flashcards'],
          analysisContractVersion: 1,
        },
      },
    });

    await expect(submitYouTubeIntake(previousState, form())).resolves.toEqual({
      status: 'duplicate',
      rawUrl: ' https://youtu.be/dQw4w9WgXcQ ',
      configuration: expect.any(Object),
      existingId: '11111111-1111-4111-8111-111111111111',
      duplicateConfiguration: {
        outputLocale: 'uk',
        summaryPreset: null,
        flashcardPreset: 30,
        artifacts: ['flashcards', 'transcript'],
        analysisContractVersion: 1,
      },
    });
  });

  test('ready state returns deterministic client navigation data', async () => {
    submit.mockResolvedValue({
      kind: 'ready',
      intake: { id: '33333333-3333-4333-8333-333333333333' },
    });

    await expect(
      submitYouTubeIntake(previousState, form()),
    ).resolves.toMatchObject({
      status: 'ready',
      redirectTo: '/app/video/33333333-3333-4333-8333-333333333333',
    });
  });

  test.each([
    [
      'invalid_url',
      'Enter a supported YouTube URL and valid analysis options.',
    ],
    ['video_unavailable', 'This video is private or unavailable.'],
    ['video_restricted', 'This video is restricted or cannot be embedded.'],
    ['live_not_ready', 'This live video is not ready for analysis.'],
    ['unsupported_duration', 'This video duration is not supported.'],
    [
      'transcript_unavailable',
      'A native transcript is not available for this video.',
    ],
    [
      'transcript_language_unavailable',
      'A transcript is not available in the selected language.',
    ],
    ['provider_configuration', 'Video analysis is temporarily unavailable.'],
    [
      'provider_unavailable',
      'The video service is temporarily unavailable. Try again.',
    ],
    ['session_expired', 'Your session has expired. Sign in and try again.'],
    ['persistence_failure', 'We could not save this analysis. Try again.'],
  ] as const)('maps %s to stable safe copy', async (code, message) => {
    submit.mockRejectedValue(new IntakeServiceError(code));
    await expect(
      submitYouTubeIntake(previousState, form()),
    ).resolves.toMatchObject({
      status: 'error',
      message,
    });
  });

  test('never exposes an unexpected upstream error body', async () => {
    submit.mockRejectedValue(new Error('upstream secret response body'));

    const state = await submitYouTubeIntake(previousState, form());
    expect(state.message).toBe('We could not save this analysis. Try again.');
    expect(state.message).not.toContain('upstream');
  });

  test('re-analysis trusts only authenticated identity and source id from the form', async () => {
    reanalyze.mockResolvedValue({
      kind: 'ready',
      intake: { id: '44444444-4444-4444-8444-444444444444' },
    });
    const data = form({
      sourceId: '11111111-1111-4111-8111-111111111111',
      userId: 'attacker',
      duplicateKey: 'attacker-key',
      title: 'attacker-title',
    });

    await expect(reanalyzeIntake(previousState, data)).resolves.toMatchObject({
      status: 'ready',
      redirectTo: '/app/video/44444444-4444-4444-8444-444444444444',
    });
    expect(reanalyze).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
    );
  });
});

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  createInitialIntakeActionState,
  type IntakeActionState,
} from '@/lib/youtube-intake/action-state';

import { NewAnalysisForm } from './new-analysis-form';

const routerPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));
vi.mock('./inline-analysis-processing', () => ({
  InlineAnalysisProcessing: ({
    analysisId,
    selectedArtifactKinds,
  }: {
    analysisId: string;
    selectedArtifactKinds: readonly string[];
  }) => (
    <div
      data-testid="analyze-processing-visual"
      data-analysis-state="queued"
      data-analysis-id={analysisId}
      data-selected-artifacts={selectedArtifactKinds.join(',')}
    />
  ),
}));

afterEach(() => {
  routerPush.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const defaults = {
  outputLocale: 'en' as const,
  summaryPreset: 'balanced' as const,
  flashcardPreset: 18 as const,
};

function renderForm(
  action: (
    previousState: IntakeActionState,
    formData: FormData,
  ) => Promise<IntakeActionState>,
) {
  render(
    <NewAnalysisForm
      initialState={createInitialIntakeActionState(defaults)}
      action={action}
      reanalyzeAction={action}
    />,
  );
}

describe('NewAnalysisForm', () => {
  test('threads the selected artifact configuration into durable processing', () => {
    const initial = createInitialIntakeActionState(defaults);
    render(
      <NewAnalysisForm
        initialState={{
          ...initial,
          status: 'ready',
          analysisId: 'analysis-1',
          configuration: {
            ...initial.configuration,
            artifacts: ['summary', 'transcript'],
          },
        }}
      />,
    );
    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-selected-artifacts',
      'summary,transcript',
    );
  });
  test('cleans a continuation from the URL before one automatic submit', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?continuation=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ',
    );
    const action = vi.fn(
      async (state: IntakeActionState, formData: FormData) => {
        void formData;
        expect(window.location.pathname).toBe('/app');
        expect(window.location.search).toBe('');
        return state;
      },
    );
    const initialState = {
      ...createInitialIntakeActionState(defaults),
      rawUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };

    const { rerender } = render(
      <NewAnalysisForm
        initialState={initialState}
        action={action}
        reanalyzeAction={action}
        autoSubmit
      />,
    );
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    rerender(
      <NewAnalysisForm
        initialState={initialState}
        action={action}
        reanalyzeAction={action}
        autoSubmit
      />,
    );
    await act(async () => Promise.resolve());
    expect(action).toHaveBeenCalledTimes(1);
    const formData = action.mock.calls[0]?.[1] as FormData;
    expect(formData.get('rawUrl')).toBe(initialState.rawUrl);
    expect(formData.getAll('artifacts')).toEqual([
      'summary',
      'timestamps',
      'transcript',
    ]);
  });

  test('persists output language and summary preset and submits each named value once', async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (state: IntakeActionState, formData: FormData) => {
        void formData;
        return state;
      },
    );
    renderForm(action);

    await user.click(screen.getByRole('button', { name: 'Advanced options' }));
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
    await user.selectOptions(
      screen.getByLabelText('Summary preset'),
      'detailed',
    );
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('button', { name: 'Advanced options' }));
    expect(screen.getByRole('radio', { name: 'Deutsch' })).toBeChecked();
    expect(screen.getByLabelText('Summary preset')).toHaveValue('detailed');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://youtu.be/abcdefghijk',
    );
    await act(async () => {
      fireEvent.submit(document.querySelector('#new-analysis-form')!);
      await Promise.resolve();
    });

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0]?.[1] as FormData;
    expect(formData.getAll('outputLocale')).toEqual(['de']);
    expect(formData.getAll('summaryPreset')).toEqual(['detailed']);
  });

  test('enables the approved intake and starts with domain artifact defaults', async () => {
    const user = userEvent.setup();
    renderForm(async (state) => state);

    expect(screen.getByLabelText('YouTube URL')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Analyze video' })).toBeEnabled();
    const beam = document.querySelector('.beam-form.app-beam-form');
    expect(beam).not.toBeNull();
    expect(beam?.querySelector('.analysis-options')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Advanced options' }));
    expect(
      screen.getByRole('dialog', { name: 'Advanced options' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Summary' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Timestamps' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Transcript' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Flashcards' }),
    ).not.toBeChecked();
  });

  test('closes advanced options on Escape and returns focus to its trigger', async () => {
    const user = userEvent.setup();
    renderForm(async (state) => state);
    const trigger = screen.getByRole('button', { name: 'Advanced options' });

    await user.click(trigger);
    expect(
      await screen.findByRole('dialog', { name: 'Advanced options' }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Advanced options' }),
      ).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  test('requires an artifact and reveals flashcard options only when selected', async () => {
    const user = userEvent.setup();
    renderForm(async (state) => state);
    await user.click(screen.getByRole('button', { name: 'Advanced options' }));

    expect(screen.queryByLabelText('Flashcard count')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Summary preset')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Summary' }));
    expect(screen.queryByLabelText('Summary preset')).not.toBeInTheDocument();
    for (const name of ['Timestamps', 'Transcript']) {
      await user.click(screen.getByRole('checkbox', { name }));
    }
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://youtu.be/abcdefghijk',
    );
    await act(async () => {
      fireEvent.submit(document.querySelector('#new-analysis-form')!);
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose at least one artifact.',
    );

    await user.click(screen.getByRole('button', { name: 'Advanced options' }));
    await user.click(screen.getByRole('checkbox', { name: 'Flashcards' }));
    expect(screen.getByLabelText('Flashcard count')).toBeInTheDocument();
  });

  test('persists a changed flashcard preset after the dialog unmounts and submits it once', async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (state: IntakeActionState, formData: FormData) => {
        void formData;
        return state;
      },
    );
    renderForm(action);

    await user.click(screen.getByRole('button', { name: 'Advanced options' }));
    await user.click(screen.getByRole('checkbox', { name: 'Flashcards' }));
    await user.selectOptions(screen.getByLabelText('Flashcard count'), '30');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('button', { name: 'Advanced options' }));
    expect(screen.getByLabelText('Flashcard count')).toHaveValue('30');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://youtu.be/abcdefghijk',
    );
    fireEvent.submit(document.querySelector('#new-analysis-form')!);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0]?.[1] as FormData;
    expect(formData.getAll('flashcardPreset')).toEqual(['30']);
  });

  test('keeps production pending honest without fabricating granular stages', async () => {
    vi.useFakeTimers();
    let resolveAction!: (state: IntakeActionState) => void;
    const action = vi.fn(
      () =>
        new Promise<IntakeActionState>((resolve) => {
          resolveAction = resolve;
        }),
    );
    renderForm(action);
    const mountedShell = document.querySelector('.analyze-shell');
    expect(mountedShell).not.toBeNull();
    expect(mountedShell).toContainElement(
      document.querySelector('#new-analysis-form'),
    );
    fireEvent.change(screen.getByLabelText('YouTube URL'), {
      target: { value: 'https://youtu.be/abcdefghijk' },
    });

    await act(async () => {
      fireEvent.submit(document.querySelector('#new-analysis-form')!);
      await Promise.resolve();
    });

    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'submitting',
    );
    expect(document.querySelector('.analyze-shell')).toBe(mountedShell);
    expect(mountedShell).toContainElement(
      document.querySelector('#new-analysis-form'),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking video and transcript…',
    );
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'submitting',
    );
    for (const stage of [
      'Validating video',
      'Finding transcript',
      'Structuring key ideas',
      'Creating knowledge artifacts',
    ]) {
      expect(screen.getByText(stage)).toHaveAttribute(
        'data-stage-state',
        'pending',
      );
    }
    expect(
      document.querySelector<HTMLButtonElement>(
        '#new-analysis-form button[type="submit"]',
      ),
    ).toBeDisabled();
    expect(document.querySelector('#new-analysis-form')).toHaveAttribute(
      'inert',
    );
    expect(document.querySelector('#new-analysis-form')).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    await act(async () =>
      resolveAction(createInitialIntakeActionState(defaults)),
    );
  });

  test('preserves URL and configuration on a safe error and retries the real form', async () => {
    const user = userEvent.setup();
    let resolveAction!: (state: IntakeActionState) => void;
    const action = vi.fn(
      (previousState: IntakeActionState, formData: FormData) =>
        new Promise<IntakeActionState>((resolve) => {
          resolveAction = resolve;
          expect(formData.get('rawUrl')).toBe('https://youtu.be/abcdefghijk');
        }),
    );
    renderForm(action);
    const input = screen.getByLabelText('YouTube URL');
    await user.click(screen.getByRole('button', { name: 'Advanced options' }));
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
    await user.click(screen.getByRole('checkbox', { name: 'Transcript' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.type(input, 'https://youtu.be/abcdefghijk');
    await act(async () => {
      fireEvent.submit(document.querySelector('#new-analysis-form')!);
      await Promise.resolve();
    });

    expect(input).toHaveValue('https://youtu.be/abcdefghijk');
    const hiddenSubmit = document.querySelector<HTMLButtonElement>(
      '#new-analysis-form button[type="submit"]',
    );
    expect(hiddenSubmit).toBeDisabled();
    fireEvent.click(hiddenSubmit!);
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolveAction({
        ...createInitialIntakeActionState(defaults),
        status: 'error',
        rawUrl: 'https://youtu.be/abcdefghijk',
        message: 'The video service is temporarily unavailable. Try again.',
      }),
    );
    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'error',
    );
    expect(document.querySelector('#new-analysis-form')).toHaveAttribute(
      'inert',
    );
    expect(document.querySelector('#new-analysis-form')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'The video service is temporarily unavailable. Try again.',
    );
    expect(input).toHaveValue('https://youtu.be/abcdefghijk');
    expect(document.querySelector('input[name="outputLocale"]')).toHaveValue(
      'de',
    );
    expect(screen.queryByText('TRANSCRIPT')).not.toBeInTheDocument();

    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(
      screen.queryByRole('button', { name: 'Analyze video' }),
    ).not.toBeInTheDocument();

    await user.click(retry);
    expect(action).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'submitting',
    );
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
    const retryFormData = action.mock.calls[1]?.[1] as FormData;
    expect(retryFormData.getAll('rawUrl')).toEqual([
      'https://youtu.be/abcdefghijk',
    ]);
    expect(retryFormData.getAll('outputLocale')).toEqual(['de']);
    expect(retryFormData.getAll('summaryPreset')).toEqual(['balanced']);
    expect(retryFormData.getAll('flashcardPreset')).toEqual(['18']);
    expect(retryFormData.getAll('artifacts')).toEqual([
      'summary',
      'timestamps',
    ]);
    await act(async () =>
      resolveAction(createInitialIntakeActionState(defaults)),
    );
    expect(document.querySelector('#new-analysis-form')).not.toHaveAttribute(
      'inert',
    );
    expect(document.querySelector('#new-analysis-form')).not.toHaveAttribute(
      'aria-hidden',
    );
  });

  test('keeps queued processing inline without router navigation or a second spectrum', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    let resolveAction!: (state: IntakeActionState) => void;
    const action = vi.fn(
      () =>
        new Promise<IntakeActionState>((resolve) => {
          resolveAction = resolve;
        }),
    );
    renderForm(action);
    fireEvent.change(screen.getByLabelText('YouTube URL'), {
      target: { value: 'https://youtu.be/abcdefghijk' },
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('#new-analysis-form')!);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
      resolveAction({
        ...createInitialIntakeActionState(defaults),
        status: 'ready',
        analysisId: '550e8400-e29b-41d4-a716-446655440000',
      });
      await vi.runAllTicks();
    });
    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('analyze-processing-visual')).toHaveLength(1);
  });

  test('does not navigate early when reduced motion is requested', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    let resolveAction!: (state: IntakeActionState) => void;
    const action = vi.fn(
      () =>
        new Promise<IntakeActionState>((resolve) => {
          resolveAction = resolve;
        }),
    );
    renderForm(action);
    fireEvent.change(screen.getByLabelText('YouTube URL'), {
      target: { value: 'https://youtu.be/abcdefghijk' },
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('#new-analysis-form')!);
      await Promise.resolve();
    });
    await act(async () =>
      resolveAction({
        ...createInitialIntakeActionState(defaults),
        status: 'ready',
        analysisId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    );

    expect(routerPush).not.toHaveBeenCalled();
  });

  test('cancels a pending readiness navigation when the form unmounts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    let resolveAction!: (state: IntakeActionState) => void;
    const action = vi.fn(
      () =>
        new Promise<IntakeActionState>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const { unmount } = render(
      <NewAnalysisForm
        initialState={createInitialIntakeActionState(defaults)}
        action={action}
        reanalyzeAction={action}
      />,
    );
    fireEvent.change(screen.getByLabelText('YouTube URL'), {
      target: { value: 'https://youtu.be/abcdefghijk' },
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('#new-analysis-form')!);
      await Promise.resolve();
      resolveAction({
        ...createInitialIntakeActionState(defaults),
        status: 'ready',
        redirectTo: '/app/video/ready-123',
      });
      await vi.runAllTicks();
    });

    unmount();
    await act(async () => vi.advanceTimersByTime(1800));
    expect(routerPush).not.toHaveBeenCalled();
  });

  test('renders approved duplicate copy and confirms reanalysis with sourceId only', async () => {
    const user = userEvent.setup();
    const duplicate: IntakeActionState = {
      ...createInitialIntakeActionState(defaults),
      status: 'duplicate',
      rawUrl: 'https://youtu.be/abcdefghijk',
      existingId: 'saved-123',
      duplicateConfiguration: {
        outputLocale: 'de',
        summaryPreset: 'detailed',
        flashcardPreset: null,
        artifacts: ['summary', 'transcript'],
        analysisContractVersion: 1,
      },
    };
    const submit = vi.fn(async () => duplicate);
    const reanalyze = vi.fn(
      async (state: IntakeActionState, formData: FormData) => {
        void formData;
        return state;
      },
    );
    render(
      <NewAnalysisForm
        initialState={duplicate}
        action={submit}
        reanalyzeAction={reanalyze}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'You already analyzed this video.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No credits will be used.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open saved result' }),
    ).toHaveAttribute('href', '/app/video/saved-123');
    await user.click(screen.getByRole('button', { name: 'Analyze again' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'A new processing attempt will be created.',
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('de');
    expect(screen.getByRole('dialog')).toHaveTextContent('Detailed');
    expect(screen.getByRole('dialog')).not.toHaveTextContent('30');
    await user.click(screen.getByRole('button', { name: 'Confirm analysis' }));
    await waitFor(() => expect(reanalyze).toHaveBeenCalledTimes(1));
    const formData = reanalyze.mock.calls[0]?.[1] as FormData;
    expect([...formData.entries()]).toEqual([['sourceId', 'saved-123']]);
  });

  test('does not apply the decorative intake delay to duplicate reanalysis navigation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const duplicate: IntakeActionState = {
      ...createInitialIntakeActionState(defaults),
      status: 'duplicate',
      rawUrl: 'https://youtu.be/abcdefghijk',
      existingId: 'saved-123',
    };
    const submit = vi.fn(async () => duplicate);
    const reanalyze = vi.fn(async () => ({
      ...duplicate,
      status: 'ready' as const,
      redirectTo: '/app/video/reanalysis-123',
    }));
    render(
      <NewAnalysisForm
        initialState={createInitialIntakeActionState(defaults)}
        action={submit}
        reanalyzeAction={reanalyze}
      />,
    );
    fireEvent.change(screen.getByLabelText('YouTube URL'), {
      target: { value: 'https://youtu.be/abcdefghijk' },
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('#new-analysis-form')!);
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm analysis' }));
    await act(async () => vi.advanceTimersByTimeAsync(0));

    expect(routerPush).toHaveBeenCalledWith('/app/video/reanalysis-123');
  });

  test('announces reanalysis failures inside confirmation and only disables its submit', async () => {
    const user = userEvent.setup();
    const duplicate: IntakeActionState = {
      ...createInitialIntakeActionState(defaults),
      status: 'duplicate',
      existingId: 'saved-123',
    };
    let resolveReanalysis!: (state: IntakeActionState) => void;
    const reanalyze = vi.fn(
      () =>
        new Promise<IntakeActionState>((resolve) => {
          resolveReanalysis = resolve;
        }),
    );
    render(
      <NewAnalysisForm
        initialState={duplicate}
        action={async (state) => state}
        reanalyzeAction={reanalyze}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Analyze again' }));
    await user.click(screen.getByRole('button', { name: 'Confirm analysis' }));

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
    expect(
      document.querySelector<HTMLButtonElement>(
        '.app-beam-form button[type="submit"]',
      ),
    ).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Creating…' }));
    expect(reanalyze).toHaveBeenCalledTimes(1);

    resolveReanalysis({
      ...duplicate,
      status: 'error',
      message: 'The video service is temporarily unavailable. Try again.',
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Analyze this video again?',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'The video service is temporarily unavailable. Try again.',
    );
    expect(dialog).toContainElement(screen.getByRole('status'));
    expect(
      screen.getByRole('button', { name: 'Confirm analysis' }),
    ).toBeEnabled();
  });
});

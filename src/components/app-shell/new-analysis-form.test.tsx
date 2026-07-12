import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import {
  createInitialIntakeActionState,
  type IntakeActionState,
} from '@/lib/youtube-intake/action-state';

import { NewAnalysisForm } from './new-analysis-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
    for (const name of ['Summary', 'Timestamps', 'Transcript']) {
      await user.click(screen.getByRole('checkbox', { name }));
    }
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.type(
      screen.getByLabelText('YouTube URL'),
      'https://youtu.be/abcdefghijk',
    );
    await user.click(screen.getByRole('button', { name: 'Analyze video' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose at least one artifact.',
    );

    await user.click(screen.getByRole('button', { name: 'Advanced options' }));
    await user.click(screen.getByRole('checkbox', { name: 'Flashcards' }));
    expect(screen.getByLabelText('Flashcard count')).toBeInTheDocument();
  });

  test('preserves the typed URL, prevents double submit, and announces recoverable errors', async () => {
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
    await user.type(input, 'https://youtu.be/abcdefghijk');
    await user.click(screen.getByRole('button', { name: 'Analyze video' }));

    expect(input).toHaveValue('https://youtu.be/abcdefghijk');
    expect(screen.getByRole('button', { name: 'Analyzing…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Analyzing…' }));
    expect(action).toHaveBeenCalledTimes(1);
    resolveAction({
      ...createInitialIntakeActionState(defaults),
      status: 'error',
      rawUrl: 'https://youtu.be/abcdefghijk',
      message: 'The video service is temporarily unavailable. Try again.',
    });
    expect(
      await screen.findByText(
        'The video service is temporarily unavailable. Try again.',
      ),
    ).toHaveAttribute('role', 'status');
    expect(input).toHaveValue('https://youtu.be/abcdefghijk');
  });

  test('renders approved duplicate copy and confirms reanalysis with sourceId only', async () => {
    const user = userEvent.setup();
    const duplicate: IntakeActionState = {
      ...createInitialIntakeActionState(defaults),
      status: 'duplicate',
      rawUrl: 'https://youtu.be/abcdefghijk',
      existingId: 'saved-123',
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
    await user.click(screen.getByRole('button', { name: 'Confirm analysis' }));
    await waitFor(() => expect(reanalyze).toHaveBeenCalledTimes(1));
    const formData = reanalyze.mock.calls[0]?.[1] as FormData;
    expect([...formData.entries()]).toEqual([['sourceId', 'saved-123']]);
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

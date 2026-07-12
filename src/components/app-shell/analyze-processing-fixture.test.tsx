import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyzeProcessingFixture } from './analyze-processing-fixture';

const visual = () => screen.getByTestId('analyze-processing-visual');
const expectState = (state: string) =>
  expect(visual()).toHaveAttribute('data-analysis-state', state);
const completionOverlay = () =>
  screen
    .getByRole('heading', {
      name: 'Your knowledge artifacts are ready.',
      hidden: true,
    })
    .closest('.analyze-complete-banner');

describe('AnalyzeProcessingFixture', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const advance = async (milliseconds: number) => {
    await act(async () => vi.advanceTimersByTimeAsync(milliseconds));
  };

  it('runs the exact prototype state schedule', async () => {
    render(<AnalyzeProcessingFixture />);
    expectState('idle');

    fireEvent.click(screen.getByRole('button', { name: 'Analyze video' }));
    expectState('submitting');

    await advance(850);
    expectState('validating');
    expect(
      screen.getByRole('button', { name: 'Analyze video' }),
    ).toBeDisabled();
    await advance(1_250);
    expectState('transcript');
    await advance(1_400);
    expectState('structuring');
    await advance(1_500);
    expectState('artifacts');
    await advance(1_500);
    expectState('complete');
    expect(screen.getByText('Analysis complete')).toBeInTheDocument();
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'true');
    await advance(600);
    expectState('complete');
    expect(
      screen.getByRole('heading', {
        name: 'Your knowledge artifacts are ready.',
      }),
    ).toBeVisible();
  });

  it('clears the current run and restarts replay after the prototype delay', async () => {
    render(<AnalyzeProcessingFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze video' }));
    await advance(2_100);
    expectState('transcript');

    fireEvent.click(screen.getByRole('button', { name: 'Replay sequence' }));
    expectState('idle');
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'true');
    await advance(79);
    expectState('idle');
    await advance(1);
    expectState('submitting');
    await advance(850);
    expectState('validating');
  });

  it('interrupts pending timers for the error preview and retries cleanly', async () => {
    render(<AnalyzeProcessingFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze video' }));
    await advance(850);

    fireEvent.click(screen.getByRole('button', { name: 'Preview error' }));
    expectState('error');
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'true');
    await advance(10_000);
    expectState('error');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expectState('submitting');
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'true');
    await advance(850);
    expectState('validating');
  });

  it('resets a visible completion overlay for replay, error, and retry', async () => {
    render(<AnalyzeProcessingFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze video' }));
    await advance(7_100);
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Replay sequence' }));
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'true');
    await advance(7_180);
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Preview error' }));
    expectState('error');
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expectState('submitting');
    expect(completionOverlay()).toHaveAttribute('aria-hidden', 'true');
  });

  it('clears every scheduled timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(<AnalyzeProcessingFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze video' }));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(6);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('lets the fixture vary selected artifact rays without adding Export', () => {
    render(<AnalyzeProcessingFixture />);
    expect(screen.getByText('FLASHCARDS')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Flashcards' }));

    expect(screen.queryByText('FLASHCARDS')).not.toBeInTheDocument();
    expect(screen.queryByText('EXPORT')).not.toBeInTheDocument();
    expect(visual()).toHaveAttribute(
      'data-submitted-url',
      'https://www.youtube.com/watch?v=gleen-fixture',
    );
  });
});

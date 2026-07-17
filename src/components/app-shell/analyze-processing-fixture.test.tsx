import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyzeProcessingFixture } from './analyze-processing-fixture';

const visual = () => screen.getByTestId('analyze-processing-visual');
const expectState = (state: string) =>
  expect(visual()).toHaveAttribute('data-analysis-state', state);
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
    expect(
      screen.getByRole('heading', {
        name: 'Your artifacts are ready',
      }),
    ).toBeVisible();
    expect(screen.getByText('Opening the result workspace')).toBeVisible();
  });

  it('clears the current run and restarts replay after the prototype delay', async () => {
    render(<AnalyzeProcessingFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze video' }));
    await advance(2_100);
    expectState('transcript');

    fireEvent.click(screen.getByRole('button', { name: 'Replay sequence' }));
    expectState('idle');
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
    await advance(10_000);
    expectState('error');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expectState('submitting');
    await advance(850);
    expectState('validating');
  });

  it('clears every scheduled timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(<AnalyzeProcessingFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze video' }));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(5);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('always exposes the four approved artifact rails', () => {
    render(<AnalyzeProcessingFixture />);
    expect(screen.getByText('SUMMARY')).toBeInTheDocument();
    expect(screen.getByText('FLASHCARDS')).toBeInTheDocument();
    expect(screen.getByText('TIMESTAMPS')).toBeInTheDocument();
    expect(screen.getByText('EXPORT')).toBeInTheDocument();
    expect(screen.queryByText('TRANSCRIPT')).not.toBeInTheDocument();
    expect(visual()).toHaveAttribute(
      'data-submitted-url',
      'https://www.youtube.com/watch?v=gleen-fixture',
    );
  });
});

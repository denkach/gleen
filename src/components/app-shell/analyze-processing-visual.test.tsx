import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AnalyzeProcessingVisual } from './analyze-processing-visual';

describe('AnalyzeProcessingVisual', () => {
  it('renders the controlled stage and all four approved spectral rails', () => {
    const { container } = render(
      <AnalyzeProcessingVisual
        state="transcript"
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
      />,
    );

    expect(screen.getByText('Finding transcript')).toHaveAttribute(
      'data-stage-state',
      'active',
    );
    expect(screen.getByText('Validating video')).toHaveAttribute(
      'data-stage-state',
      'done',
    );
    expect(screen.getByText('SUMMARY')).toBeInTheDocument();
    expect(screen.getByText('TIMESTAMPS')).toBeInTheDocument();
    expect(screen.getByText('FLASHCARDS')).toBeInTheDocument();
    expect(screen.getByText('EXPORT')).toBeInTheDocument();
    expect(screen.queryByText('TRANSCRIPT')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.analyze-rail')).toHaveLength(4);
    expect(container.querySelector('.analyze-prism')).not.toBeInTheDocument();
    expect(container.querySelector('.analyze-rays')).not.toBeInTheDocument();
  });

  it('keeps every optical element out of the accessibility tree', () => {
    const { container } = render(
      <AnalyzeProcessingVisual
        state="artifacts"
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
      />,
    );

    for (const selector of [
      '.analyze-photon',
      '.analyze-shell-flash',
      '.analyze-rail-visual',
      '.analyze-master-rail',
      '.analyze-rails',
    ]) {
      expect(container.querySelector(selector)).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    }
  });

  it('announces a safe error and exposes retry as a keyboard-operable button', async () => {
    const onRetry = vi.fn();
    render(
      <AnalyzeProcessingVisual
        state="error"
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
        errorMessage="This video is private."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'This video is private.',
    );
    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('disables retry while a new attempt is pending', () => {
    render(
      <AnalyzeProcessingVisual
        state="error"
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
        onRetry={vi.fn()}
        retryDisabled
      />,
    );
    expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled();
  });

  it('renders explicit partial controls and truthful artifact states', () => {
    render(
      <AnalyzeProcessingVisual
        state="error"
        submittedUrl=""
        selectedArtifactKinds={['summary', 'timestamps', 'transcript']}
        artifactStates={{ summary: 'ready', timestamps: 'failed' }}
        controls={
          <>
            <button type="button">View available results</button>
            <button type="button">Retry failed artifact</button>
          </>
        }
      />,
    );
    expect(
      screen.getByRole('button', { name: 'View available results' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Retry failed artifact' }),
    ).toBeVisible();
    expect(screen.getByText('SUMMARY').parentElement).toHaveTextContent(
      'ready',
    );
    expect(screen.getByText('TIMESTAMPS').parentElement).toHaveTextContent(
      'failed',
    );
    expect(
      screen.getByRole('list', { name: 'Artifact status' }),
    ).toHaveTextContent('Summary ready');
    expect(screen.getByText('FLASHCARDS').parentElement).toHaveTextContent(
      'not selected',
    );
  });

  it('truthfully represents a custom artifact selection in visual and semantic status', () => {
    render(
      <AnalyzeProcessingVisual
        state="artifacts"
        submittedUrl=""
        selectedArtifactKinds={['flashcards']}
      />,
    );
    expect(screen.getByText('FLASHCARDS').parentElement).toHaveTextContent(
      'queued',
    );
    expect(screen.getByText('SUMMARY').parentElement).toHaveTextContent(
      'not selected',
    );
    const statuses = screen.getByRole('list', { name: 'Artifact status' });
    expect(statuses).toHaveTextContent('Flashcards queued');
    expect(statuses).toHaveTextContent('Summary not selected');
  });

  it.each(['ready', 'failed'] as const)(
    'maps a %s Transcript artifact to the visible and semantic Export rail',
    (status) => {
      render(
        <AnalyzeProcessingVisual
          state="error"
          submittedUrl=""
          selectedArtifactKinds={['transcript']}
          artifactStates={{ transcript: status }}
        />,
      );
      expect(screen.getByText('EXPORT').parentElement).toHaveTextContent(
        status,
      );
      expect(
        screen.getByRole('list', { name: 'Artifact status' }),
      ).toHaveTextContent(`Export ${status}`);
    },
  );

  it('moves focus to processing and then terminal context only on transitions', () => {
    const { rerender } = render(
      <AnalyzeProcessingVisual
        state="idle"
        submittedUrl=""
        idleContent={<input aria-label="URL" />}
      />,
    );
    screen.getByLabelText('URL').focus();
    rerender(<AnalyzeProcessingVisual state="submitting" submittedUrl="" />);
    expect(
      screen.getByRole('heading', { name: 'Analyzing your video' }),
    ).toHaveFocus();
    rerender(
      <AnalyzeProcessingVisual
        state="error"
        submittedUrl=""
        errorMessage="Stopped safely."
      />,
    );
    expect(screen.getByText('Stopped safely.')).toHaveFocus();
  });

  it('updates immediately when its controlled state changes', () => {
    const { container, rerender } = render(
      <AnalyzeProcessingVisual
        state="validating"
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
      />,
    );

    rerender(
      <AnalyzeProcessingVisual
        state="complete"
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
      />,
    );

    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'complete',
    );
    expect(screen.getByText('Your artifacts are ready')).toBeInTheDocument();
    expect(
      screen.getByText('Opening the result workspace'),
    ).toBeInTheDocument();
    expect(screen.getByText('Creating knowledge artifacts')).toHaveAttribute(
      'data-stage-state',
      'done',
    );
    expect(
      container.querySelector('.analyze-completion-wipe'),
    ).toBeInTheDocument();
  });

  it('exposes the restrained result exit state', () => {
    render(
      <AnalyzeProcessingVisual
        state="complete"
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
        isExiting
      />,
    );

    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-exiting',
      'true',
    );
    expect(
      screen
        .getByTestId('analyze-processing-visual')
        .querySelector('.analyze-shell'),
    ).toHaveClass('exiting');
  });

  it('retains the exact scoped processing, responsive, and motion contracts', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/styles/app-shell-reference.css'),
      'utf8',
    );
    const tokens = readFileSync(
      path.join(process.cwd(), 'src/app/globals.css'),
      'utf8',
    );

    expect(css).toMatch(
      /\.analysis-visual \.analyze-shell\.processing\s*{[^}]*height:\s*300px/,
    );
    expect(css).toMatch(
      /\.analysis-visual \.analyze-shell\.idle\.production-intake\s*{[\s\S]*?max-width:\s*760px;[\s\S]*?height:\s*66px;[\s\S]*?padding:\s*7px;[\s\S]*?border-radius:\s*17px;[\s\S]*?background:\s*rgba\(17, 16, 24, 0\.76\)/,
    );
    expect(css).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.analysis-visual \.analyze-shell\.idle\.production-intake\s*{[^}]*height:\s*112px/,
    );
    expect(css).toMatch(
      /\.analysis-visual \.analyze-shell\.idle\.production-intake \.analyze-input-row\s*{[\s\S]*?position:\s*relative;[\s\S]*?inset:\s*auto;[\s\S]*?padding:\s*0/,
    );
    expect(css).toMatch(
      /\.analysis-visual \.analyze-shell\.idle\.production-intake \.app-beam-form\s*{[\s\S]*?padding:\s*0;[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none/,
    );
    expect(css).not.toMatch(
      /\.analysis-visual [^{]*\.app-beam-form\s*{[^}]*max-width:\s*none/,
    );
    expect(css).toMatch(
      /\.analysis-visual \.analyze-processing-panel\s*{[^}]*grid-template-columns:\s*1\.15fr 0\.85fr/,
    );
    expect(css).toContain('.analyze-rail.summary');
    expect(css).toContain('.analyze-rail.flashcards');
    expect(css).toContain('.analyze-rail.timestamps');
    expect(css).toContain('.analyze-rail.export');
    expect(css).toMatch(
      /\.analysis-visual \.analyze-shell\.exiting \.analyze-processing-panel\s*{[^}]*opacity:\s*0;[^}]*transform:\s*scale\(0\.985\)/,
    );
    expect(css).not.toContain('.analyze-prism');
    expect(css).not.toContain('.analyze-rays');
    expect(css).toMatch(/@media \(max-width: 900px\)/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.analyze-photon[\s\S]*\.analyze-shell-flash[\s\S]*\.analyze-completion-wipe[\s\S]*\.analyze-trace/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.analysis-visual \.analyze-shell,\s*\.analysis-visual \.analyze-processing-panel\s*{[^}]*transition:\s*none\s*!important/,
    );
    expect(tokens).toMatch(
      /--analysis-shell-idle-glow:\s*rgba\(199, 125, 255, 0\.035\)/,
    );
    expect(tokens).toMatch(
      /--analysis-shell-idle-inset:\s*rgba\(255, 255, 255, 0\.04\)/,
    );
    expect(tokens).toMatch(
      /--analysis-shell-processing-border:\s*rgba\(255, 255, 255, 0\.16\)/,
    );
    expect(tokens).toMatch(
      /--analysis-photon-tail-glow:\s*rgba\(255, 255, 255, 0\.65\)/,
    );
    expect(tokens).toMatch(
      /--analysis-done-dot-border:\s*rgba\(168, 224, 99, 0\.75\)/,
    );
    expect(tokens).toMatch(
      /--analysis-done-dot-glow:\s*rgba\(168, 224, 99, 0\.35\)/,
    );
    expect(css).toMatch(
      /\.analysis-visual \.analyze-shell\s*{[\s\S]*?0 0 40px var\(--analysis-shell-idle-glow\)/,
    );
    expect(css).toMatch(/\.analysis-visual \.analyze-track::before/);
    const baseStepRule = css.match(
      /\.analysis-visual \.analyze-step\s*{([^}]*)}/,
    );
    expect(baseStepRule?.[1]).not.toMatch(/\bopacity\s*:/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.analysis-visual \.analyze-track::before[\s\S]*transform:\s*scaleX\(1\)/,
    );
  });
});

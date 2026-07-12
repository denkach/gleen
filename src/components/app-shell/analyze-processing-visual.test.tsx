import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AnalyzeProcessingVisual } from './analyze-processing-visual';

describe('AnalyzeProcessingVisual', () => {
  it('renders the controlled stage and only the selected intake artifacts', () => {
    const { container } = render(
      <AnalyzeProcessingVisual
        state="transcript"
        selectedArtifacts={['summary', 'timestamps', 'transcript']}
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
    expect(screen.getByText('TRANSCRIPT')).toBeInTheDocument();
    expect(screen.queryByText('FLASHCARDS')).not.toBeInTheDocument();
    expect(screen.queryByText('EXPORT')).not.toBeInTheDocument();

    const rays = [...container.querySelectorAll<HTMLElement>('.analyze-ray')];
    expect(
      rays.map((ray) => ray.style.getPropertyValue('--ray-angle')),
    ).toEqual(['-15deg', '7deg', '18deg']);
    const labels = [
      ...container.querySelectorAll<HTMLElement>(
        '.analyze-artifact-labels span',
      ),
    ];
    expect(
      labels.map((label) => label.style.getPropertyValue('--label-top')),
    ).toEqual(['13px', '88px', '126px']);
  });

  it('keeps every optical element out of the accessibility tree', () => {
    const { container } = render(
      <AnalyzeProcessingVisual
        state="artifacts"
        selectedArtifacts={['summary', 'flashcards']}
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
      />,
    );

    for (const selector of [
      '.analyze-photon',
      '.analyze-shell-flash',
      '.analyze-optic',
      '.analyze-beam-in',
      '.analyze-prism',
      '.analyze-rays',
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
        selectedArtifacts={['summary']}
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

  it('updates immediately when its controlled state changes', () => {
    const { rerender } = render(
      <AnalyzeProcessingVisual
        state="validating"
        selectedArtifacts={['timestamps']}
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
      />,
    );

    rerender(
      <AnalyzeProcessingVisual
        state="complete"
        selectedArtifacts={['timestamps']}
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
      />,
    );

    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'complete',
    );
    expect(screen.getByText('Analysis complete')).toBeInTheDocument();
    expect(screen.getByText('Creating knowledge artifacts')).toHaveAttribute(
      'data-stage-state',
      'done',
    );
    expect(
      screen
        .getByRole('heading', {
          name: 'Your knowledge artifacts are ready.',
        })
        .closest('.analyze-complete-banner'),
    ).toHaveAttribute('aria-hidden', 'false');
  });

  it('lets completion copy render before a controlled overlay reveal', () => {
    const { rerender } = render(
      <AnalyzeProcessingVisual
        state="complete"
        selectedArtifacts={['summary']}
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
        showCompletionOverlay={false}
      />,
    );

    expect(screen.getByText('Analysis complete')).toBeInTheDocument();
    const overlay = screen
      .getByRole('heading', {
        name: 'Your knowledge artifacts are ready.',
        hidden: true,
      })
      .closest('.analyze-complete-banner');
    expect(overlay).not.toHaveClass('show');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <AnalyzeProcessingVisual
        state="complete"
        selectedArtifacts={['summary']}
        submittedUrl="https://youtu.be/dQw4w9WgXcQ"
        showCompletionOverlay
      />,
    );

    expect(overlay).toHaveClass('show');
    expect(overlay).toHaveAttribute('aria-hidden', 'false');
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
      /\.analysis-visual \.analyze-processing-panel\s*{[^}]*grid-template-columns:\s*1\.15fr 0\.85fr/,
    );
    expect(css).toContain('.analyze-ray.summary');
    expect(css).toContain('.analyze-ray.flashcards');
    expect(css).toContain('.analyze-ray.timestamps');
    expect(css).toContain('.analyze-ray.neutral');
    expect(css).toMatch(/@media \(max-width: 900px\)/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.analyze-photon[\s\S]*\.analyze-shell-flash[\s\S]*\.analyze-prism[\s\S]*\.analyze-trace/,
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
      /--analysis-prism-resting-shadow:\s*rgba\(255, 255, 255, 0\.16\)/,
    );
    expect(tokens).toMatch(
      /--analysis-prism-inner-face:\s*rgba\(255, 255, 255, 0\.28\)/,
    );
    expect(tokens).toMatch(
      /--analysis-prism-breathing-shadow:\s*rgba\(255, 255, 255, 0\.24\)/,
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
    expect(css).toMatch(
      /\.analysis-visual \.analyze-ray\s*{[\s\S]*?transform:\s*rotate\(var\(--ray-angle\)\)/,
    );
    expect(css).toMatch(
      /\.analysis-visual \.analyze-artifact-labels span\s*{[\s\S]*?top:\s*var\(--label-top\)/,
    );
    const baseStepRule = css.match(
      /\.analysis-visual \.analyze-step\s*{([^}]*)}/,
    );
    expect(baseStepRule?.[1]).not.toMatch(/\bopacity\s*:/);
    expect(css).toMatch(
      /@media \(max-width: 900px\)[\s\S]*@media \(prefers-reduced-motion: reduce\)[\s\S]*\.analysis-visual \.analyze-ray\s*{\s*width:\s*120px/,
    );
  });
});

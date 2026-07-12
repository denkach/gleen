import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AnalyzeProcessingVisual } from './analyze-processing-visual';

describe('AnalyzeProcessingVisual', () => {
  it('renders the controlled stage and only the selected intake artifacts', () => {
    render(
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
  });

  it('retains the exact scoped processing, responsive, and motion contracts', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/styles/app-shell-reference.css'),
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
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const worktreePrototype = join(
  process.cwd(),
  'design/prototypes/spectral/index.html',
);
const prototypePath = existsSync(worktreePrototype)
  ? worktreePrototype
  : join(process.cwd(), '../../design/prototypes/spectral/index.html');
const prototype = readFileSync(prototypePath, 'utf8');

describe('DEN-24 Spectral Rail prototype', () => {
  it('models every approved analysis state', () => {
    for (const state of [
      'idle',
      'submitting',
      'validating',
      'transcript',
      'structuring',
      'artifacts',
      'complete',
      'error',
    ]) {
      expect(prototype).toContain(`'${state}'`);
    }
    expect(prototype).toContain('function setAnalysisState(nextState)');
  });

  it('contains the real stages and semantic artifact rails', () => {
    for (const stage of [
      'Validating video',
      'Finding transcript',
      'Structuring key ideas',
      'Creating artifacts',
    ]) {
      expect(prototype).toContain(stage);
    }

    for (const artifact of ['Summary', 'Flashcards', 'Timestamps', 'Export']) {
      expect(prototype).toContain(artifact);
    }

    const normalizedPrototype = prototype.toLowerCase();
    for (const color of ['#FFB454', '#C77DFF', '#5BE9E9', '#A8E063']) {
      expect(normalizedPrototype).toContain(color.toLowerCase());
    }
  });

  it('provides accessible idle, completion, and recoverable error controls', () => {
    expect(prototype).toContain('aria-live="polite"');
    expect(prototype).toContain('id="url-input"');
    expect(prototype).toContain('id="analyze-button"');
    expect(prototype).toContain('id="try-again"');
    expect(prototype).toContain('id="preview-error"');
    expect(prototype).toContain('Your artifacts are ready');
    expect(prototype).toContain('Opening the result workspace');
    expect(prototype).toContain('Try again');
    expect(prototype).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('contains only the approved concept and no fabricated progress', () => {
    expect(prototype).not.toContain('Optical Scan');
    expect(prototype).not.toContain('Knowledge Pulse');
    expect(prototype).not.toContain('<nav class="tabs">');
    expect(prototype.toLowerCase()).not.toContain('percentage');
    expect(prototype.toLowerCase()).not.toContain('prism');
  });
});

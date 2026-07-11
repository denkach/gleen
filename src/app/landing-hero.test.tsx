import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('approved landing hero', () => {
  it('preserves the reference hierarchy and prism geometry', () => {
    render(<HomePage />);
    expect(screen.getByRole('banner')).toBeVisible();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Watch less.Understand more.',
      }),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'YouTube URL' })).toHaveValue(
      'https://youtube.com/watch?v=knowledge',
    );
    expect(
      document.querySelector('.hero > .hero-grid > .prism-stage .prism-wrap'),
    ).not.toBeNull();
    expect(
      document.querySelector('.prism-svg path[d="M160 20 294 266 27 266Z"]'),
    ).not.toBeNull();
    expect(document.querySelectorAll('.spectrum > .ray')).toHaveLength(4);
    expect(document.querySelectorAll('.artifact-float')).toHaveLength(4);
  });

  it('preserves the approved Prism Workflow structure', () => {
    render(<HomePage />);
    const section = document.querySelector('#how');
    expect(section).not.toBeNull();
    expect(
      section?.querySelector('.process-scene > .process-track'),
    ).not.toBeNull();
    expect(
      section?.querySelector('.process-scene > .process-prism'),
    ).not.toBeNull();
    expect(section?.querySelectorAll('.process-step')).toHaveLength(4);
    expect(
      [...section!.querySelectorAll('.process-step h3')].map(
        (node) => node.textContent,
      ),
    ).toEqual([
      'Paste a link',
      'Read the video',
      'Separate ideas',
      'Use the result',
    ]);
  });

  it('preserves four distinct approved facet demos', () => {
    render(<HomePage />);
    const facets = document.querySelectorAll('#facets .facet-panel');
    expect(facets).toHaveLength(4);
    expect(facets[0]?.querySelector('.summary-demo')).not.toBeNull();
    expect(facets[1]?.querySelector('.flashcard-stack')).not.toBeNull();
    expect(facets[2]?.querySelector('.timeline-demo')).not.toBeNull();
    expect(facets[3]?.querySelector('.export-demo')).not.toBeNull();
    expect([...facets].map((node) => node.className)).toEqual([
      'facet-panel amber',
      'facet-panel purple',
      'facet-panel cyan',
      'facet-panel lime',
    ]);
  });
});

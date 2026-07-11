import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '@/app/page';

describe('landing sections', () => {
  it('preserves the approved section and facet order', () => {
    render(<HomePage />);

    expect(
      [...document.querySelectorAll('main > section')].map(({ id }) => id),
    ).toEqual(['product', 'how', 'facets', 'pricing']);
    expect(
      [...document.querySelectorAll('[data-facet]')].map((node) =>
        node.getAttribute('data-facet'),
      ),
    ).toEqual(['summary', 'flashcards', 'timestamps', 'export']);
  });

  it('renders three visual-only pricing plans and the approved footer', () => {
    render(<HomePage />);

    expect(screen.getAllByRole('article', { name: /plan$/i })).toHaveLength(3);
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'AI-generated content should be checked against the original source.',
    );
    expect(document.querySelector('audio,[autoplay]')).toBeNull();
  });
});

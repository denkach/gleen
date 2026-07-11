import { describe, expect, it } from 'vitest';

import { marketingContent } from './marketing';

describe('marketingContent', () => {
  it('preserves the approved navigation order', () => {
    expect(marketingContent.navigation.map(({ href }) => href)).toEqual([
      '#product',
      '#how',
      '#facets',
      '#pricing',
    ]);
  });

  it('preserves the approved artifact order and identity', () => {
    expect(marketingContent.facets.map(({ id }) => id)).toEqual([
      'summary',
      'flashcards',
      'timestamps',
      'export',
    ]);
  });

  it('preserves the four workflow phases', () => {
    expect(marketingContent.workflow.map(({ phase }) => phase)).toEqual([
      'INPUT',
      'SIGNAL',
      'REFRACTION',
      'OUTPUT',
    ]);
  });
});

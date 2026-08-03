import { describe, expect, it } from 'vitest';

import { marketingMessages } from '@/lib/i18n/messages/marketing';

import { getMarketingContent } from './marketing';

describe('marketingContent', () => {
  it('preserves the approved navigation order', () => {
    const marketingContent = getMarketingContent(marketingMessages.de);

    expect(marketingContent.navigation.map(({ href }) => href)).toEqual([
      '#product',
      '#how',
      '#facets',
      '#pricing',
    ]);
  });

  it('preserves the approved artifact order and identity', () => {
    const marketingContent = getMarketingContent(marketingMessages.de);

    expect(marketingContent.facets.map(({ id }) => id)).toEqual([
      'summary',
      'flashcards',
      'timestamps',
      'export',
    ]);
  });

  it('preserves the four workflow phases', () => {
    const marketingContent = getMarketingContent(marketingMessages.de);

    expect(marketingContent.workflow.map(({ phase }) => phase)).toEqual([
      'EINGABE',
      'SIGNAL',
      'BRECHUNG',
      'ERGEBNIS',
    ]);
  });
});

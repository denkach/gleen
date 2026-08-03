import { describe, expect, it } from 'vitest';

import { marketingMessages } from '@/lib/i18n/messages/marketing';

import { getMarketingContent } from './marketing';

describe('marketingContent', () => {
  it('preserves the approved navigation order', () => {
    const marketingContent = getMarketingContent(marketingMessages.de, 'de');

    expect(marketingContent.navigation.map(({ href }) => href)).toEqual([
      '#product',
      '#how',
      '#facets',
      '#pricing',
    ]);
  });

  it('preserves the approved artifact order and identity', () => {
    const marketingContent = getMarketingContent(marketingMessages.de, 'de');

    expect(marketingContent.facets.map(({ id }) => id)).toEqual([
      'summary',
      'flashcards',
      'timestamps',
      'export',
    ]);
  });

  it('preserves the four workflow phases', () => {
    const marketingContent = getMarketingContent(marketingMessages.de, 'de');

    expect(marketingContent.workflow.map(({ phase }) => phase)).toEqual([
      'EINGABE',
      'SIGNAL',
      'BRECHUNG',
      'ERGEBNIS',
    ]);
  });

  it('formats the same semantic price with the selected locale', () => {
    const german = getMarketingContent(marketingMessages.de, 'de');
    const ukrainian = getMarketingContent(marketingMessages.uk, 'uk');

    expect(german.pricing.map(({ price }) => price)).toEqual([
      '0,00 €',
      '12,00 €',
      '29,00 €',
    ]);
    expect(ukrainian.pricing.map(({ price }) => price)).toEqual([
      '0,00 €',
      '12,00 €',
      '29,00 €',
    ]);
  });
});

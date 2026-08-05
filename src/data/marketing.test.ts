import { describe, expect, it } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';
import { marketingMessages } from '@/lib/i18n/messages/marketing';

import { getMarketingContent } from './marketing';

describe('marketingContent', () => {
  it('uses canonical plan identity in every localized card and CTA', () => {
    for (const locale of supportedLocales) {
      const marketingContent = getMarketingContent(
        marketingMessages[locale],
        locale,
      );

      expect(marketingContent.pricing.map(({ label }) => label)).toEqual([
        'Free',
        'Prism',
        'Spectrum',
      ]);
      expect(marketingContent.pricing.map(({ cta }) => cta)).toEqual([
        expect.stringContaining('Free'),
        expect.stringContaining('Prism'),
        expect.stringContaining('Spectrum'),
      ]);
    }
  });

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

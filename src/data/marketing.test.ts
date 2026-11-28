import { describe, expect, it } from 'vitest';

import { marketingMessages } from '@/lib/i18n/messages/marketing';

import { getMarketingContent } from './marketing';

describe('marketingContent', () => {
  it('preserves the approved navigation order', () => {
    const marketingContent = getMarketingContent(marketingMessages.de, false);

    expect(marketingContent.navigation.map(({ href }) => href)).toEqual([
      '#product',
      '#how',
      '#facets',
      '#pricing',
    ]);
  });

  it('preserves the approved artifact order and identity', () => {
    const marketingContent = getMarketingContent(marketingMessages.de, false);

    expect(marketingContent.facets.map(({ id }) => id)).toEqual([
      'summary',
      'flashcards',
      'timestamps',
      'export',
    ]);
  });

  it('preserves the four workflow phases', () => {
    const marketingContent = getMarketingContent(marketingMessages.de, false);

    expect(marketingContent.workflow.map(({ phase }) => phase)).toEqual([
      'EINGABE',
      'SIGNAL',
      'BRECHUNG',
      'ERGEBNIS',
    ]);
  });

  it('opens the workspace and preserves the destination for signed-out visitors', () => {
    for (const signedIn of [true, false]) {
      const content = getMarketingContent(marketingMessages.en, signedIn);
      expect(content.footerLinks.at(-1)?.href).toBe(
        signedIn ? '/app' : '/sign-in?next=%2Fapp',
      );
    }
  });
});

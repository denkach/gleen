import { render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { ReferencePricing } from '@/components/marketing/reference-pricing-footer';
import { billingFixtureCatalog } from '@/lib/billing/fixtures';
import { marketingMessages } from '@/lib/i18n/messages/marketing';

const copy = marketingMessages.en.pricing;
describe('public billing catalog', () => {
  it('renders catalog names and distinguishes monthly checkout from unavailable plans', () => {
    render(
      createElement(ReferencePricing, {
        plans: billingFixtureCatalog,
        copy,
        locale: 'en',
        signedIn: false,
        startFree: copy.startFree,
      }),
    );
    for (const { plan } of billingFixtureCatalog) {
      const article = screen
        .getByRole('heading', { name: plan.displayName })
        .closest('article')!;
      const card = within(article);
      if (plan.slug === 'free')
        expect(card.getByRole('link')).toHaveAttribute('href', '/sign-up');
      else if (plan.purchasable) {
        const href = new URL(
          card.getByRole('link').getAttribute('href')!,
          'https://gleen.example',
        );
        expect(href.pathname).toBe('/sign-in');
        expect(href.searchParams.get('next')).toBe(
          `/app/subscription/checkout?plan=${plan.slug}&interval=month`,
        );
      } else expect(card.queryByRole('link')).toBeNull();
    }
  });
  it('shows a recovery link without advertising stale prices during an outage', () => {
    render(
      createElement(ReferencePricing, {
        plans: [],
        copy,
        locale: 'en',
        signedIn: true,
        startFree: copy.startFree,
      }),
    );
    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/app/subscription',
    );
  });
});

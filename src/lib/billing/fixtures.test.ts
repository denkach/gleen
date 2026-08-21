import { describe, expect, it } from 'vitest';

import {
  billingFixtureCatalog,
  billingFixtureCatalogRows,
  billingFixtureScreens,
  billingFixtureStates,
  getBillingFixture,
  isBillingFixtureSelection,
} from './fixtures';
import { parseBillingCatalogRows } from './domain';

describe('billing visual fixtures', () => {
  it('defines the complete closed screen and state vocabulary', () => {
    expect(billingFixtureScreens).toEqual([
      'subscription',
      'usage',
      'checkout',
      'portal',
      'invoices',
      'limit-reached',
    ]);
    expect(billingFixtureStates).toEqual([
      'free',
      'active',
      'past-due',
      'scheduled-cancel',
      'empty-usage',
      'failed-invoice',
      'limit-reached',
      'error',
    ]);
  });

  it.each([
    ['subscription', 'free'],
    ['subscription', 'active'],
    ['subscription', 'past-due'],
    ['subscription', 'scheduled-cancel'],
    ['subscription', 'error'],
    ['usage', 'empty-usage'],
    ['checkout', 'active'],
    ['portal', 'active'],
    ['invoices', 'failed-invoice'],
    ['limit-reached', 'limit-reached'],
  ] as const)(
    'builds deterministic %s/%s presentation',
    (fixtureScreen, state) => {
      expect(isBillingFixtureSelection(fixtureScreen, state)).toBe(true);
      expect(getBillingFixture(fixtureScreen, state)).toMatchObject({
        screen: fixtureScreen,
        state,
        now: '2025-07-29T00:00:00.000Z',
      });
    },
  );

  it('builds the subscription recovery fixture without fabricated presentation data', () => {
    expect(getBillingFixture('subscription', 'error')).toMatchObject({
      screen: 'subscription',
      state: 'error',
      presentation: null,
      shell: {
        usage: { status: 'available', planName: 'Starter' },
      },
    });
  });

  it('rejects invalid screen/state combinations', () => {
    expect(isBillingFixtureSelection('other', 'active')).toBe(false);
    expect(isBillingFixtureSelection('checkout', 'failed-invoice')).toBe(false);
    expect(() => getBillingFixture('checkout', 'failed-invoice')).toThrow(
      'Invalid billing fixture selection',
    );
  });

  it('contains presentation-only placeholders and no production identifiers or secrets', () => {
    const serialized = JSON.stringify(
      billingFixtureScreens.flatMap((fixtureScreen) =>
        billingFixtureStates.flatMap((state) =>
          isBillingFixtureSelection(fixtureScreen, state)
            ? [getBillingFixture(fixtureScreen, state)]
            : [],
        ),
      ),
    );

    expect(serialized).not.toMatch(
      /STRIPE_|SUPABASE_|sk_(live|test)|price_[A-Za-z0-9]|cus_[A-Za-z0-9]|cs_[A-Za-z0-9]/,
    );
    expect(serialized).not.toContain('process.env');
  });

  it('uses the canonical catalog rows through the production domain mapper', () => {
    expect(parseBillingCatalogRows(billingFixtureCatalogRows)).toEqual(
      billingFixtureCatalog,
    );
    expect(
      billingFixtureCatalog.map(({ plan, prices }) => ({
        slug: plan.slug,
        description: plan.description,
        limit: plan.analysisLimit,
        features: plan.features,
        purchasable: plan.purchasable,
        prices: prices.map((price) => ({
          interval: price.interval,
          amountMinor: price.amountMinor,
          monthlyEquivalentMinor: price.monthlyEquivalentMinor,
          currency: price.currency,
          savingsPercent: price.savingsPercent,
        })),
      })),
    ).toEqual([
      {
        slug: 'free',
        description: 'For exploring Gleen.',
        limit: 3,
        features: ['3 analyses per month', 'Saved history'],
        purchasable: false,
        prices: [],
      },
      {
        slug: 'starter',
        description: 'For individuals getting started with AI analysis.',
        limit: 10,
        features: [
          '10 analyses per month',
          'Basic insights & summaries',
          'Standard templates',
          'Export results',
          'Email support',
        ],
        purchasable: true,
        prices: [
          {
            interval: 'month',
            amountMinor: 1900,
            monthlyEquivalentMinor: 1900,
            currency: 'usd',
            savingsPercent: null,
          },
          {
            interval: 'year',
            amountMinor: 18000,
            monthlyEquivalentMinor: 1500,
            currency: 'usd',
            savingsPercent: 20,
          },
        ],
      },
      {
        slug: 'prism-pro',
        description:
          'For professionals who need deeper insights and more capacity.',
        limit: 25,
        features: [
          '25 analyses per month',
          'Advanced insights & takeaways',
          'All premium templates',
          'Export & download',
          'Priority support',
        ],
        purchasable: true,
        prices: [
          {
            interval: 'month',
            amountMinor: 4900,
            monthlyEquivalentMinor: 4900,
            currency: 'usd',
            savingsPercent: null,
          },
          {
            interval: 'year',
            amountMinor: 46800,
            monthlyEquivalentMinor: 3900,
            currency: 'usd',
            savingsPercent: 20,
          },
        ],
      },
      {
        slug: 'team',
        description: 'For teams collaborating and scaling their impact.',
        limit: 100,
        features: [
          '100 analyses per month',
          'Team workspace',
          'Collaboration & sharing',
          'Admin controls & roles',
          'Priority onboarding',
        ],
        purchasable: false,
        prices: [
          {
            interval: 'month',
            amountMinor: 12900,
            monthlyEquivalentMinor: 12900,
            currency: 'usd',
            savingsPercent: null,
          },
          {
            interval: 'year',
            amountMinor: 123600,
            monthlyEquivalentMinor: 10300,
            currency: 'usd',
            savingsPercent: 20,
          },
        ],
      },
    ]);
  });
});

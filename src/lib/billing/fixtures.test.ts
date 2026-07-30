import { describe, expect, it } from 'vitest';

import {
  billingFixtureScreens,
  billingFixtureStates,
  getBillingFixture,
  isBillingFixtureSelection,
} from './fixtures';

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
    ]);
  });

  it.each([
    ['subscription', 'free'],
    ['subscription', 'active'],
    ['subscription', 'past-due'],
    ['subscription', 'scheduled-cancel'],
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
});

import { describe, expect, it } from 'vitest';

import { pricingPlans } from './pricing';

describe('pricingPlans', () => {
  it('keeps the three approved plans as visual configuration', () => {
    expect(pricingPlans.map(({ label }) => label)).toEqual([
      'Free',
      'Prism · Best fit',
      'Spectrum',
    ]);
    expect(pricingPlans.every(({ ctaHref }) => ctaHref === '#product')).toBe(
      true,
    );
  });

  it('keeps prices as semantic minor amounts and ISO currencies', () => {
    expect(
      pricingPlans.map(({ amountMinor, currency }) => ({
        amountMinor,
        currency,
      })),
    ).toEqual([
      { amountMinor: 0, currency: 'EUR' },
      { amountMinor: 1200, currency: 'EUR' },
      { amountMinor: 2900, currency: 'EUR' },
    ]);
    expect(pricingPlans.every((plan) => !('price' in plan))).toBe(true);
  });

  it('marks exactly one plan as recommended', () => {
    expect(pricingPlans.filter(({ recommended }) => recommended)).toHaveLength(
      1,
    );
  });
});

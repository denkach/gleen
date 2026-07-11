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

  it('marks exactly one plan as recommended', () => {
    expect(pricingPlans.filter(({ recommended }) => recommended)).toHaveLength(
      1,
    );
  });
});

export type PricingPlan = Readonly<{
  label: string;
  name: string;
  description: string;
  amountMinor: number;
  currency: string;
  features: readonly string[];
  cta: string;
  ctaHref: '#product' | '/sign-up';
  recommended: boolean;
}>;

export const pricingPlans = Object.freeze([
  {
    label: 'Free',
    name: 'Explore',
    description: 'For trying Gleen on a few important videos.',
    amountMinor: 0,
    currency: 'EUR',
    features: [
      '3 video analyses',
      'All four artifact types',
      'Markdown export',
      'Saved history',
    ],
    cta: 'Start Free',
    ctaHref: '/sign-up',
    recommended: false,
  },
  {
    label: 'Prism',
    name: 'Build a habit',
    description: 'For students, researchers, and continuous learners.',
    amountMinor: 1200,
    currency: 'EUR',
    features: [
      '25 video analyses',
      'Longer videos',
      'Notion and Obsidian export',
      'Priority processing',
    ],
    cta: 'Choose Prism',
    ctaHref: '#product',
    recommended: true,
  },
  {
    label: 'Spectrum',
    name: 'Go deeper',
    description: 'For intensive knowledge work and larger libraries.',
    amountMinor: 2900,
    currency: 'EUR',
    features: [
      '100 video analyses',
      'Advanced exports',
      'Highest processing priority',
      'Extended history controls',
    ],
    cta: 'Choose Spectrum',
    ctaHref: '#product',
    recommended: false,
  },
] as const satisfies readonly PricingPlan[]);

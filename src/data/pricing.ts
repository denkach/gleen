export type PricingPlan = Readonly<{
  label: string;
  name: string;
  description: string;
  price: string;
  period: string;
  features: readonly string[];
  cta: string;
  ctaHref: '#product';
  recommended: boolean;
}>;

export const pricingPlans = Object.freeze([
  {
    label: 'Free',
    name: 'Explore',
    description: 'For trying Gleen on a few important videos.',
    price: '€0',
    period: '/ month',
    features: [
      '3 video analyses',
      'All four artifact types',
      'Markdown export',
      'Saved history',
    ],
    cta: 'Start free',
    ctaHref: '#product',
    recommended: false,
  },
  {
    label: 'Prism · Best fit',
    name: 'Build a habit',
    description: 'For students, researchers, and continuous learners.',
    price: '€12',
    period: '/ month',
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
    price: '€29',
    period: '/ month',
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

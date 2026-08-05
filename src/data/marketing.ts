import type { MarketingMessages } from '@/lib/i18n/messages/marketing';
import { formatCurrency } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/locales';

import { pricingPlans } from './pricing';

export type ArtifactId = 'summary' | 'flashcards' | 'timestamps' | 'export';

export type MarketingLink = Readonly<{ label: string; href: string }>;

export type WorkflowStep = Readonly<{
  number: string;
  phase: string;
  title: string;
  body: string;
}>;

export type ArtifactFacet = Readonly<{
  id: ArtifactId;
  kicker: string;
  title: string;
  body: string;
  cta: string;
}>;

export type FooterGroup = Readonly<{
  title: string;
  links: readonly MarketingLink[];
}>;

export type MarketingPricingCard = Readonly<{
  label: string;
  name: string;
  description: string;
  features: Readonly<Record<string, string>>;
  cta: string;
  price: string;
  period: string;
  recommended: boolean;
  ctaHref: string;
}>;

export type MarketingContent = Readonly<{
  navigation: readonly MarketingLink[];
  workflow: readonly WorkflowStep[];
  facets: readonly ArtifactFacet[];
  footerGroups: readonly FooterGroup[];
  pricing: readonly MarketingPricingCard[];
}>;

export function getMarketingContent(
  copy: MarketingMessages,
  locale: Locale,
): MarketingContent {
  const pricing = [
    copy.pricing.free,
    copy.pricing.prism,
    copy.pricing.spectrum,
  ].map((card, index) => ({
    ...card,
    label: pricingPlans[index]!.label,
    price: formatCurrency({
      amountMinor: pricingPlans[index]!.amountMinor,
      currency: pricingPlans[index]!.currency,
      locale,
    }),
    period: copy.pricing.period,
    recommended: pricingPlans[index]!.recommended,
    ctaHref: pricingPlans[index]!.ctaHref,
  }));

  return Object.freeze({
    navigation: [
      { label: copy.header.product, href: '#product' },
      { label: copy.header.howItWorks, href: '#how' },
      { label: copy.header.examples, href: '#facets' },
      { label: copy.header.pricing, href: '#pricing' },
    ],
    workflow: [
      { number: '01', ...copy.workflow.input },
      { number: '02', ...copy.workflow.signal },
      { number: '03', ...copy.workflow.refraction },
      { number: '04', ...copy.workflow.output },
    ],
    facets: [
      { id: 'summary', ...copy.facets.summary },
      { id: 'flashcards', ...copy.facets.flashcards },
      { id: 'timestamps', ...copy.facets.timestamps },
      { id: 'export', ...copy.facets.export },
    ],
    footerGroups: [
      {
        title: copy.footer.product,
        links: [
          { label: copy.footer.artifacts, href: '#facets' },
          { label: copy.footer.howItWorks, href: '#how' },
          { label: copy.footer.pricing, href: '#pricing' },
          { label: copy.footer.openApp, href: '#product' },
        ],
      },
      {
        title: copy.footer.company,
        links: [
          { label: copy.footer.privacy, href: '#product' },
          { label: copy.footer.terms, href: '#product' },
          { label: copy.footer.cookies, href: '#product' },
          { label: copy.footer.contact, href: '#product' },
        ],
      },
      {
        title: copy.footer.language,
        links: [
          { label: 'English', href: '#product' },
          { label: 'Українська', href: '#product' },
          { label: 'Русский', href: '#product' },
          { label: 'Español', href: '#product' },
          { label: 'Deutsch', href: '#product' },
        ],
      },
    ],
    pricing,
  });
}

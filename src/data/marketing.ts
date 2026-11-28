import type { MarketingMessages } from '@/lib/i18n/messages/marketing';

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

export type MarketingContent = Readonly<{
  navigation: readonly MarketingLink[];
  workflow: readonly WorkflowStep[];
  facets: readonly ArtifactFacet[];
  footerLinks: readonly MarketingLink[];
}>;

export function getMarketingContent(
  copy: MarketingMessages,
  signedIn: boolean,
): MarketingContent {
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
    footerLinks: [
      { label: copy.footer.artifacts, href: '#facets' },
      { label: copy.footer.howItWorks, href: '#how' },
      { label: copy.footer.pricing, href: '#pricing' },
      {
        label: copy.footer.openApp,
        href: signedIn ? '/app' : '/sign-in?next=%2Fapp',
      },
    ],
  });
}

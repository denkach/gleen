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

const navigation = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how' },
  { label: 'Artifacts', href: '#facets' },
  { label: 'Pricing', href: '#pricing' },
] as const satisfies readonly MarketingLink[];

const workflow = [
  {
    number: '01',
    phase: 'INPUT',
    title: 'Paste a link',
    body: 'Gleen validates the source and checks your saved analyses first.',
  },
  {
    number: '02',
    phase: 'SIGNAL',
    title: 'Read the video',
    body: 'Transcript, metadata, chapters, and source language are mapped.',
  },
  {
    number: '03',
    phase: 'REFRACTION',
    title: 'Separate ideas',
    body: 'Key arguments become structured, source-linked knowledge.',
  },
  {
    number: '04',
    phase: 'OUTPUT',
    title: 'Use the result',
    body: 'Study, revisit, export, and continue without paying twice.',
  },
] as const satisfies readonly WorkflowStep[];

const facets = [
  {
    id: 'summary',
    kicker: 'Structured summary',
    title: 'See the shape of the argument.',
    body: 'Expandable chapters, highlighted key ideas, actionable conclusions, and direct links back to the exact moment in the video.',
    cta: 'Explore the summary',
  },
  {
    id: 'flashcards',
    kicker: 'Interactive flashcards',
    title: 'Turn insight into memory.',
    body: 'Study the video’s most important concepts in a focused deck. Flip, rate, edit, and jump directly to the source.',
    cta: 'Open study mode',
  },
  {
    id: 'timestamps',
    kicker: 'Clickable timestamps',
    title: 'Move through meaning, not minutes.',
    body: 'A source-linked timeline lets you revisit the right passage instantly instead of scrubbing through the entire video.',
    cta: 'See the timeline',
  },
  {
    id: 'export',
    kicker: 'Export-ready knowledge',
    title: 'Let the result flow into your system.',
    body: 'Choose the destination and keep the structure. Export transparently to Notion, Obsidian, NotebookLM, or clean Markdown.',
    cta: 'Preview exports',
  },
] as const satisfies readonly ArtifactFacet[];

const footerGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Artifacts', href: '#facets' },
      { label: 'How it works', href: '#how' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Open app', href: '#product' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Privacy', href: '#product' },
      { label: 'Terms', href: '#product' },
      { label: 'Cookies', href: '#product' },
      { label: 'Contact', href: '#product' },
    ],
  },
  {
    title: 'Language',
    links: [
      { label: 'English', href: '#product' },
      { label: 'Українська', href: '#product' },
      { label: 'Русский', href: '#product' },
      { label: 'Español', href: '#product' },
      { label: 'Deutsch', href: '#product' },
    ],
  },
] as const satisfies readonly FooterGroup[];

export const marketingContent = Object.freeze({
  navigation,
  workflow,
  facets,
  footerGroups,
});

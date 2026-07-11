# GLE-003 Landing Page and Motion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Gleen public landing page as a faithful, responsive and accessible componentized port of `design/reference-v3/index.html`.

**Architecture:** `src/app/page.tsx` remains a Server Component and composes typed marketing data with focused presentational sections. Client code is restricted to the mobile dialog, BeamInput demo, and a dynamically loaded GSAP motion controller; CSS owns the approved geometry and decorative micro-motion.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4 with CSS variables, Radix Dialog, GSAP/ScrollTrigger, Vitest/Testing Library, Playwright.

## Global Constraints

- Never modify or reinterpret `design/reference-v3/` or `design/screenshots/`; verify that both directories remain byte-for-byte unchanged.
- Match the approved reference at 1440×900, 1024×768, and 390×844; this issue does not authorize redesign.
- Preserve the dark-only “The Prism” language and the restrained 90/10 dark-to-spectral balance.
- Summary is amber, Flashcards purple, Timestamps cyan, and Export lime.
- Do not add FAQ, a separate final CTA, real processing, authentication, checkout, audio, Three.js, or React Three Fiber.
- BeamInput is a local, non-persistent demonstration and must never perform a network request or consume credits.
- All content is readable before hydration; reduced-motion mode initializes no GSAP and hides no content.
- Use shared CSS variables; do not introduce unexplained one-off visual values.
- Keep prices, currencies, limits, languages, navigation, and copy in typed data modules rather than JSX.
- Pin every new production dependency exactly and document its purpose.
- Every implementation task uses TDD, ends in a focused Conventional Commit, and must leave its targeted tests green.

---

## File Map

### Create

- `src/data/marketing.ts` — typed navigation, workflow, facet, footer and SEO copy.
- `src/data/pricing.ts` — typed visual-only pricing configuration.
- `src/components/marketing/marketing-icon.tsx` — local SVG symbol renderer used by marketing components.
- `src/components/marketing/site-header.tsx` — fixed header and server-rendered navigation shell.
- `src/components/marketing/mobile-menu.tsx` — accessible client-side Radix Dialog menu.
- `src/components/marketing/beam-input.tsx` — local URL validation and demo state machine.
- `src/components/marketing/prism-scene.tsx` — approved decorative SVG prism and artifact layers.
- `src/components/marketing/hero.tsx` — approved hero composition.
- `src/components/marketing/process-scene.tsx` — approved workflow copy and optical track.
- `src/components/marketing/artifact-facets.tsx` — four approved facet demos.
- `src/components/marketing/pricing-preview.tsx` — typed, non-checkout pricing preview.
- `src/components/marketing/site-footer.tsx` — approved footer groups and caution.
- `src/components/marketing/motion-policy.ts` — pure media-query motion decisions.
- `src/components/marketing/motion-controller.tsx` — dynamic GSAP/ScrollTrigger lifecycle.
- `src/components/marketing/optical-cursor.tsx` — optional fine-pointer decorative cursor.
- `src/components/marketing/*.test.tsx` and `src/data/*.test.ts` — focused component/data tests.
- `src/styles/marketing.css` — faithful port of reference landing selectors, responsive rules and reduced-motion overrides.

### Modify

- `package.json` / `package-lock.json` — exact GSAP and local font-package versions.
- `src/app/layout.tsx` — local fonts, canonical metadata, social metadata and body variables.
- `src/app/globals.css` — import marketing stylesheet and remove homepage-only foundation rules.
- `src/app/page.tsx` / `src/app/page.test.tsx` — compose and test the complete landing page.
- `tests/e2e/home.spec.ts` — desktop, tablet, mobile, motion, accessibility and overflow checks.
- `README.md` — dependency rationale and landing verification commands.

---

### Task 1: Pin Fonts and Motion Dependency

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

**Interfaces:**

- Produces: installed `gsap`, `@fontsource-variable/inter`, `@fontsource-variable/space-grotesk`, and `@fontsource-variable/jetbrains-mono` package assets.

- [ ] **Step 1: Record the currently published exact versions without changing the tree**

Run:

```bash
npm view gsap version && npm view @fontsource-variable/inter version && npm view @fontsource-variable/space-grotesk version && npm view @fontsource-variable/jetbrains-mono version
```

Expected on 2026-07-11: `3.15.0`, `5.2.8`, `5.2.10`, and `5.2.8`. If the registry output differs, stop and review the newer releases rather than silently changing this approved plan.

- [ ] **Step 2: Install only the approved packages with exact versions**

```bash
npm install --save-exact gsap@3.15.0 @fontsource-variable/inter@5.2.8 @fontsource-variable/space-grotesk@5.2.10 @fontsource-variable/jetbrains-mono@5.2.8
```

Expected: only `package.json` and `package-lock.json` change; `npm ls` reports no invalid dependency.

- [ ] **Step 3: Document the dependency boundary**

Add this README section with the actual pinned versions substituted:

```markdown
### Landing-page dependencies

- `gsap@VERSION` is restricted to the marketing motion controller for deterministic ScrollTrigger scenes.
- `@fontsource-variable/inter@VERSION`, `@fontsource-variable/space-grotesk@VERSION`, and `@fontsource-variable/jetbrains-mono@VERSION` provide self-hosted assets with no runtime Google Fonts request.
- Application UI and server processing must not import GSAP.
```

- [ ] **Step 4: Verify and commit**

Run `npm ls gsap @fontsource-variable/inter @fontsource-variable/space-grotesk @fontsource-variable/jetbrains-mono`.

Expected: all four exact versions appear once with no errors.

```bash
git add package.json package-lock.json README.md
git commit -m "build(DEN-13): add landing motion and font assets"
```

### Task 2: Define Typed Marketing and Pricing Data

**Files:**

- Create: `src/data/marketing.ts`
- Create: `src/data/marketing.test.ts`
- Create: `src/data/pricing.ts`
- Create: `src/data/pricing.test.ts`

**Interfaces:**

- Produces: `MarketingLink`, `WorkflowStep`, `ArtifactFacet`, `FooterGroup`, `marketingContent`, `PricingPlan`, and `pricingPlans`.
- Required facet union: `'summary' | 'flashcards' | 'timestamps' | 'export'`.

- [ ] **Step 1: Write failing schema/order tests**

```ts
import { describe, expect, it } from 'vitest';
import { marketingContent } from './marketing';
import { pricingPlans } from './pricing';

describe('landing data', () => {
  it('preserves approved section and facet order', () => {
    expect(marketingContent.navigation.map(({ href }) => href)).toEqual([
      '#product',
      '#how',
      '#facets',
      '#pricing',
    ]);
    expect(marketingContent.facets.map(({ id }) => id)).toEqual([
      'summary',
      'flashcards',
      'timestamps',
      'export',
    ]);
  });

  it('keeps pricing as visual configuration', () => {
    expect(pricingPlans).toHaveLength(3);
    expect(pricingPlans.every((plan) => plan.ctaHref === '#product')).toBe(
      true,
    );
    expect(pricingPlans.filter((plan) => plan.recommended)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests and confirm the missing modules fail**

Run: `npm test -- src/data/marketing.test.ts src/data/pricing.test.ts`

Expected: FAIL because the data modules do not exist.

- [ ] **Step 3: Implement readonly types and approved content**

Use this exact public shape, copying strings from lines 1502–1631 of the approved HTML without paraphrasing:

```ts
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

export const marketingContent = Object.freeze({
  navigation: [
    { label: 'Product', href: '#product' },
    { label: 'How it works', href: '#how' },
    { label: 'Artifacts', href: '#facets' },
    { label: 'Pricing', href: '#pricing' },
  ] as const,
  facets: [
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
  ] as const,
});
```

Define `PricingPlan` with `label`, `name`, `description`, `price`, `period`, `features`, `cta`, `ctaHref`, and `recommended`; transcribe the three approved cards exactly and freeze the exported array.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- src/data/marketing.test.ts src/data/pricing.test.ts`

Expected: PASS.

```bash
git add src/data
git commit -m "feat(DEN-13): define landing content data"
```

### Task 3: Configure Self-Hosted Typography and Metadata

**Files:**

- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/page.test.tsx`

**Interfaces:**

- Produces CSS variables: `--font-display`, `--font-body`, `--font-mono`.
- Consumes: validated `NEXT_PUBLIC_APP_URL` through `validatePublicEnv(process.env)`.

- [ ] **Step 1: Extend the page test for metadata-independent content and font classes**

Add assertions that the rendered root page exposes the approved H1 and does not contain the foundation copy. Keep metadata verification for Playwright because React component rendering does not execute Next metadata.

```ts
expect(
  screen.getByRole('heading', {
    level: 1,
    name: /Watch less\.\s*Understand more\./i,
  }),
).toBeVisible();
expect(screen.queryByText('Gleen frontend foundation')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the test and verify it fails on the old page**

Run: `npm test -- src/app/page.test.tsx`

Expected: FAIL because the approved heading is absent.

- [ ] **Step 3: Configure local variable fonts and metadata**

Import each package CSS asset in `layout.tsx`, retain the existing fallback stacks, and export metadata with this shape:

```ts
const { NEXT_PUBLIC_APP_URL } = validatePublicEnv(process.env);
const landingDescription =
  'Turn any YouTube video into a structured summary, smart flashcards, precise timestamps, and export-ready knowledge.';

export const metadata: Metadata = {
  metadataBase: new URL(NEXT_PUBLIC_APP_URL),
  title: 'Gleen — Watch less. Understand more.',
  description: landingDescription,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Gleen — Watch less. Understand more.',
    description: landingDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gleen — Watch less. Understand more.',
    description: landingDescription,
  },
  robots: { index: true, follow: true },
};
```

Do not invent an OG image. Map the package font family names onto the three existing CSS variables.

- [ ] **Step 4: Typecheck and commit**

Run: `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run typecheck`

Expected: PASS.

```bash
git add src/app/layout.tsx src/app/globals.css src/app/page.test.tsx
git commit -m "feat(DEN-13): configure landing typography and metadata"
```

### Task 4: Build the Static Header, Hero, and Prism

**Files:**

- Create: `src/components/marketing/marketing-icon.tsx`
- Create: `src/components/marketing/site-header.tsx`
- Create: `src/components/marketing/mobile-menu.tsx`
- Create: `src/components/marketing/beam-input.tsx`
- Create: `src/components/marketing/prism-scene.tsx`
- Create: `src/components/marketing/hero.tsx`
- Create: `src/components/marketing/hero.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/styles/marketing.css`

**Interfaces:**

- `MarketingIcon({ name, className?, title? })` renders only locally defined paths.
- `BeamInput({ onDemoStateChange? })` emits `'idle' | 'invalid' | 'refracting' | 'complete'`.
- `PrismScene({ demoState })` publishes `data-demo-state` on the approved scene root.

- [ ] **Step 1: Write the static hero contract test**

```tsx
render(<HomePage />);
expect(screen.getByRole('banner')).toBeVisible();
expect(
  screen.getByRole('navigation', { name: 'Primary navigation' }),
).toBeVisible();
expect(
  screen.getByRole('heading', { level: 1, name: /Watch less/i }),
).toBeVisible();
expect(screen.getByRole('textbox', { name: /YouTube URL/i })).toBeRequired();
expect(screen.getByRole('button', { name: 'Transform video' })).toBeVisible();
expect(document.querySelector('.prism-stage')).toHaveAttribute(
  'aria-hidden',
  'true',
);
```

- [ ] **Step 2: Confirm the new semantic contract fails**

Run: `npm test -- src/components/marketing/hero.test.tsx src/app/page.test.tsx`

Expected: FAIL on missing header/form/prism.

- [ ] **Step 3: Port markup without reinterpretation**

Transcribe the DOM hierarchy from approved lines 1502–1565 into the focused components. Keep `BeamInput` initially in `idle` state, use a real `<label className="sr-only" htmlFor="youtube-url">YouTube URL</label>`, and keep every decorative prism layer `aria-hidden`.

`page.tsx` at this checkpoint must be:

```tsx
export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">
        <Hero />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Port only the matching reference CSS**

Create `marketing.css` from the reference variables and selectors needed by header/hero/prism. Convert literals to named `--marketing-*` variables at the file root; retain the approved 78 px header, desktop grid and 980/720 px breakpoints. Do not port prototype debug UI, `?motion=1`, app-screen CSS, or audio/media rules.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/components/marketing/hero.test.tsx src/app/page.test.tsx`

Expected: PASS.

```bash
git add src/app/page.tsx src/components/marketing src/styles/marketing.css
git commit -m "feat(DEN-13): build approved landing hero"
```

### Task 5: Implement BeamInput’s Local Demo State Machine

**Files:**

- Modify: `src/components/marketing/beam-input.tsx`
- Create: `src/components/marketing/beam-input.test.tsx`

**Interfaces:**

- Produces: `isYouTubeUrl(value: string): boolean` and `BeamDemoState`.
- Validation hosts: exact `youtube.com`, any `.youtube.com` subdomain, and exact `youtu.be`; protocols are HTTP(S) only.

- [ ] **Step 1: Write validation and state tests with fake timers**

```tsx
expect(isYouTubeUrl('https://youtube.com/watch?v=abc')).toBe(true);
expect(isYouTubeUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
expect(isYouTubeUrl('https://youtu.be/abc')).toBe(true);
expect(isYouTubeUrl('https://notyoutube.com/watch?v=abc')).toBe(false);
expect(isYouTubeUrl('javascript:alert(1)')).toBe(false);

const fetchSpy = vi.spyOn(globalThis, 'fetch');
await user.type(
  screen.getByRole('textbox', { name: /YouTube URL/i }),
  'https://youtu.be/abc',
);
await user.click(screen.getByRole('button', { name: 'Transform video' }));
expect(screen.getByRole('button', { name: 'Refracting…' })).toBeDisabled();
expect(fetchSpy).not.toHaveBeenCalled();
```

Also test empty input, invalid host, duplicate submit, complete live status, timer cleanup, and return to idle.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/components/marketing/beam-input.test.tsx`

Expected: FAIL because validation and transitions are absent.

- [ ] **Step 3: Implement the minimal deterministic state machine**

```ts
export function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (host === 'youtu.be' ||
        host === 'youtube.com' ||
        host.endsWith('.youtube.com'))
    );
  } catch {
    return false;
  }
}
```

Use one owned timeout sequence, clear it on unmount, communicate errors through `aria-describedby`/`aria-invalid`, and completion through `role="status"`. Never call `fetch`, storage, router APIs, or a server action.

- [ ] **Step 4: Pass tests and commit**

Run: `npm test -- src/components/marketing/beam-input.test.tsx`

Expected: PASS.

```bash
git add src/components/marketing/beam-input.tsx src/components/marketing/beam-input.test.tsx
git commit -m "feat(DEN-13): add local BeamInput demo"
```

### Task 6: Add Workflow, Four Facets, Pricing, and Footer

**Files:**

- Create: `src/components/marketing/process-scene.tsx`
- Create: `src/components/marketing/artifact-facets.tsx`
- Create: `src/components/marketing/pricing-preview.tsx`
- Create: `src/components/marketing/site-footer.tsx`
- Create: `src/components/marketing/landing-sections.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/styles/marketing.css`

**Interfaces:**

- Consumes: `marketingContent` and `pricingPlans` only; no duplicated pricing or facet arrays inside JSX.
- Produces section IDs `how`, `facets`, and `pricing`, plus `data-facet` values matching `ArtifactId`.

- [ ] **Step 1: Write section order and data-source tests**

```tsx
render(<HomePage />);
expect(
  [...document.querySelectorAll('main > section')].map((node) => node.id),
).toEqual(['product', 'how', 'facets', 'pricing']);
expect(screen.getAllByRole('article', { name: /plan/i })).toHaveLength(3);
expect(document.querySelectorAll('[data-facet]')).toHaveLength(4);
expect(
  [...document.querySelectorAll('[data-facet]')].map((node) =>
    node.getAttribute('data-facet'),
  ),
).toEqual(['summary', 'flashcards', 'timestamps', 'export']);
expect(document.querySelector('audio,[autoplay]')).toBeNull();
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/components/marketing/landing-sections.test.tsx`

Expected: FAIL because the sections are missing.

- [ ] **Step 3: Port approved markup and illustrative demos**

Transcribe approved lines 1568–1631. Use semantic headings/articles and data maps; label each plan article with its plan name. Keep every facet CTA and pricing CTA pointed at `#product`; do not add checkout handlers or fake application routes. Preserve exact facet order and mock-demo language.

- [ ] **Step 4: Port the matching section CSS**

Bring over only workflow, facets, pricing and footer selectors from the approved reference. Replace inline widths with named modifier classes such as `.summary-line--78`, `.export-line--84`, `.export-line--94`, and `.export-line--66`, preserving the same values. Retain approved tablet/mobile breakpoints and no generic card restyling.

- [ ] **Step 5: Pass tests and commit**

Run: `npm test -- src/components/marketing/landing-sections.test.tsx src/data/marketing.test.ts src/data/pricing.test.ts`

Expected: PASS.

```bash
git add src/app/page.tsx src/components/marketing src/styles/marketing.css
git commit -m "feat(DEN-13): add approved landing sections"
```

### Task 7: Implement Accessible Mobile Navigation

**Files:**

- Modify: `src/components/marketing/mobile-menu.tsx`
- Modify: `src/components/marketing/site-header.tsx`
- Create: `src/components/marketing/mobile-menu.test.tsx`

**Interfaces:**

- Consumes existing `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, and `DialogClose` primitives.
- Menu links use the same `marketingContent.navigation` array as desktop navigation.

- [ ] **Step 1: Write keyboard and close-behavior tests**

```tsx
render(<SiteHeader />);
const trigger = screen.getByRole('button', { name: 'Open menu' });
await user.click(trigger);
expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
await user.keyboard('{Escape}');
expect(
  screen.queryByRole('dialog', { name: 'Navigation' }),
).not.toBeInTheDocument();
expect(trigger).toHaveFocus();
```

Add a test that activating `How it works` closes the dialog and retains `href="#how"`.

- [ ] **Step 2: Confirm failure**

Run: `npm test -- src/components/marketing/mobile-menu.test.tsx`

Expected: FAIL until the Dialog integration exists.

- [ ] **Step 3: Implement using the existing primitive**

Make only `mobile-menu.tsx` a Client Component. Use controlled `open` state so a link click calls `setOpen(false)`. Do not manually implement focus trapping, body locking, Escape, portals, or focus return.

- [ ] **Step 4: Pass tests and commit**

Run: `npm test -- src/components/marketing/mobile-menu.test.tsx src/components/ui/overlay-primitives.test.tsx`

Expected: PASS.

```bash
git add src/components/marketing/mobile-menu.tsx src/components/marketing/mobile-menu.test.tsx src/components/marketing/site-header.tsx
git commit -m "feat(DEN-13): add accessible mobile navigation"
```

### Task 8: Add Motion Policy, GSAP Scenes, and Optical Cursor

**Files:**

- Create: `src/components/marketing/motion-policy.ts`
- Create: `src/components/marketing/motion-policy.test.ts`
- Create: `src/components/marketing/motion-controller.tsx`
- Create: `src/components/marketing/motion-controller.test.tsx`
- Create: `src/components/marketing/optical-cursor.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/styles/marketing.css`

**Interfaces:**

- `getMotionPolicy({ reducedMotion, finePointer }): { enableGsap: boolean; enableCursor: boolean }`.
- `MotionController` dynamically imports `gsap` and `gsap/ScrollTrigger`, scopes selectors to `[data-marketing-root]`, and returns `context.revert()` cleanup.

- [ ] **Step 1: Write pure-policy and lifecycle tests**

```ts
expect(getMotionPolicy({ reducedMotion: true, finePointer: true })).toEqual({
  enableGsap: false,
  enableCursor: false,
});
expect(getMotionPolicy({ reducedMotion: false, finePointer: false })).toEqual({
  enableGsap: true,
  enableCursor: false,
});
expect(getMotionPolicy({ reducedMotion: false, finePointer: true })).toEqual({
  enableGsap: true,
  enableCursor: true,
});
```

Mock the dynamic loader through an injected `loadMotionLibrary` function; assert one setup, one ScrollTrigger registration, and one `revert()` on unmount. Assert rejected imports are caught and leave `data-motion-ready` unset.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/components/marketing/motion-policy.test.ts src/components/marketing/motion-controller.test.tsx`

Expected: FAIL because policy/controller do not exist.

- [ ] **Step 3: Implement GSAP only for approved scroll relationships**

Inside one `gsap.context`, create ScrollTriggers for:

```ts
gsap.to('.process-scene', {
  '--beam-progress': 1,
  ease: 'none',
  scrollTrigger: {
    trigger: '.process-scene',
    start: 'top 72%',
    end: 'bottom 38%',
    scrub: true,
  },
});
gsap.utils.toArray<HTMLElement>('.process-step').forEach((step) => {
  ScrollTrigger.create({
    trigger: step,
    start: 'top 72%',
    toggleClass: 'is-lit',
  });
});
gsap.utils.toArray<HTMLElement>('.facet-panel').forEach((panel) => {
  ScrollTrigger.create({
    trigger: panel,
    start: 'top 70%',
    end: 'bottom 30%',
    toggleClass: 'is-active-facet',
  });
});
```

Match final trigger values against the approved script, but keep GSAP out of BeamInput and application primitives. Catch import failure, remove listeners, and call `context.revert()` plus owned trigger cleanup.

- [ ] **Step 4: Add CSS micro-motion and reduced-motion end states**

Port the approved prism, flash, artifact, facet and hover keyframes. Add a final `@media (prefers-reduced-motion: reduce)` block that disables animation/transition, hides the optical cursor, makes all reveals visible, sets the workflow beam to its final state, and ensures every process/facet state looks complete without JS.

- [ ] **Step 5: Pass tests and commit**

Run: `npm test -- src/components/marketing/motion-policy.test.ts src/components/marketing/motion-controller.test.tsx`

Expected: PASS with no unhandled rejected promise.

```bash
git add src/app/page.tsx src/components/marketing src/styles/marketing.css
git commit -m "feat(DEN-13): add restrained landing motion"
```

### Task 9: Add Responsive End-to-End Coverage

**Files:**

- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/fixtures.ts` if a console-error collector is shared.

**Interfaces:**

- Viewports: exactly 1440×900, 1024×768, and 390×844.
- Test hooks: semantic roles plus `data-demo-state`, `data-facet`, `data-motion-ready`, and stable section IDs only.

- [ ] **Step 1: Replace the foundation E2E test with the full landing contract**

Create parameterized tests that load `/`, collect `pageerror` and console errors, verify section order, title, canonical, navigation, no `audio`/`autoplay`, and `document.documentElement.scrollWidth <= window.innerWidth` at all three viewports.

Add focused flows:

```ts
await page
  .getByRole('textbox', { name: /YouTube URL/i })
  .fill('https://example.com/video');
await page.getByRole('button', { name: 'Transform video' }).click();
await expect(page.getByText(/Use a YouTube or youtu\.be URL/i)).toBeVisible();

await page
  .getByRole('textbox', { name: /YouTube URL/i })
  .fill('https://youtu.be/demo');
await page.getByRole('button', { name: 'Transform video' }).click();
await expect(page.locator('.prism-stage')).toHaveAttribute(
  'data-demo-state',
  'refracting',
);
await expect(page.getByRole('status')).toContainText(/ready/i);
```

On mobile, open the menu, press Escape, reopen and activate `How it works`. With `reducedMotion: 'reduce'`, assert `data-motion-ready` is absent and all four facets are visible.

- [ ] **Step 2: Run E2E and diagnose every failure before editing implementation**

Run: `npm run test:e2e -- tests/e2e/home.spec.ts`

Expected: PASS at all target viewports. If it fails, use the systematic-debugging skill before changing code.

- [ ] **Step 3: Commit the browser contract**

```bash
git add tests/e2e/home.spec.ts tests/e2e/fixtures.ts
git commit -m "test(DEN-13): cover responsive landing flows"
```

### Task 10: Perform Reference Fidelity and Production Verification

**Files:**

- Modify only files proven necessary by comparison.
- Never modify: `design/reference-v3/**`, `design/screenshots/**`.

**Interfaces:**

- Produces evidence for desktop, tablet, mobile, reduced motion and production-mode acceptance.

- [ ] **Step 1: Capture baseline checksums before visual work**

```bash
find design/reference-v3 design/screenshots -type f -print0 | sort -z | xargs -0 shasum -a 256 > /tmp/gleen-approved-design.before.sha256
```

Expected: a checksum manifest outside the repository.

- [ ] **Step 2: Run the complete static and unit suite**

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: every command exits 0. Review the production build for accidental client-only rendering warnings.

- [ ] **Step 3: Run development and production browser suites**

```bash
npm run test:e2e
npm run test:e2e:production
```

Expected: all tests pass, including the existing `/ui` development-only and production-404 contracts.

- [ ] **Step 4: Compare live output to approved references**

Start the dev server and use browser verification to capture full-page and hero screenshots at 1440×900, 1024×768 and 390×844 in normal and reduced-motion modes. Compare initial state with `landing-initial.png`, submitted BeamInput state with `landing-transform.png`, and layout/motion endpoints with the live `design/reference-v3/index.html` at identical viewports.

The review checklist is exact: hierarchy, copy, line breaks, header height, container width, hero/prism balance, beam/ray positions, section spacing, facet ordering/colors, card geometry, typography metrics, restrained glow, mobile stacking, focus visibility, and absence of horizontal overflow. Correct mismatches by tracing values back to the reference; do not redesign around them.

- [ ] **Step 5: Verify approved assets stayed unchanged**

```bash
find design/reference-v3 design/screenshots -type f -print0 | sort -z | xargs -0 shasum -a 256 > /tmp/gleen-approved-design.after.sha256
diff -u /tmp/gleen-approved-design.before.sha256 /tmp/gleen-approved-design.after.sha256
git diff --check
git status --short
```

Expected: checksum diff is empty, `git diff --check` is silent, and status contains only intentional DEN-13 changes.

- [ ] **Step 6: Run the final verification skill and commit any proven fidelity fixes**

Invoke `superpowers:verification-before-completion`, rerun the checks it requires, then commit only if comparison produced changes:

```bash
git add src tests README.md package.json package-lock.json
git commit -m "fix(DEN-13): align landing with approved reference"
```

Expected: clean working tree, all automated checks green, browser evidence recorded in the task handoff, and no claim of completion before these results exist.

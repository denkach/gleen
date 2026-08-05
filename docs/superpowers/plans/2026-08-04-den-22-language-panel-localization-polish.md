# DEN-22 Language Panel and Localization Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every locale dropdown with the approved animated language panel, make locale changes feel immediate, and finish an editorial-quality audit of all five supported interface languages.

**Architecture:** Keep server-rendered catalogs and the authenticated profile as durable cross-device storage, but make the valid browser cookie authoritative for the current device and update it optimistically before the server action resolves. Split the shared switcher into a small persistence helper, a focused modal panel, and the existing integration component; use the existing Radix Dialog dependency for focus containment and portal behavior while matching the supplied prototype with shared Prism tokens.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Radix Dialog, Tailwind-era shared CSS variables, Vitest/Testing Library, Playwright.

## Global Constraints

- Preserve the approved dark-only “The Prism” design and the exact visual/motion behavior in `design/prototypes/gleen-language-panel-animated-v1/`.
- Support Ukrainian, Russian, English, Spanish, and German in that order; do not add flags.
- Keep interface language separate from generated-content language.
- Keep `Gleen`, `Free`, `Prism`, `Spectrum`, `Notion`, `Obsidian`, `NotebookLM`, `Markdown`, and `Stripe` unchanged in every locale.
- Keep prices, plan limits, currencies, features, and purchase availability data-driven.
- Do not add a production dependency.
- Preserve keyboard navigation, focus restoration, desktop/tablet/mobile layouts, and `prefers-reduced-motion`.
- Do not render a visible pending or “saving language” message.
- Use tests first for every behavior change and commit each independently reviewable task.

---

## File responsibility map

- `src/lib/i18n/browser-locale-cookie.ts`: validate and serialize the immediate browser locale cookie.
- `src/lib/i18n/request-locale.ts`: resolve a valid current-device cookie before profile/header fallbacks.
- `src/lib/i18n/locales.ts`: locale identity metadata, including stable English identification names.
- `src/lib/i18n/messages/shared.ts`: localized panel, shortcut, toast, and synchronization copy.
- `src/lib/i18n/locale-switcher-copy.ts`: materialize the exact serializable panel-copy boundary.
- `src/components/i18n/language-panel.tsx`: modal structure, radio rows, focus/keyboard behavior, and selection animation delay.
- `src/components/i18n/locale-switcher.tsx`: trigger, optimistic state, cookie write, route refresh, server synchronization, toast, and error state.
- `src/app/globals.css`: shared panel/scrim/toast geometry and motion.
- `src/styles/{landing-reference,auth-reference,app-shell-reference}.css`: context-only trigger alignment and responsive integration.
- `src/lib/i18n/messages/*.ts`: audited localized product copy.
- `src/data/marketing.ts` and `src/data/pricing.ts`: canonical marketing plan-name composition.
- `tests/e2e/localization.spec.ts`: guest/authenticated persistence, panel interaction, responsive geometry, and reduced-motion behavior.

---

### Task 1: Immediate browser locale and request precedence

**Files:**

- Create: `src/lib/i18n/browser-locale-cookie.ts`
- Create: `src/lib/i18n/browser-locale-cookie.test.ts`
- Modify: `src/lib/i18n/request-locale.ts`
- Modify: `src/lib/i18n/request-locale.test.ts`

**Interfaces:**

- Consumes: `localeSchema`, `Locale` from `src/lib/i18n/locales.ts`.
- Produces: `writeBrowserLocaleCookie(locale: Locale): void`; request resolution order `cookie -> profile -> Accept-Language -> en`.

- [ ] **Step 1: Write failing cookie serialization tests**

```ts
import { writeBrowserLocaleCookie } from './browser-locale-cookie';

it('writes the validated one-year current-device locale cookie', () => {
  writeBrowserLocaleCookie('de');
  expect(document.cookie).toContain('gleen_locale=de');
});

it('uses the same path, max age, and SameSite policy as the server action', () => {
  const setter = vi.spyOn(Document.prototype, 'cookie', 'set');
  writeBrowserLocaleCookie('es');
  expect(setter).toHaveBeenCalledWith(
    'gleen_locale=es; Path=/; Max-Age=31536000; SameSite=Lax',
  );
});
```

- [ ] **Step 2: Run the cookie tests and verify RED**

Run: `npm test -- src/lib/i18n/browser-locale-cookie.test.ts`

Expected: FAIL because `browser-locale-cookie.ts` does not exist.

- [ ] **Step 3: Implement the minimal browser helper**

```ts
import type { Locale } from './locales';

export const interfaceLocaleCookieName = 'gleen_locale';
export const interfaceLocaleCookieMaxAge = 31_536_000;

export function writeBrowserLocaleCookie(locale: Locale): void {
  document.cookie = `${interfaceLocaleCookieName}=${locale}; Path=/; Max-Age=${interfaceLocaleCookieMaxAge}; SameSite=Lax`;
}
```

- [ ] **Step 4: Write and verify the failing request-precedence test**

```ts
it('uses the explicit current-device cookie before a stale profile locale', () => {
  expect(
    resolveInterfaceLocale({ profile: 'ru', cookie: 'de', header: 'es' }),
  ).toBe('de');
});
```

Run: `npm test -- src/lib/i18n/request-locale.test.ts`

Expected: FAIL with received locale `ru`.

- [ ] **Step 5: Change only the locale precedence and make both tests green**

```ts
return (
  parseLocale(cookie) ??
  parseLocale(profile) ??
  parseAcceptLanguage(header) ??
  defaultLocale
);
```

Run: `npm test -- src/lib/i18n/browser-locale-cookie.test.ts src/lib/i18n/request-locale.test.ts src/lib/i18n/actions.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/lib/i18n/browser-locale-cookie.ts src/lib/i18n/browser-locale-cookie.test.ts src/lib/i18n/request-locale.ts src/lib/i18n/request-locale.test.ts
git commit -m "fix(den-22): prioritize immediate interface locale"
```

---

### Task 2: Panel metadata and localized copy contract

**Files:**

- Modify: `src/lib/i18n/locales.ts`
- Modify: `src/lib/i18n/locales.test.ts`
- Modify: `src/lib/i18n/messages/shared.ts`
- Modify: `src/lib/i18n/messages/shared.test.ts`
- Modify: `src/lib/i18n/locale-switcher-copy.ts`
- Create: `src/lib/i18n/locale-switcher-copy.test.ts`

**Interfaces:**

- Consumes: the five-locale `defineMessages` catalog.
- Produces: `localeMetadata[locale].englishName`; serializable `LocaleSwitcherCopy` fields `label`, `panelTitle`, `panelDescription`, `close`, `selected`, `quickSwitch`, `changedTemplate`, and `errors`.

- [ ] **Step 1: Add failing metadata and copy-contract tests**

```ts
expect(localeMetadata).toMatchObject({
  uk: { englishName: 'Ukrainian' },
  ru: { englishName: 'Russian' },
  en: { englishName: 'English' },
  es: { englishName: 'Spanish' },
  de: { englishName: 'German' },
});

for (const locale of supportedLocales) {
  expect(sharedMessages[locale].localeSwitcher).toMatchObject({
    label: expect.any(String),
    panelTitle: expect.any(String),
    panelDescription: expect.any(String),
    close: expect.any(String),
    selected: expect.any(String),
    quickSwitch: expect.any(String),
    changedTemplate: expect.stringContaining('{language}'),
  });
  expect(sharedMessages[locale].localeSwitcher).not.toHaveProperty('saving');
}
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- src/lib/i18n/locales.test.ts src/lib/i18n/messages/shared.test.ts src/lib/i18n/locale-switcher-copy.test.ts`

Expected: FAIL for missing metadata, missing panel fields, and the existing `saving` field.

- [ ] **Step 3: Add exact panel copy in all locales**

Use these semantic equivalents while retaining each language's natural register:

```ts
en: {
  panelTitle: 'Language',
  panelDescription: 'Choose your interface language',
  close: 'Close language selector',
  selected: 'Selected',
  quickSwitch: 'Quick switch',
  changedTemplate: 'Language changed to {language}',
},
ru: {
  panelTitle: 'Язык',
  panelDescription: 'Выберите язык интерфейса',
  close: 'Закрыть выбор языка',
  selected: 'Выбран',
  quickSwitch: 'Быстрое переключение',
  changedTemplate: 'Язык изменён на {language}',
},
```

Add idiomatic Ukrainian, Spanish, and German equivalents in the same typed
shape. Rename the persistence failure to mean cloud/profile synchronization;
do not claim the local language change failed.

- [ ] **Step 4: Materialize every string/function across the RSC boundary**

The materializer must copy every panel string explicitly and retain both stable
error codes. It must not return `saving` or any function-valued field. The
client replaces only the exact `{language}` token when displaying the toast.

- [ ] **Step 5: Run focused copy tests and verify GREEN**

Run: `npm test -- src/lib/i18n/locales.test.ts src/lib/i18n/messages/shared.test.ts src/lib/i18n/locale-switcher-copy.test.ts src/app/page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/lib/i18n/locales.ts src/lib/i18n/locales.test.ts src/lib/i18n/messages/shared.ts src/lib/i18n/messages/shared.test.ts src/lib/i18n/locale-switcher-copy.ts src/lib/i18n/locale-switcher-copy.test.ts
git commit -m "feat(den-22): define localized language panel copy"
```

---

### Task 3: Accessible shared language panel

**Files:**

- Create: `src/components/i18n/language-panel.tsx`
- Create: `src/components/i18n/language-panel.test.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/navigation-primitives.test.tsx`

**Interfaces:**

- Consumes: `Locale`, `localeMetadata`, `supportedLocales`, and materialized `LocaleSwitcherCopy`.
- Produces: `LanguagePanel({ copy, locale, onSelect, open, onOpenChange, trigger, variant })` with Radix-managed modal focus and radio keyboard behavior.

- [ ] **Step 1: Write failing semantic and focus tests**

```tsx
render(
  <LanguagePanel
    copy={copy}
    locale="en"
    onSelect={onSelect}
    open
    onOpenChange={onOpenChange}
    trigger={<button>English</button>}
    variant="landing"
  />,
);

expect(screen.getByRole('dialog', { name: 'Language' })).toBeVisible();
expect(screen.getAllByRole('radio')).toHaveLength(5);
expect(screen.getByRole('radio', { name: 'English English' })).toHaveAttribute(
  'aria-checked',
  'true',
);
expect(
  screen.getByRole('radio', { name: 'Українська Ukrainian' }),
).not.toHaveAccessibleName(/Selected/);
expect(screen.getByRole('radio', { name: 'English English' })).toHaveFocus();
```

- [ ] **Step 2: Add failing keyboard tests**

Test ArrowDown/ArrowUp wrapping, Home/End, Enter/Space selection, Escape close,
scrim close, Tab containment, and focus restoration. Assert `onSelect('de')`
after keyboard selection and `onOpenChange(false)` after the 210 ms selection
delay using fake timers.

Run: `npm test -- src/components/i18n/language-panel.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Expose the minimal styled Dialog primitives needed by the panel**

Add forwards for Radix portal, overlay, and content without changing existing
`DialogContent` behavior:

```tsx
export const DialogPortal = DialogPrimitive.Portal;
export const DialogOverlay = DialogPrimitive.Overlay;
export const DialogContentPrimitive = DialogPrimitive.Content;
```

Extend `navigation-primitives.test.tsx` to mount the exports and confirm title,
description, Escape handling, and focus containment remain present.

- [ ] **Step 4: Implement the panel structure and radio behavior**

Use Radix Dialog for modal semantics. Render each row from `supportedLocales`,
with the native and English names in the accessible label, and render the
selected pill only for the selected row. Use a ref per option and handle:

```ts
const nextIndex =
  event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? supportedLocales.length - 1
      : (currentIndex + delta + supportedLocales.length) %
        supportedLocales.length;
```

Do not reproduce the prototype's bug where opacity-hidden `Selected` text is
included in every radio's accessible name.

- [ ] **Step 5: Run panel and primitive tests and verify GREEN**

Run: `npm test -- src/components/i18n/language-panel.test.tsx src/components/ui/navigation-primitives.test.tsx`

Expected: PASS without act warnings or accessibility warnings.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/components/i18n/language-panel.tsx src/components/i18n/language-panel.test.tsx src/components/ui/dialog.tsx src/components/ui/navigation-primitives.test.tsx
git commit -m "feat(den-22): add accessible language panel"
```

---

### Task 4: Optimistic switcher integration, toast, and shortcut

**Files:**

- Modify: `src/components/i18n/locale-switcher.tsx`
- Modify: `src/components/i18n/locale-switcher.test.tsx`
- Modify: `src/components/app-shell/app-shell.test.tsx`

**Interfaces:**

- Consumes: `LanguagePanel`, `writeBrowserLocaleCookie`, `setInterfaceLocale`, `router.refresh()`.
- Produces: immediate local selection plus concurrent authenticated profile synchronization, a localized success toast, and visible-trigger-only `⌘/Ctrl+K` handling.

- [ ] **Step 1: Replace dropdown assumptions with failing panel tests**

Assert the trigger opens a dialog, exposes exactly five radios in canonical
order, and has no visible `Saving language…` node. Retain assertions for native
trigger labels and compact globe semantics.

- [ ] **Step 2: Add a deferred-action test that proves immediate behavior**

```tsx
let resolveAction!: (value: LocaleActionState) => void;
setInterfaceLocale.mockImplementationOnce(
  () => new Promise((resolve) => (resolveAction = resolve)),
);

await user.click(screen.getByRole('button', { name: /English/i }));
await user.click(screen.getByRole('radio', { name: 'Deutsch German' }));

expect(screen.getByRole('button', { name: /Deutsch/i })).toBeVisible();
expect(document.documentElement).toHaveAttribute('lang', 'de-DE');
expect(document.cookie).toContain('gleen_locale=de');
expect(refresh).toHaveBeenCalledTimes(1);
expect(screen.queryByText('Saving language…')).not.toBeInTheDocument();

resolveAction({ status: 'success', locale: 'de' });
```

Run: `npm test -- src/components/i18n/locale-switcher.test.tsx`

Expected: FAIL because the current switcher waits for the action before changing
the page language and refresh.

- [ ] **Step 3: Implement optimistic state before `requestSubmit`**

On valid selection, in this order:

```ts
setSelectedLocale(candidate);
document.documentElement.lang = toBcp47(candidate);
writeBrowserLocaleCookie(candidate);
router.refresh();
formRef.current?.requestSubmit(submitter);
```

Do not refresh a second time from the success effect. On action error, keep
`selectedLocale` and render only the localized synchronization error.

- [ ] **Step 4: Add and implement success toast timing**

Use fake timers to prove the toast appears only after server success, announces
the `changedTemplate` `{language}` token replaced by the native name, and
disappears after 2200 ms. A
pending message must never be mounted.

- [ ] **Step 5: Add and implement visible-trigger shortcut arbitration**

Mount desktop and compact switchers as `AppShell` does. Dispatch Meta+K and
Control+K. A switcher handles the shortcut only when:

```ts
triggerRef.current !== null && triggerRef.current.getClientRects().length > 0;
```

Assert only one dialog opens and focus reaches its selected radio.

- [ ] **Step 6: Run integration tests and verify GREEN**

Run: `npm test -- src/components/i18n/locale-switcher.test.tsx src/components/app-shell/app-shell.test.tsx src/components/auth/auth-shell.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/components/i18n/locale-switcher.tsx src/components/i18n/locale-switcher.test.tsx src/components/app-shell/app-shell.test.tsx
git commit -m "fix(den-22): switch interface locale immediately"
```

---

### Task 5: Prototype-exact responsive styling and motion

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/styles/landing-reference.css`
- Modify: `src/styles/auth-reference.css`
- Modify: `src/styles/app-shell-reference.css`
- Modify: `src/styles/landing-reference.test.ts`
- Modify: `src/styles/app-shell-reference.test.ts`
- Create: `src/styles/language-panel-reference.test.ts`

**Interfaces:**

- Consumes: `.locale-language-panel*`, `.locale-switcher*`, and `.locale-language-toast*` class names from Tasks 3–4.
- Produces: the approved 390 px desktop dialog, 12 px-gutter bottom sheet, spectral edge, staggered rows, selected-state motion, and reduced-motion override.

- [ ] **Step 1: Write failing structural CSS tests**

Read the CSS as text and assert exact prototype invariants:

```ts
expect(css).toMatch(/\.locale-language-panel\s*\{[^}]*width:\s*390px/);
expect(css).toMatch(/transform-duration|260ms/);
expect(css).toMatch(/nth-child\(5\)[^}]*210ms/);
expect(css).toMatch(/@media \(max-width:\s*980px\)/);
expect(css).toMatch(/left:\s*12px[^}]*right:\s*12px[^}]*bottom:\s*12px/s);
expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/);
```

Add context assertions that `.locale-switcher` participates in flex alignment
and that no status paragraph occupies normal flow.

- [ ] **Step 2: Run CSS tests and verify RED**

Run: `npm test -- src/styles/language-panel-reference.test.ts src/styles/landing-reference.test.ts src/styles/app-shell-reference.test.ts`

Expected: FAIL for missing panel selectors and motion timings.

- [ ] **Step 3: Port desktop geometry and motion using shared tokens**

Implement the prototype's 390 px width, 18 px radius, dark elevated surface,
spectral two-pixel edge, end-aligned measured position, 220 ms scrim, 190 ms
opacity, 260 ms spring transform, 580 ms edge growth with 90 ms delay, and five
row delays. Map colors to `--surface-*`, `--border-*`, `--artifact-*`, and
`--text-*`; retain timing constants where the prototype is authoritative.

- [ ] **Step 4: Port mobile bottom-sheet geometry**

At 980 px and below, override the measured desktop position with fixed 12 px
left/right/bottom placement, 24 px radius, viewport-safe max height, drag
indicator, contained list scrolling, and body scroll lock. At 560 px and below,
use 22 px horizontal panel padding, 78 px rows, and hide only the selected pill.

- [ ] **Step 5: Remove trigger misalignment and visible saving layout**

Make `.locale-switcher` an inline-flex aligned container. Keep error/toast UI
fixed or portaled so neither an empty node nor dynamic text changes header
height. Verify the full landing/auth/app triggers remain centered beside their
36–44 px neighbors.

- [ ] **Step 6: Add reduced-motion overrides and verify GREEN**

Ensure panel, edge, rows, radio, chevron, scrim, and toast use 0.01 ms motion
under reduced motion without hiding content.

Run: `npm test -- src/styles/language-panel-reference.test.ts src/styles/landing-reference.test.ts src/styles/app-shell-reference.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/app/globals.css src/styles/landing-reference.css src/styles/auth-reference.css src/styles/app-shell-reference.css src/styles/landing-reference.test.ts src/styles/app-shell-reference.test.ts src/styles/language-panel-reference.test.ts
git commit -m "feat(den-22): match animated language panel prototype"
```

---

### Task 6: Canonical plans and five-language editorial audit

**Files:**

- Modify: `src/data/pricing.ts`
- Modify: `src/data/pricing.test.ts`
- Modify: `src/data/marketing.ts`
- Modify: `src/data/marketing.test.ts`
- Modify: `src/lib/i18n/messages/marketing.ts`
- Modify: `src/lib/i18n/messages/marketing.test.ts`
- Modify as audit findings require: `src/lib/i18n/messages/{shared,auth,onboarding,app,history,results,billing,settings,email}.ts`
- Modify corresponding tests: `src/lib/i18n/messages/{shared,auth,onboarding,app,history,results,billing,settings,email}.test.ts`
- Create: `docs/localization/den-22-editorial-audit.md`

**Interfaces:**

- Consumes: typed locale catalogs and data-driven pricing amounts/features.
- Produces: exact plan-name tuple `['Free', 'Prism', 'Spectrum']` for every locale and a reviewed audit ledger for every catalog/locale pair.

- [ ] **Step 1: Write failing canonical plan-name tests**

```ts
for (const locale of supportedLocales) {
  const content = getMarketingContent(marketingMessages[locale], locale);
  expect(content.pricing.map(({ label }) => label)).toEqual([
    'Free',
    'Prism',
    'Spectrum',
  ]);
}
expect(marketingMessages.ru.pricing.spectrum.name).toBe('Погрузитесь глубже');
```

Also assert that CTA strings contain the exact canonical plan name and never
contain `Призма`, `Спектр`, `Prisma`, or localized equivalents.

- [ ] **Step 2: Run pricing/marketing tests and verify RED**

Run: `npm test -- src/data/pricing.test.ts src/data/marketing.test.ts src/lib/i18n/messages/marketing.test.ts`

Expected: FAIL for translated plan labels/CTAs and the Russian infinitive.

- [ ] **Step 3: Move canonical plan identity out of translated card copy**

Give each pricing record a stable canonical label and compose localized CTA
verbs around that label. Keep localized card headings/descriptions/features in
the catalog, but remove plan-name translation from those fields. Preserve the
current numeric amounts, currencies, recommendation state, and links exactly.

- [ ] **Step 4: Create and complete the editorial audit ledger**

Create a table with one row for every combination of five locales and ten
catalogs (`shared`, `marketing`, `auth`, `onboarding`, `app`, `history`,
`results`, `billing`, `settings`, `email`). Each row records:

```md
| Locale | Catalog | Status | Changed paths | Rationale |
| ru | marketing | revised | pricing.spectrum.name | imperative product voice |
```

Read every string/function leaf in each row. Mark `approved` only after checking
grammar, natural product register, terminology, interpolation order, plural
forms, and invariant brand/product names. For `revised`, list every changed
message path and the concise linguistic reason; no row may remain unreviewed.

- [ ] **Step 5: Apply the ledger's exact copy replacements catalog by catalog**

For each changed path, first add or tighten a representative native-copy test,
run that catalog test to see the old copy fail, update only the catalog string,
then rerun it. Preserve function signatures and message-path parity. Do not
change screen behavior, pricing values, limits, or generated content.

- [ ] **Step 6: Add a repository-wide invariant test**

Extend the localization inventory to serialize all five catalogs and reject
translated plan names while allowing ordinary non-plan uses of words only when
the audit ledger explicitly identifies them. Assert every audit table row is
present and has status `approved` or `revised`.

- [ ] **Step 7: Run all catalog and inventory tests**

Run: `npm test -- src/lib/i18n src/data/marketing.test.ts src/data/pricing.test.ts`

Expected: PASS with identical message shapes in all five locales.

- [ ] **Step 8: Commit Task 6**

```bash
git add src/data/pricing.ts src/data/pricing.test.ts src/data/marketing.ts src/data/marketing.test.ts src/lib/i18n/messages docs/localization/den-22-editorial-audit.md
git commit -m "fix(den-22): polish five-language product copy"
```

---

### Task 7: End-to-end panel, persistence, and visual verification

**Files:**

- Modify: `tests/e2e/localization.spec.ts`
- Modify: `tests/e2e/result-workspace.visual.spec.ts` only if an existing shared-header snapshot intentionally includes the new panel.
- Update generated snapshots only after direct comparison with `design/prototypes/gleen-language-panel-animated-v1/{desktop-open,mobile-open}.png`.

**Interfaces:**

- Consumes: complete Tasks 1–6.
- Produces: browser evidence for all entry points, responsive panel geometry, immediate selection, durable persistence, keyboard access, and reduced motion.

- [ ] **Step 1: Add a failing guest immediacy scenario**

Open the landing page, select German, and assert before waiting for a network-idle
state that the trigger reads `Deutsch`, `<html lang="de-DE">` is set, the locale
cookie is `de`, the URL is unchanged, and no visible saving message exists.

- [ ] **Step 2: Add failing authenticated persistence and route scenarios**

Using the authenticated fixture, select Spanish from the panel, clear only the
guest cookie after the server action succeeds, open a new page, and verify the
profile restores Spanish across `/app`, History, Result, and Billing. Verify the
new dialog opens from both desktop app text trigger and mobile globe trigger.

- [ ] **Step 3: Add failing keyboard and reduced-motion scenarios**

Exercise `⌘/Ctrl+K`, Arrow keys, Home/End, Space, Escape, focus restoration, and
focus containment. With reduced motion enabled, inspect computed transition and
animation duration on the panel, edge, and rows and expect an effectively zero
duration while selection still works.

- [ ] **Step 4: Run the focused E2E tests and verify RED**

Run: `PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/localization.spec.ts --project=chromium`

Expected: new panel-specific scenarios fail before the completed integration.

- [ ] **Step 5: Resolve only integration defects exposed by the browser**

Keep fixes within locale panel positioning, persistence timing, focus behavior,
translated copy overflow, or reduced-motion selectors. Add a regression test
for each defect before changing production code.

- [ ] **Step 6: Capture and compare desktop/mobile panel evidence**

Capture the open panel at 1600×900 and 390×844. Compare structure, 390 px
desktop width, mobile 12 px gutters, dark surface, spectral edge, row heights,
selected state, scrim, and sheet radius with the supplied PNGs. Check 320 px
for horizontal overflow and all five locales for clipped text.

- [ ] **Step 7: Run focused browser verification and commit**

Run: `PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/localization.spec.ts --project=chromium`

Expected: PASS.

```bash
git add tests/e2e/localization.spec.ts tests/e2e/result-workspace.visual.spec.ts tests/e2e/*-snapshots
git commit -m "test(den-22): verify animated locale panel flow"
```

---

### Task 8: Full verification and handoff

**Files:**

- Modify only files required by a failing regression, with a failing focused test added first.
- Update: `.superpowers/sdd/2026-08-03-den-22-five-language-localization/progress.md` if the ignored execution ledger is still present.

**Interfaces:**

- Consumes: completed Tasks 1–7.
- Produces: a clean, reviewed DEN-22 branch ready for integration.

- [ ] **Step 1: Run static quality gates**

```bash
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

Expected: all exit 0.

- [ ] **Step 2: Run the complete unit/integration suite**

Run: `npm test`

Expected: all test files and tests pass; known jsdom `Window.scrollTo()` notices
may appear without failures.

- [ ] **Step 3: Run the production build**

```bash
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder \
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder \
npm run build
```

Expected: compilation, strict type checking, and all static pages succeed.
Restore only generated `next-env.d.ts` noise if the build changes it.

- [ ] **Step 4: Run the complete Playwright suite**

Run: `CI=1 PLAYWRIGHT_PORT=3017 npm run test:e2e`

Expected: all configured desktop/mobile tests pass.

- [ ] **Step 5: Review React changes**

Apply the React checklist to every modified TSX file: no invalid RSC props,
unstable effect dependencies, duplicated global listeners, hidden mounted
dialogs, inaccessible names, or unnecessary client catalog serialization.

- [ ] **Step 6: Request final code review and resolve findings through TDD**

Review the complete diff from `96193a4` through HEAD against the approved spec.
For every valid finding, add a failing focused test, implement the smallest fix,
and rerun the affected and full gates.

- [ ] **Step 7: Commit final verification-only fixes if any**

Stage the exact paths changed by the review using individual `git add` commands,
then run `git diff --cached --name-only` to confirm the scope and commit with:

```bash
git commit -m "fix(den-22): address language panel review"
```

If no files changed, do not create an empty commit.

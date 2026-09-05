# DEN-119 Account Atlas Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single Settings form with a polished six-destination Account Atlas while preserving truthful account behavior and the approved account-page visuals.

**Architecture:** Add a settings-local route shell and typed view models, then implement each destination through its existing server-owned domain. Keep unsupported integrations and destructive data capabilities visibly truthful but inactive, and scope all visual interaction changes to Settings.

**Tech Stack:** Next.js App Router, React, strict TypeScript, Supabase Auth/Postgres, server actions, CSS variables, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-19-account-atlas-settings-design.md`

## Global Constraints

- Six destinations: Profile, Preferences, Language, Integrations, Security, Data.
- Desktop overview is a restrained 3×2 grid; mobile is a vertical list.
- Notifications, billing changes, new integrations, and new auth providers are out of scope.
- Unsupported or unsafe capabilities have no active button.
- Interface and generated-content languages save independently.
- Components consume typed view models; no client component queries Supabase.
- Five locales, keyboard, 200% zoom, mobile, and reduced motion are required.
- No new production dependency.

---

### Task 1: Update the isolated branch and preserve approved references

**Files:**
- Copy unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1.html`
- Copy unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1/desktop-settings.png`
- Copy unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1/mobile-settings.png`

**Interfaces:**
- Consumes: reviewed `origin/main` containing DEN-118 compatibility.
- Produces: a clean DEN-119 base and committed immutable visual references.

- [ ] Fetch `origin/main` and merge it into the existing DEN-119 branch without rewriting the user's main checkout.
- [ ] Copy only the three approved reference files from the original checkout into the identical paths in the DEN-119 worktree.
- [ ] Compare SHA-256 hashes between source and copied files; expected hashes match exactly.
- [ ] Run the full baseline test suite; expected all existing tests pass.
- [ ] Commit references as `docs(DEN-119): preserve approved account references`.

---

### Task 2: Define Settings navigation, view models, and five-locale copy

**Files:**
- Create: `src/lib/settings/account-atlas.ts`
- Create: `src/lib/settings/account-atlas.test.ts`
- Modify: `src/lib/i18n/messages/settings.ts`
- Modify: `src/lib/i18n/messages/settings.test.ts`

**Interfaces:**
- Produces: `SettingsDestinationKey`, `settingsDestinations`, `SettingsDestinationSummary`, and `SettingsOverviewModel`.
- Consumes: profile identity, onboarding preferences, and explicit capability summaries.

- [ ] **Step 1: Write failing model and localization tests**

Require exactly six stable keys and paths:

```ts
expect(settingsDestinations.map(({ key, href }) => [key, href])).toEqual([
  ['profile', '/app/settings/profile'],
  ['preferences', '/app/settings/preferences'],
  ['language', '/app/settings/language'],
  ['integrations', '/app/settings/integrations'],
  ['security', '/app/settings/security'],
  ['data', '/app/settings/data'],
]);
```

Assert each locale contains overview labels, descriptions, ready/unavailable
summaries, navigation labels, form feedback, and capability explanations.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/lib/settings/account-atlas.test.ts src/lib/i18n/messages/settings.test.ts`

Expected: missing module and message keys.

- [ ] **Step 3: Implement stable typed data**

Define destination data without hard-coded status text:

```ts
export const settingsDestinations = [
  { key: 'profile', href: '/app/settings/profile', icon: 'profile' },
  { key: 'preferences', href: '/app/settings/preferences', icon: 'sliders' },
  { key: 'language', href: '/app/settings/language', icon: 'language' },
  { key: 'integrations', href: '/app/settings/integrations', icon: 'integration' },
  { key: 'security', href: '/app/settings/security', icon: 'shield' },
  { key: 'data', href: '/app/settings/data', icon: 'database' },
] as const;
```

All visible strings come from `settingsMessages` in all five locales.

- [ ] **Step 4: Verify GREEN and commit**

Run the Task 2 focused command.

Commit: `feat(DEN-119): define account atlas destinations`

---

### Task 3: Build the Settings route shell and overview

**Files:**
- Create: `src/app/app/settings/layout.tsx`
- Create: `src/app/app/settings/layout.test.tsx`
- Create: `src/app/app/settings/page.tsx`
- Create: `src/app/app/settings/page.test.tsx`
- Create: `src/components/settings/settings-shell.tsx`
- Create: `src/components/settings/settings-shell.test.tsx`
- Create: `src/components/settings/settings-overview.tsx`
- Create: `src/components/settings/settings-overview.test.tsx`
- Create: `src/components/settings/settings-icons.tsx`

**Interfaces:**
- Consumes: `settingsDestinations`, authenticated identity, onboarding defaults, and independent domain summaries.
- Produces: Settings sub-navigation and `SettingsOverview` 3×2/list presentation.

- [ ] **Step 1: Write failing authorization/navigation tests**

Assert unauthenticated routes redirect to `/session-expired`, every card has one
whole-card link, active destination uses `aria-current="page"`, and browser URLs
remain distinct.

- [ ] **Step 2: Write failing responsive overview tests**

Render six summaries including one unavailable domain. Assert the other five
remain ready, card accessible names include title and state, and no nested
interactive element exists.

- [ ] **Step 3: Verify RED**

Run:

```bash
npx vitest run src/app/app/settings/page.test.tsx \
  src/app/app/settings/layout.test.tsx \
  src/components/settings/settings-shell.test.tsx \
  src/components/settings/settings-overview.test.tsx
```

Expected: routes and components do not exist.

- [ ] **Step 4: Implement the shell and overview**

The server page loads each summary independently with settled results. Render
unavailable copy for a failed domain rather than fabricated zeroes. The shell
uses a compact sticky sub-nav when space permits and horizontal/Back navigation
at tablet/mobile widths.

- [ ] **Step 5: Verify GREEN and commit**

Run the Task 3 focused command.

Commit: `feat(DEN-119): add account atlas overview`

---

### Task 4: Separate Profile, Preferences, and Language destinations

**Files:**
- Create: `src/app/app/settings/preferences/page.tsx`
- Create: `src/app/app/settings/preferences/page.test.tsx`
- Create: `src/app/app/settings/language/page.tsx`
- Create: `src/app/app/settings/language/page.test.tsx`
- Modify: `src/app/app/settings/profile/page.tsx`
- Modify: `src/app/app/settings/profile/page.test.tsx`
- Create: `src/components/settings/profile-settings.tsx`
- Create: `src/components/settings/profile-settings.test.tsx`
- Create: `src/components/settings/preferences-settings.tsx`
- Create: `src/components/settings/preferences-settings.test.tsx`
- Modify: `src/components/settings/language-preferences.tsx`
- Modify: `src/components/settings/language-preferences.test.tsx`
- Modify: `src/lib/settings/actions.ts`
- Modify: `src/lib/settings/actions.test.ts`

**Interfaces:**
- Produces: `setDisplayName`, `setSummaryMode`, and `setFlashcardPreset` independent actions.
- Consumes: Supabase authenticated user and onboarding repository partial updates.

- [ ] **Step 1: Write failing route/component tests**

Assert Profile renders editable display name, initials avatar, read-only email,
and verified state without an upload control. Assert Preferences saves summary
mode and flashcard count independently. Assert Language retains independent
interface/output locale actions and no blocking saving banner.

- [ ] **Step 2: Write failing action tests**

For display name, reject trimmed empty and over-100-character values, preserve
input on failure, and map raw Supabase errors to localized codes. For defaults,
assert each action sends only its owned patch:

```ts
expect(savePreferences).toHaveBeenCalledWith('user-1', { flashcardPreset: 30 });
expect(savePreferences).not.toHaveBeenCalledWith(
  'user-1',
  expect.objectContaining({ summaryPreset: expect.anything() }),
);
```

- [ ] **Step 3: Verify RED**

Run all Task 4 page, component, and action tests.

Expected: missing routes/components/action and current Profile still contains
all language/preferences forms.

- [ ] **Step 4: Implement focused server boundaries**

Use `supabase.auth.updateUser({ data: { full_name: displayName } })` only after
server validation. Use the onboarding repository's partial update for each
preference so concurrent settings are not overwritten. Move the existing
language component without changing its fast-switch semantics.

- [ ] **Step 5: Verify GREEN and commit**

Run all Task 4 focused tests.

Commit: `feat(DEN-119): add account preference destinations`

---

### Task 5: Add truthful Integrations, Security, and Data destinations

**Files:**
- Create: `src/app/app/settings/integrations/page.tsx`
- Create: `src/app/app/settings/integrations/page.test.tsx`
- Create: `src/app/app/settings/security/page.tsx`
- Create: `src/app/app/settings/security/page.test.tsx`
- Create: `src/app/app/settings/data/page.tsx`
- Create: `src/app/app/settings/data/page.test.tsx`
- Create: `src/components/settings/capability-settings.tsx`
- Create: `src/components/settings/capability-settings.test.tsx`
- Create: `src/lib/settings/capabilities.ts`
- Create: `src/lib/settings/capabilities.test.ts`

**Interfaces:**
- Produces: typed `IntegrationCapability`, `SecurityCapability`, and `DataCapability` view models.
- Consumes: authenticated identities and currently implemented export/history routes only.

- [ ] **Step 1: Write failing truthfulness tests**

Assert Notion, Obsidian, and NotebookLM never render Connect/Disconnect unless a
real capability says enabled. Assert Security derives the sign-in method from
authenticated identities and does not fabricate session counts. Assert Data
links to existing History/result export capabilities but does not render clear
history/account deletion as active before safe backend support exists.

- [ ] **Step 2: Verify RED**

Run Task 5 tests; expected missing modules/routes.

- [ ] **Step 3: Implement capability-gated pages**

Represent every action explicitly:

```ts
type CapabilityAction =
  | { kind: 'link'; href: string; label: string }
  | { kind: 'server'; label: string; action: string }
  | { kind: 'unavailable'; label: string };
```

Use only `link` for currently working routes and `unavailable` for planned
operations. Never render a disabled button that implies a working integration.

- [ ] **Step 4: Verify GREEN and commit**

Run Task 5 tests.

Commit: `feat(DEN-119): add truthful account capabilities`

---

### Task 6: Match the approved Settings visuals and interactions

**Files:**
- Modify: `src/styles/app-shell-reference.css`
- Modify: `src/styles/app-shell-reference.test.ts`
- Modify Settings components from Tasks 3–5 only where stable classes are required.

**Interfaces:**
- Consumes: existing design tokens and approved desktop/mobile screenshots.
- Produces: Settings-only grid, surfaces, controls, and interaction states.

- [ ] **Step 1: Write failing CSS contract tests**

Require 3×2 desktop cards, mobile vertical list, 44-pixel targets, token-only
colors, explicit hover/focus/pressed/disabled/pending selectors, tablet
sub-navigation, 200% wrapping, and reduced-motion removal:

```ts
expect(css).toMatch(/\.settings-atlas__grid\s*{[^}]*grid-template-columns:\s*repeat\(3,/);
expect(css).toMatch(/\.settings-destination-card:hover/);
expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.settings/);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/styles/app-shell-reference.test.ts src/components/settings`

Expected: new scoped selectors do not exist.

- [ ] **Step 3: Implement the reference-matched CSS**

Use the approved 18px surfaces, restrained neutral panels, typography hierarchy,
purple account eyebrow/icon accent, light primary save buttons, dark secondary
buttons, and one-pixel spectral hover edge. Avoid large gradients and nested
cards. Under reduced motion remove translate/animation while retaining state.

- [ ] **Step 4: Verify GREEN and commit**

Run the Task 6 focused command.

Commit: `style(DEN-119): match account atlas references`

---

### Task 7: Browser fixtures and full verification

**Files:**
- Create or modify: authenticated Settings fixture routes used by Playwright.
- Create: `tests/e2e/settings-account-atlas.spec.ts`
- Add visual snapshots only after comparison with approved references.

- [ ] Add deterministic ready/unavailable summaries and save success/failure fixtures.
- [ ] Verify all six cards and Back/Forward navigation on desktop and mobile.
- [ ] Verify independent Profile, Preferences, and Language saves without layout shift.
- [ ] Verify Integrations/Security/Data never expose dead or misleading actions.
- [ ] Verify keyboard order, visible focus, Escape where relevant, 320px width, tablet, 200% zoom, and no horizontal overflow.
- [ ] Verify reduced-motion behavior.
- [ ] Run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test`.
- [ ] Run the production build with documented non-secret fixture environment variables.
- [ ] Run affected Settings Playwright suites on desktop and mobile.
- [ ] Compare screenshots against the approved DEN-29 references and Account Atlas direction.
- [ ] Inspect `git diff --check`, worktree status, and final diff scope.
- [ ] Commit as `test(DEN-119): verify account atlas experience`.
- [ ] Push and deploy only after all gates pass.

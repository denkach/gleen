# DEN-122 Recent Analyses and History Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show persisted recent analyses on New Analysis and add a polished History menu with safe partial-artifact retry.

**Architecture:** Reuse the server-owned History read model for the three newest rows and pass a typed load state to the New Analysis presentation. Adapt the existing authenticated technical retry boundary into History actions, while retaining Radix for menu semantics and applying only scoped The Prism styles.

**Tech Stack:** Next.js App Router, React, strict TypeScript, Supabase read models, Radix Dropdown Menu, Tailwind-era CSS variables, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-05-den-122-recent-history-recovery-design.md`

## Global Constraints

- Recent History failure must never block or redirect the intake form.
- Query only rows owned by the authenticated user.
- Retry only partial analyses and reuse ready artifacts through `prepareRetry`.
- Do not create a new intake or paid reservation for retry.
- Do not modify global button/dropdown behavior or add a production dependency.
- All new copy exists in `uk`, `ru`, `en`, `es`, and `de`.

---

### Task 1: Add the Recent Analyses server read boundary

**Files:**
- Modify: `src/app/app/page.tsx`
- Modify: `src/app/app/page.test.tsx`
- Modify: `src/components/app-shell/new-analysis-home.tsx`

**Interfaces:**
- Produces: `RecentAnalysesState = { kind: 'ready'; items: readonly HistoryItem[] } | { kind: 'unavailable' }`.
- Consumes: `HistoryRepository.listOwned(userId, query, 3)` and History locale presentation.

- [ ] **Step 1: Write failing page tests**

Mock `createSupabaseHistoryRepository` and assert authenticated `/app` requests
the default newest query with limit 3. Assert a thrown history query passes
`{ kind: 'unavailable' }` while the form props are still rendered:

```ts
expect(listOwned).toHaveBeenCalledWith(
  'user-1',
  expect.objectContaining({ sort: 'newest', cursor: null }),
  3,
);
expect(screen.getByTestId('recent-state')).toHaveTextContent('ready:analysis-1');
```

Add an unauthenticated assertion that no History query runs and the state is a
ready empty list.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/app/app/page.test.tsx`

Expected: fail because `/app` never constructs a History repository or passes
recent state.

- [ ] **Step 3: Implement independent loading**

Select localized History messages, create the repository for authenticated
users, and use:

```ts
let recentAnalyses: RecentAnalysesState = { kind: 'ready', items: [] };
try {
  recentAnalyses = {
    kind: 'ready',
    items: (
      await historyRepository.listOwned(
        user.id,
        parseHistoryQuery(new URLSearchParams()),
        3,
      )
    ).items,
  };
} catch {
  recentAnalyses = { kind: 'unavailable' };
}
```

Do not include this read in a `Promise.all` whose rejection can discard active
analysis recovery.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npx vitest run src/app/app/page.test.tsx`

Commit: `fix(DEN-122): load persisted recent analyses`

---

### Task 2: Render ready, empty, and unavailable recent states

**Files:**
- Create: `src/components/app-shell/recent-analyses.tsx`
- Create: `src/components/app-shell/recent-analyses.test.tsx`
- Modify: `src/components/app-shell/new-analysis-home.tsx`
- Modify: `src/components/app-shell/new-analysis-home.test.tsx`
- Modify: `src/lib/i18n/messages/app.ts`
- Test: `src/lib/i18n/messages/app.test.ts`

**Interfaces:**
- Consumes: `RecentAnalysesState` and safe `HistoryItem` presentation fields.
- Produces: `RecentAnalyses({ state, copy })`.

- [ ] **Step 1: Write failing component tests**

Cover three states. For ready rows, assert title href, thumbnail/fallback,
channel, analyzed date, summary mode, and status are visible. For empty, retain
the current copy. For unavailable, assert a distinct localized message and the
History link remain:

```tsx
render(<RecentAnalyses state={{ kind: 'ready', items: [partialItem] }} copy={copy} />);
expect(screen.getByRole('link', { name: partialItem.title }))
  .toHaveAttribute('href', '/app/video/analysis-1');
expect(screen.getByText(partialItem.status.label)).toBeVisible();
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx vitest run src/components/app-shell/recent-analyses.test.tsx \
  src/components/app-shell/new-analysis-home.test.tsx \
  src/lib/i18n/messages/app.test.ts
```

Expected: module and localization keys are missing.

- [ ] **Step 3: Implement the typed renderer and five-locale copy**

Use `next/image` for real thumbnails and a decorative tokenized fallback. Keep
one linked title per row and preserve the panel-level History link. Add keys
equivalent to `unavailableTitle`, `unavailableDescription`, and
`thumbnailUnavailable` in all five locales; do not embed fallback English.

- [ ] **Step 4: Verify GREEN and commit**

Run the Task 2 focused command.

Commit: `feat(DEN-122): render recent analysis history`

---

### Task 3: Polish New Analysis controls without global changes

**Files:**
- Modify: `src/components/app-shell/new-analysis-form.tsx`
- Modify: `src/components/app-shell/new-analysis-form.test.tsx`
- Modify: `src/styles/app-shell-reference.css`
- Modify: `src/styles/app-shell-reference.test.ts`

**Interfaces:**
- Consumes: existing `btn`, `advanced-link`, duplicate, recovery, and panel selectors.
- Produces: New Analysis-scoped hover, focus, pressed, disabled, and reduced-motion contracts.

- [ ] **Step 1: Write failing structural/style tests**

Require explicit scoped selectors for submit, secondary actions, recent rows,
and reduced motion. Assert the production form uses stable modifier classes
instead of unstyled bare buttons:

```ts
expect(css).toMatch(/\.analysis-hero \.btn:not\(:disabled\):hover/);
expect(css).toMatch(/\.recent-analysis-row:hover/);
expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.analysis-hero \.btn/);
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx vitest run src/components/app-shell/new-analysis-form.test.tsx \
  src/styles/app-shell-reference.test.ts
```

Expected: missing scoped interaction rules and stable classes.

- [ ] **Step 3: Implement scoped Prism states**

Add class modifiers to currently bare dialog/recovery buttons. In the app CSS,
use existing semantic tokens for light primary, dark secondary, a one-pixel
spectral hover edge, cyan focus, disabled opacity, and at most `translateY(1px)`
on active. Under reduced motion, set transition/transform to none for these
selectors.

- [ ] **Step 4: Verify GREEN and commit**

Run the Task 3 focused command.

Commit: `style(DEN-122): refine new analysis interactions`

---

### Task 4: Add an authenticated partial retry action

**Files:**
- Modify: `src/lib/history/actions.ts`
- Modify: `src/lib/history/actions.test.ts`
- Modify: `src/app/app/history/page.tsx`

**Interfaces:**
- Produces: `retryPartialHistoryAnalysis(input: unknown): Promise<HistoryActionResult<{ attempt: number }>>`.
- Consumes: the existing `retryAnalysis(FormData)` boundary, whose repository `prepareRetry` verifies ownership and eligibility.

- [ ] **Step 1: Write failing server-action tests**

Extend `HistoryAuthenticatedContext` test dependencies with:

```ts
retryPartialAnalysis(analysisId: string): Promise<
  | { ok: true; attempt: number }
  | { ok: false; error: 'retry_failed' }
>;
```

Assert invalid ids and unauthenticated calls fail, eligible calls forward the
owned id once, success returns the attempt, and a rejected/ineligible retry maps
to generic `failed`.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/lib/history/actions.test.ts`

Expected: missing action and dependency.

- [ ] **Step 3: Implement the adapter**

Validate with `analysisIdentitySchema`, authenticate, call the injected retry,
and revalidate both `/app/history` and `/app`. In production, create a FormData
with `analysisId` and call `retryAnalysis`; never call `reanalyzeIntake`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npx vitest run src/lib/history/actions.test.ts src/lib/analysis-pipeline/retry-actions.test.ts`

Commit: `feat(DEN-122): retry partial history artifacts`

---

### Task 5: Refine the History menu and wire retry

**Files:**
- Create: `src/components/history/history-action-icons.tsx`
- Create: `src/components/history/history-action-icons.test.tsx`
- Modify: `src/components/history/history-item-actions.tsx`
- Modify: `src/components/history/history-item-actions.test.tsx`
- Modify: `src/components/history/history-list.tsx`
- Modify: `src/components/history/history-workspace.tsx`
- Modify: `src/lib/i18n/messages/history.ts`
- Modify: `src/lib/i18n/messages/history.test.ts`
- Modify: `src/styles/history-reference.css`
- Modify: `src/styles/history-reference.test.ts`

**Interfaces:**
- Consumes: `retryPartialHistoryAnalysis` through the existing action prop chain.
- Produces: pending-safe retry interaction and scoped menu presentation.

- [ ] **Step 1: Write failing behavior tests**

Assert partial items show the localized retry action; ready, processing, and
failed items do not. Click twice while a deferred promise is pending and assert
one server call. Resolve success and assert `router.push('/app?analysis=...')`;
reject and assert the localized announcement with the item still present.

- [ ] **Step 2: Write failing menu/style tests**

Require line icons, action grouping, 44-pixel touch targets, highlighted
spectral edge, open trigger state, danger treatment, and reduced-motion removal.
Keep Radix roles and keyboard behavior rather than reimplementing a menu.

- [ ] **Step 3: Verify RED**

Run:

```bash
npx vitest run src/components/history/history-item-actions.test.tsx \
  src/components/history/history-action-icons.test.tsx \
  src/lib/i18n/messages/history.test.ts \
  src/styles/history-reference.test.ts
```

Expected: missing retry action, icons, copy, and style contracts.

- [ ] **Step 4: Implement behavior and presentation**

Use `useRouter`, one `retryPending` guard, and `onAnnouncement`. Add icons with
`aria-hidden="true"`; the item text remains the accessible label. Place retry
after Open in the first group, organize Rename/Export next, and keep Delete
after a separator. Apply styles only below `.history-item-actions__menu`.

- [ ] **Step 5: Verify GREEN and commit**

Run the Task 5 focused command plus:

```bash
npx vitest run src/components/history src/app/app/history/page.test.tsx
```

Commit: `feat(DEN-122): refine history recovery menu`

---

### Task 6: Browser fixture and full verification

**Files:**
- Modify: `src/components/app-shell/fixture-history.tsx`
- Modify: `tests/e2e/intake.spec.ts`
- Modify: `tests/e2e/history.spec.ts`
- Modify visual snapshots only after browser comparison proves the intended scoped pixel change.

- [ ] Add deterministic recent ready/partial rows to the authenticated intake fixture.
- [ ] Add a deterministic partial retry action to the History fixture.
- [ ] Verify recent rows persist after reload and link to the expected destinations.
- [ ] Verify the menu with mouse, keyboard, Escape, mobile touch, and one pending retry.
- [ ] Verify 320px/mobile and desktop layouts have no horizontal overflow.
- [ ] Verify reduced motion removes non-essential transforms/animation.
- [ ] Run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test`.
- [ ] Run the production build with documented non-secret fixture environment variables.
- [ ] Run affected intake/history Playwright suites on desktop and mobile.
- [ ] Inspect `git diff --check`, worktree status, and final diff scope.
- [ ] Commit as `test(DEN-122): verify recent history recovery flow`.
- [ ] Push and deploy only after all gates pass.

# DEN-19 History Toolbar Icon Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the clipped and approximate History toolbar symbols with exact, centered SVG icons matching the approved desktop and mobile references.

**Architecture:** Define four dependency-free decorative SVG components in one focused History icon module, render them inside the existing controls, and remove the obsolete CSS pseudo-icon approximations. Component and CSS contract tests protect accessible names and the shared icon box; forced visual-baseline refresh plus live browser inspection proves the pixel-level correction.

**Tech Stack:** Next.js App Router, React, TypeScript strict mode, CSS variables, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve the existing toolbar structure, control dimensions, spacing, colors, states, and accessible labels.
- Do not add an icon dependency.
- Every SVG uses an `18px × 18px` shared box with `display: block` and `flex: 0 0 auto`.
- Every SVG uses `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth="1.5"`, `strokeLinecap="round"`, and `strokeLinejoin="round"`.
- Every SVG is decorative with `aria-hidden="true"` and `focusable="false"`.
- Keep Grid disabled and List active.
- Apply the correction across desktop, tablet, and mobile breakpoints.
- Do not modify unrelated files or behavior.

---

### Task 1: Render exact History toolbar SVG icons

**Files:**

- Create: `src/components/history/history-toolbar-icons.tsx`
- Modify: `src/components/history/history-toolbar.tsx`
- Modify: `src/components/history/history-filters.tsx`
- Modify: `src/components/history/history-toolbar.test.tsx`
- Modify: `src/components/history/history-filters.test.tsx`
- Modify: `src/styles/history-reference.css`
- Modify: `src/styles/history-reference.test.ts`
- Test: `tests/e2e/history.visual.spec.ts`
- Update only if toolbar pixels changed: `tests/e2e/history.visual.spec.ts-snapshots/*.png`

**Interfaces:**

- Produces:
  - `HistoryFilterIcon(): React.JSX.Element`
  - `HistorySortIcon(): React.JSX.Element`
  - `HistoryListIcon(): React.JSX.Element`
  - `HistoryGridIcon(): React.JSX.Element`
- Consumes: existing filter, sort, list, and grid buttons without changing their accessible names or behavior.

- [ ] **Step 1: Write failing component and CSS contract tests**

In `src/components/history/history-toolbar.test.tsx`, extend the stable-hook test:

```ts
const sortIcon = sort.querySelector('.history-control-icon--sort');
expect(sortIcon).toHaveAttribute('aria-hidden', 'true');
expect(sortIcon).toHaveAttribute('focusable', 'false');
expect(sortIcon).toHaveAttribute('viewBox', '0 0 24 24');

const list = screen.getByRole('button', { name: 'List view' });
expect(list.querySelector('.history-control-icon--list')).toBeInTheDocument();

const grid = screen.getByRole('button', { name: 'Grid view unavailable' });
expect(grid.querySelector('.history-control-icon--grid')).toBeInTheDocument();
```

In `src/components/history/history-filters.test.tsx`, extend the desktop trigger test:

```ts
const filterIcon = trigger.querySelector('.history-control-icon--filter');
expect(filterIcon).toHaveAttribute('aria-hidden', 'true');
expect(filterIcon).toHaveAttribute('focusable', 'false');
expect(filterIcon).toHaveAttribute('viewBox', '0 0 24 24');
```

Replace the no-op pseudo-icon test in `src/styles/history-reference.test.ts` with:

```ts
it('uses one fixed box for every exact toolbar SVG icon', () => {
  expect(css).toMatch(
    /\.history-control-icon\s*{[^}]*width:\s*18px;[^}]*height:\s*18px;[^}]*display:\s*block;[^}]*flex:\s*0 0 auto;/,
  );
  expect(css).not.toContain('.history-filters__trigger::before');
  expect(css).not.toContain('.history-toolbar__sort::after');
  expect(css).not.toContain('.history-toolbar__view-button::before');
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx vitest run src/styles/history-reference.test.ts src/components/history/history-toolbar.test.tsx src/components/history/history-filters.test.tsx
```

Expected: FAIL because the SVG icons and `.history-control-icon` rule do not exist and the obsolete pseudo-icon selectors remain.

- [ ] **Step 3: Create the exact local icon module**

Create `src/components/history/history-toolbar-icons.tsx`:

```tsx
import type { ReactNode } from 'react';

type HistoryToolbarIconProps = Readonly<{
  name: string;
  children: ReactNode;
}>;

function HistoryToolbarIcon({ name, children }: HistoryToolbarIconProps) {
  return (
    <svg
      className={`history-control-icon history-control-icon--${name}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function HistoryFilterIcon() {
  return (
    <HistoryToolbarIcon name="filter">
      <path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
    </HistoryToolbarIcon>
  );
}

export function HistorySortIcon() {
  return (
    <HistoryToolbarIcon name="sort">
      <path d="m8 10 4 4 4-4" />
    </HistoryToolbarIcon>
  );
}

export function HistoryListIcon() {
  return (
    <HistoryToolbarIcon name="list">
      <path d="M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12" />
    </HistoryToolbarIcon>
  );
}

export function HistoryGridIcon() {
  return (
    <HistoryToolbarIcon name="grid">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </HistoryToolbarIcon>
  );
}
```

- [ ] **Step 4: Render the SVG icons in the existing controls**

In `src/components/history/history-filters.tsx`, import `HistoryFilterIcon` and render it as the first child of `FilterTrigger`:

```tsx
<button className="history-filters__trigger">
  <HistoryFilterIcon />
  {mobile ? 'Filter' : 'Filters'}
</button>
```

In `src/components/history/history-toolbar.tsx`, import the remaining icons and render:

```tsx
<span className="history-toolbar__sort-label">Sort: {currentSort}</span>
<HistorySortIcon />
```

```tsx
<button className="history-toolbar__view-button">
  <HistoryListIcon />
  List
</button>
```

```tsx
<button className="history-toolbar__view-button">
  <HistoryGridIcon />
  Grid
</button>
```

- [ ] **Step 5: Replace obsolete pseudo-icon CSS with the shared SVG box**

Delete the complete rules for:

```css
.history-filters__trigger::before
.history-toolbar__sort::after
.history-toolbar__view-button::before
.history-toolbar__view-button:first-child::before
.history-toolbar__view-button:last-child::before
```

Add:

```css
.history-control-icon {
  width: 18px;
  height: 18px;
  display: block;
  flex: 0 0 auto;
  overflow: visible;
}
```

Do not change button dimensions, padding, gaps, states, or colors.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/styles/history-reference.test.ts src/components/history/history-toolbar.test.tsx src/components/history/history-filters.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 7: Run full static and unit verification**

Run:

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
git diff --check
```

Expected: every command exits with code 0; all Vitest files pass.

- [ ] **Step 8: Force-refresh and inspect History visual baselines**

Run with localhost permission:

```bash
PLAYWRIGHT_PORT=3146 npx playwright test tests/e2e/history.visual.spec.ts \
  --project=chromium --project=mobile-chrome --workers=1 \
  --update-snapshots=all
```

For every changed PNG, compare it with the committed predecessor. Keep a snapshot only when its changed-pixel bounds include the History toolbar icon region. Restore snapshot changes caused solely by font loading, dialog overlays, sheet animation, or other unrelated pixels.

Then run without update mode:

```bash
PLAYWRIGHT_PORT=3146 npx playwright test tests/e2e/history.visual.spec.ts \
  --project=chromium --project=mobile-chrome --workers=1
```

Expected: 17/17 pass.

- [ ] **Step 9: Verify the live fixture**

Start the fixture server:

```bash
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3147 \
NEXT_PUBLIC_SUPABASE_URL=https://ci.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-publishable-key \
npm run dev -- --hostname 127.0.0.1 --port 3147
```

Open `/app-shell-fixture/history?visualCase=default` at 1680×900 and 430×932. Confirm:

- Filters renders a complete outlined funnel;
- List has three bullets and three centered lines;
- Grid has four centered outlined cells;
- Sort has a centered symmetric chevron;
- no horizontal overflow or Next.js error overlay is present.

Capture screenshots, stop the server, and restore `next-env.d.ts` if Next.js changed it.

- [ ] **Step 10: Commit**

```bash
git add \
  src/components/history/history-toolbar-icons.tsx \
  src/components/history/history-toolbar.tsx \
  src/components/history/history-filters.tsx \
  src/components/history/history-toolbar.test.tsx \
  src/components/history/history-filters.test.tsx \
  src/styles/history-reference.css \
  src/styles/history-reference.test.ts \
  tests/e2e/history.visual.spec.ts-snapshots
git commit -m "fix(den-19): render exact history toolbar icons"
```

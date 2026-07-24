# DEN-19 Task 9 report

## Status

Implemented the reference-driven History CSS contract and stable structural
hooks in `/Users/niga/Downloads/gleen/.worktrees/den-19-history`.

- Added `src/styles/history-reference.css` and imported it immediately after
  the app-shell reference stylesheet.
- Matched the existing `1320px`, `980px`, and `720px` app-shell geometry rather
  than introducing competing layout breakpoints.
- Added stable hooks for the workspace, bottom-navigation clearance, toolbar,
  search, sort, view controls, desktop table mode, mobile card mode, anchored
  filter panel, mobile filter sheet, status tones, and live announcer.
- Reserved token-driven heading/action and verified-duplicate banner selectors
  for Task 10 without adding or changing copy, behavior, props, or state
  contracts in Task 9.
- Used only existing semantic color and typography tokens. Ready uses Export
  lime, Processing uses Timestamps cyan, Failed uses Danger, and Partial uses
  Summary amber.
- Added restrained functional transitions and removed History surface/row/card
  motion under `prefers-reduced-motion`.
- Kept controls at a minimum 44px target where applicable and added a narrow
  `360px` compression so the `320px` endpoint has no fixed-width child forcing
  horizontal overflow.
- Positioned the mobile filter sheet above the fixed 67px bottom navigation
  and safe area, with bounded scrolling for enlarged text/zoom.

## TDD evidence

### RED

Command:

```text
npm test -- src/components/history
```

Result:

```text
Test Files  4 failed | 1 passed (5)
Tests       5 failed | 36 passed (41)
```

All five failures were the expected missing structural hooks:

- workspace and bottom-navigation clearance;
- toolbar/search/sort/view modes;
- desktop panel and mobile sheet aliases;
- desktop table and mobile card presentation aliases.

### GREEN

Command:

```text
npm test -- src/components/history
```

Result:

```text
Test Files  5 passed (5)
Tests       41 passed (41)
```

## Verification

- `npm test -- src/components/history`: passed, 5 files / 41 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- Production build with the repository's documented non-secret public
  placeholders: passed, including compilation, TypeScript, and 23/23 static
  pages.

Build command:

```text
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
npm run build
```

The generated `next-env.d.ts` change was restored and is not part of the task.

## React best-practices self-review

- No component boundaries, hook order, dependency arrays, or state ownership
  changed.
- Existing native form, button, table, article, and link semantics remain
  intact.
- Search retains an accessible label while the visible geometry is now
  reference-driven.
- Existing desktop/mobile `aria-hidden` plus `inert` behavior remains
  unchanged; CSS independently selects the visual presentation at `720px`.
- Existing Radix DropdownMenu and Dialog primitives continue to own keyboard,
  focus restoration, portal, and modal semantics.
- No new inline object props, list keys, dependencies, images, or client
  boundaries were introduced.

## Files changed

- `src/styles/history-reference.css`
- `src/app/layout.tsx`
- `src/components/history/history-workspace.tsx`
- `src/components/history/history-workspace.test.tsx`
- `src/components/history/history-toolbar.tsx`
- `src/components/history/history-toolbar.test.tsx`
- `src/components/history/history-filters.tsx`
- `src/components/history/history-filters.test.tsx`
- `src/components/history/history-list.tsx`
- `src/components/history/history-list.test.tsx`

`src/components/history/history-item-actions.tsx` required no new structural
hook: its stable favorite, trigger, menu, dialog, delete, and dialog-action
classes already covered the Task 9 styling contract.

## Remaining concerns

- Exact visual browser parity is not claimed. Task 10 has not yet mounted the
  production workspace hierarchy and verified duplicate banner, and Task 11
  has not yet supplied deterministic approved rows/overlay fixture states.
- Tasks 11/12 must render, measure, snapshot, and tune the approved desktop,
  `980px`, `430px`, `390px`, and `320px` endpoints, including 200% zoom and
  reduced-motion browser checks.
- The mobile sheet content is layered above its overlay while its bottom edge
  stops above the app navigation; the navigation remains visually present as
  approved. Task 12 should confirm browser-specific portal stacking and
  outside-pointer dismissal against the deterministic fixture.

## Blocking review follow-up

The Task 9 review identified six CSS/accessibility contract gaps. This
follow-up supersedes the earlier self-review statement that both responsive
list trees remain mounted: `HistoryList` now mounts only the active desktop or
mobile presentation.

### Review RED

Added component and CSS contract regressions for:

- the exact visible search placeholder;
- a bounded sort-label span at the `320px` endpoint;
- one active list tree at desktop/mobile, viewport replacement, and
  `matchMedia` listener cleanup;
- tokenized keyboard focus on status options;
- two-line desktop title clamping at all desktop widths;
- complete reduced-motion removal for History Dialog and DropdownMenu portal
  surfaces.

Command:

```text
npm test -- src/components/history src/styles/history-reference.test.ts
```

Result:

```text
Test Files  4 failed | 2 passed (6)
Tests       12 failed | 33 passed (45)
```

The failures were the expected missing placeholder/span, dual mounted list
trees, missing CSS focus/clamp/portal-motion contracts, plus duplicate text
counts caused by the two list trees.

### Review GREEN

- Added `Search by title, channel, URL, or keyword` as the visible input
  placeholder while retaining the accessible `Search history` label.
- Wrapped sort copy in `.history-toolbar__sort-label` and constrained it with
  `min-width: 0`, overflow, and ellipsis.
- Changed `HistoryList` to render one active table/card presentation using its
  existing hydration-safe `matchMedia` hook.
- Added a visible tokenized `:focus-visible` treatment to status-option labels.
- Moved the two-line desktop title clamp into the base desktop contract.
- Disabled animation and transition entirely for History-owned portaled Dialog
  overlay/content and DropdownMenu content under reduced motion.

Command:

```text
npm test -- src/components/history src/styles/history-reference.test.ts
```

Result:

```text
Test Files  6 passed (6)
Tests       45 passed (45)
```

Fresh review verification:

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed.

React checklist review:

- the responsive hook remains unconditional and its listener cleanup is now
  directly tested;
- only the selected presentation creates links, buttons, menus, and dialogs;
- shared item and pagination state remains above the presentation branch;
- no effect dependency, key, state contract, or component API changed;
- semantic table/article and accessible control labels remain intact.

Heading/action/banner markup and its structural component assertion remain
pending Task 10 review integration, where that authenticated hierarchy is
created. Task 9 does not invent production header behavior.

Remaining review concern: the hydration-safe initial state is desktop. At a
mobile viewport, CSS hides that initial desktop tree until the media-query
effect replaces it with cards. Task 12 must check whether this produces a
perceptible narrow-screen blank flash in the deterministic browser fixture.

# DEN-19 Task 7 Report

## Status

Implemented Task 7 and resolved the blocking Task 6 filter-composition
finding.

## Task 6 composition correction

- Removed the public `HistoryWorkspaceProps.renderFilters` function prop and
  the exported callback-based `HistoryFilterControlsProps` API.
- `HistoryWorkspace` now directly composes `HistoryFilters` inside its existing
  client boundary.
- `HistoryToolbar` accepts one required `filterControl: ReactNode`; it no
  longer renders or controls a second unconditional Filters trigger.
- The regression test proves the toolbar renders exactly the supplied filter
  trigger, while workspace tests exercise the real filter UI instead of an
  injected test renderer.
- Preserved Task 6 URL behavior: drafts do not navigate, Apply clears the
  cursor and serializes the draft, Reset is draft-only, Clear all preserves
  valid search/sort, Back/Forward query props resynchronize state, and the
  disabled grid control never navigates.
- The trigger badge retains the applied-filter count while the Apply action
  reflects the current draft count.

## Task 7 implementation

- Added a desktop anchored filter region with labelled controls, an
  `aria-expanded`/`aria-controls` trigger, Escape and outside-pointer
  dismissal, and trigger-focus restoration.
- Added a mobile Radix Dialog bottom sheet with the `Filters` title, drag
  affordance, Reset, an applied-count note, Dialog dismissal/focus behavior,
  and stable semantic class names for Task 9 styling.
- Desktop and mobile share one field implementation:
  - exactly Ready, Processing, and Failed status choices;
  - data-driven Language and Source selects;
  - Date range;
  - Favorites only;
  - Reset, desktop Clear all, and `Apply filters (n)`.
- Only the active responsive presentation mounts. This avoids a controlled
  Radix modal hiding or trapping focus away from the simultaneously open
  desktop panel. The breakpoint is the existing app mobile boundary,
  `(max-width: 720px)`.
- Unapplied drafts persist across dismissal and reopening.

## TDD evidence

Initial RED:

```text
npm test -- src/components/history/history-toolbar.test.tsx \
  src/components/history/history-workspace.test.tsx \
  src/components/history/history-filters.test.tsx

FAIL history-filters.test.tsx:
  Failed to resolve import "./history-filters"
FAIL history-toolbar.test.tsx:
  supplied control was not the rendered Filters trigger
FAIL history-workspace.test.tsx:
  aria-expanded became true but no "Filter results" region existed
```

Applied-versus-draft regression RED:

```text
npm test -- src/components/history/history-filters.test.tsx

FAIL updates a persistent unapplied draft...
Expected accessible name: Filters, 3 applied
Received: Filters, 5 applied
```

Final GREEN:

```text
npm test -- src/components/history/history-toolbar.test.tsx \
  src/components/history/history-workspace.test.tsx \
  src/components/history/history-filters.test.tsx

Test Files  3 passed (3)
Tests       12 passed (12)
```

## Verification

- Focused Task 6 + 7 tests: PASS, 12/12.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run format:check`: PASS after restoring the unrelated generated
  `next-env.d.ts` build change.
- `git diff --check`: PASS.
- Production build with the documented `.env.example` public placeholders:
  PASS; compilation, TypeScript, page-data collection, and 23/23 static pages
  completed.

The first build invocation without environment values stopped at the expected
repository configuration gate:

```text
Error: NEXT_PUBLIC_SUPABASE_URL is required
```

No credentials or `.env` files were created or committed.

## Changed files

- `src/components/history/history-filters.tsx`
- `src/components/history/history-filters.test.tsx`
- `src/components/history/history-toolbar.tsx`
- `src/components/history/history-toolbar.test.tsx`
- `src/components/history/history-workspace.tsx`
- `src/components/history/history-workspace.test.tsx`
- `.superpowers/sdd/den19-task-7-report.md`

## Remaining concerns

- Task 9 still owns final CSS geometry, visibility polish, motion/reduced-motion
  styling, z-index coordination with bottom navigation, and visual reference
  matching.
- The hydration-safe responsive hook initially renders the desktop control and
  switches to mobile after its media-query effect. This avoids a hydration
  mismatch and matches the established repository pattern, but Task 9/browser
  verification should check for any perceptible narrow-screen flash.
- Browser/visual verification is deferred until the history page, list, and
  Task 9 reference CSS compose these controls into the runnable route.

## Blocking review follow-up

The Task 7 review found that the local `HistoryFilters` applied-count state
incorrectly promoted a draft as soon as Apply or Clear all invoked navigation.
That made the trigger and mobile applied note claim the URL was updated before
new query props arrived.

### Follow-up RED

Added regressions that deliberately keep query/applied props unchanged after
`router.push`, `onApply`, and `onClearAll`:

```text
npm test -- src/components/history/history-toolbar.test.tsx \
  src/components/history/history-workspace.test.tsx \
  src/components/history/history-filters.test.tsx

Test Files  2 failed | 1 passed (3)
Tests       4 failed | 12 passed (16)

Expected: Filters, 5 applied
Received: Filters, 2 applied

Expected: Filters, 5 applied
Received: Filters, none applied

Expected mobile note: 3 filters applied
Received: 4 filters applied
```

### Follow-up fix

- Made `HistoryFilters.appliedCount` required.
- `HistoryWorkspace` derives that value exclusively from the current validated
  `query` prop.
- Removed `HistoryFilters` local applied-count state and the Apply/Clear-all
  promotion wrappers.
- The trigger and mobile applied note now remain committed until query props
  update; `Apply filters (n)` remains draft-derived.

Expanded mobile coverage verifies:

- Reset and all shared status/language/source/date/favorite controls;
- Escape dismissal and trigger-focus restoration;
- only one desktop/mobile surface mounted at a time;
- no duplicate element IDs;
- active-surface replacement on viewport changes;
- `matchMedia` change-listener cleanup on unmount.

### Follow-up GREEN

```text
npm test -- src/components/history/history-toolbar.test.tsx \
  src/components/history/history-workspace.test.tsx \
  src/components/history/history-filters.test.tsx

Test Files  3 passed (3)
Tests       16 passed (16)
```

Follow-up verification:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run format:check`: PASS.
- `git diff --check`: PASS.

Follow-up files:

- `src/components/history/history-filters.tsx`
- `src/components/history/history-filters.test.tsx`
- `src/components/history/history-workspace.tsx`
- `src/components/history/history-workspace.test.tsx`
- `.superpowers/sdd/den19-task-7-report.md`

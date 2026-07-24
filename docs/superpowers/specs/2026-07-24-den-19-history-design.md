# DEN-19 History, Search, and Saved-Result Reuse Design

**Linear issue:** DEN-19 — GLE-009  
**Status:** Approved on 2026-07-24  
**Primary desktop reference:** `/Users/niga/Downloads/50514a13-89c0-478e-87d9-b224724c22d7.png`  
**Primary mobile reference:** `/Users/niga/Downloads/2d35308a-ff1b-4b84-9b15-b7bcea9f8623.png`

## Goal

Build the authenticated History experience so owners can find, reopen, and
manage prior analyses without repeating work or spending credits again. The
rendered desktop and mobile layouts must match the approved references
one-to-one while preserving Gleen's dark-only Quiet Luxury + Prism language.

## Source-of-truth order

1. The two approved desktop and mobile reference images listed above define
   DEN-19 geometry, hierarchy, density, typography, controls, and responsive
   composition.
2. `docs/product.md`, the DEN-19 Linear issue, and this specification define
   behavior and states not visible in a static image.
3. `docs/design-system.md` defines shared tokens and accessibility rules.
4. Existing app-shell and result-workspace components define implementation
   conventions where they do not conflict with the approved references.

`/Users/niga/Downloads/gleen-motion-prototype-v2/history.html` is superseded by
the new references for DEN-19 layout. It may be consulted for compatible icons
or shared token intent, but it must not override the new composition.

## Scope

DEN-19 includes:

- owner-only history retrieval;
- search by title, channel, source URL, keyword, or result title;
- filters for status, language, source, date range, and favorites;
- newest, oldest, recently opened, A–Z, and Z–A sorting;
- persistent Favorite;
- open/continue, rename, export, and delete actions;
- ready, processing, failed, and partial states;
- duplicate-result reuse without credit consumption;
- distinct empty, search-empty, and filtered-empty states;
- cursor pagination for histories longer than one page;
- desktop/tablet list presentation and compact mobile cards;
- keyboard, touch, reduced-motion, and 200% zoom support.

The list/grid control is present because it is part of the approved
composition. List is selected. Grid is non-interactive and exposes
`aria-disabled="true"` in DEN-19. Interactive grid view is tracked separately
in Linear DEN-28.

Billing, plan values, usage limits, and dates remain data-driven. DEN-19 does
not introduce or hard-code plan policy.

## Visual contract

### Desktop

The existing authenticated shell remains intact. History renders beside the
fixed sidebar and below the utility actions.

The content hierarchy is:

1. `History` title and saved-result reassurance copy;
2. right-aligned spectral-outline `New analysis` action;
3. conditional duplicate-result banner;
4. search field;
5. Filters, Sort, and list/grid controls;
6. bordered history table.

The desktop table uses the approved columns:

- Video;
- Details;
- Status;
- Actions.

Each row contains a real source thumbnail with play overlay and duration,
title, channel identity, language, video duration, analyzed date/time, a
truthful status badge, Favorite, and the overflow menu.

The filter popover anchors beneath Filters. The sort menu anchors beneath the
sort control. Their placement, surface treatment, borders, spacing, and
selected states match the desktop reference. Only one dismissible overlay
needs to be active during normal use; visual fixtures may render each approved
open state independently.

### Mobile

At the mobile app breakpoint the sidebar and desktop top bar are replaced by
the approved compact header and fixed bottom navigation.

The content order is:

1. eyebrow, title, and reassurance copy;
2. full-width `New analysis`;
3. conditional vertical duplicate-result banner;
4. full-width search;
5. Filters, Sort, and list/grid controls;
6. compact history cards.

Cards preserve the approved thumbnail, duration, truncated title, channel,
language, analyzed time, status, Favorite, and overflow action positions.
Mobile must never require horizontal scrolling.

Filters open as the approved bottom sheet. It includes a drag affordance,
title, Reset, status choices, Language, Source, Date range, Favorites-only
toggle, the spectral `Apply filters (n)` action, and the applied-count note.
The fixed app bottom navigation remains visible beneath the sheet exactly as
shown by the reference.

### Responsive behavior

- Desktop uses the table layout.
- Intermediate widths progressively compress the desktop grid without
  inventing a new composition.
- Mobile uses cards and the bottom filter sheet.
- The approved reference images define the target desktop and mobile
  endpoints; intermediate widths interpolate using shared tokens.
- Text truncates where the reference truncates. Controls and status remain
  available at 200% zoom.

## Duplicate-result banner

The duplicate banner is absent during ordinary History navigation. It appears
only after the server confirms an owned, reusable result for a detected
canonical duplicate.

Untrusted URL state cannot activate the banner by itself. The server resolves
the candidate against the authenticated owner before rendering:

- `Open saved result` opens the confirmed owned result without charging usage;
- `Analyze another version` returns to analysis configuration with the source
  identity and permitted alternate-version context;
- stale, deleted, foreign, or non-reusable candidates render no banner.

The desktop button order follows the approved desktop reference. Mobile uses
the approved stacked content and action order.

## Architecture

### Server boundary

`/app/history` remains an authenticated Server Component. It:

1. resolves the current user;
2. parses and validates URL search/filter/sort/cursor inputs;
3. verifies optional duplicate context;
4. performs an ownership-filtered history query;
5. maps database rows into a closed History view model;
6. renders the interactive History workspace with safe initial state.

Server-only database credentials and ownership checks never enter Client
Components.

### Client boundary

A focused `HistoryWorkspace` owns:

- search submission and keyboard shortcut;
- filter draft state and apply/reset behavior;
- sort selection;
- desktop popover and mobile sheet state;
- Favorite optimistic state;
- overflow menus and rename/delete dialogs;
- accessible action announcements.

Desktop table rows and mobile cards consume the same view model and action
contracts. They are separate responsive presentations rather than one DOM
tree forced into both geometries.

### URL state

Applied query state is represented in the URL so refresh and Back/Forward
preserve the result set:

- `q`;
- repeated or encoded `status`;
- `language`;
- `source`;
- `date`;
- `favorite`;
- `sort`;
- `cursor`.

Draft filter changes do not update results until Apply. Reset/Clear all
removes filter parameters while preserving valid search and sort state.
Changing search, filters, or sort clears the cursor.

## Data model and query behavior

The History read model combines owned intake, source metadata, durable job
state, result presentation metadata, and owner result state. It exposes only
fields required by the UI:

- analysis identifier and destination;
- source identifier and canonical URL;
- display/result title;
- channel/source display name;
- thumbnail;
- source language and duration;
- analyzed and last-opened timestamps;
- status;
- available artifacts;
- favorite;
- export eligibility.

Search is case-insensitive and owner-scoped. Filtering and sorting occur in
the repository/database query rather than over only the first client page.
Cursor pagination uses a deterministic secondary identifier to prevent
duplicates or omissions when primary sort values match.

The approved fixture contains six rows and therefore renders no pagination
control. When another page exists, a restrained `Load more` action appears
after the list. Loading another page appends results without resetting query
state or scroll position.

## Status presentation

- Ready uses the approved lime dot and badge.
- Processing uses the approved blue/cyan dot and badge.
- Failed uses the approved red dot and badge.
- Partial uses an amber dot and badge because it is a truthful required state
  not pictured in the static reference.

Processing opens the durable progress state. Failed opens the safe retry
state. Ready and Partial open the saved result. None of these paths submits a
new analysis or charges usage merely for opening history.

## Actions

### Favorite

Favorite is optimistic, owner-scoped, and persisted through the existing
result user-state boundary. Failure rolls the icon back and announces the
error. The selected star uses the approved amber treatment.

### Overflow menu

The row/card menu contains:

- Open or Continue;
- Rename;
- Export when at least one eligible artifact is ready;
- Delete.

The menu is keyboard navigable, closes on Escape/outside interaction, and
returns focus to its trigger.

### Rename

Rename opens a focused dialog using existing Prism dialog primitives. The
trimmed title must be non-empty and bounded by the existing title schema.
Saving updates the visible item without resetting search/filter/sort state.
Failure preserves the entered title and displays an accessible error.

### Export

Export reuses existing result export contracts and never claims an integration
that is not supported. Partial results expose only ready artifacts.

### Delete

Delete always requires explicit confirmation. The server action verifies
ownership, deletes the analysis through the established database boundary,
and removes the item from the current result set only after confirmation.
Failure leaves the item visible and announces the error.

## Empty and error states

The page distinguishes:

- no analyses yet, with a New analysis action;
- no search matches, preserving the query and offering Clear search;
- no filter matches, preserving filter context and offering Clear filters;
- page-load failure, with a safe retry;
- action failure, localized to the affected control/dialog.

Empty states reuse the approved content width and surface language. They do
not introduce generic SaaS cards or decorative gradient blobs.

## Accessibility and motion

- Search, filters, sort, Favorite, menus, dialogs, sheet, pagination, and
  result links are keyboard accessible.
- Filter controls have visible labels and selected state independent of color.
- Popover, menu, dialog, and sheet focus is trapped or managed by the existing
  accessible primitives and restored on close.
- Dynamic results and mutations use restrained status announcements.
- Touch targets meet the existing app-shell minimums.
- Application motion is functional: short opacity/transform transitions only.
- `prefers-reduced-motion` removes sheet/popover/list entrance motion and
  animated status pulses while preserving state visibility.

## Verification

### Unit and integration coverage

- input parsing and URL serialization;
- owner-scoped search/filter/sort/cursor queries;
- stable cursor ordering;
- duplicate ownership/reusability verification;
- status and date presentation;
- Favorite optimistic success and rollback;
- rename validation and persistence;
- export eligibility;
- delete confirmation, ownership, success, and failure;
- distinct empty states.

### Component coverage

- search keyboard behavior;
- filter draft versus applied state;
- Reset/Clear all;
- sort menu selection;
- desktop popover focus restoration;
- mobile sheet focus and dismissal;
- non-interactive accessible grid control;
- shared behavior across desktop rows and mobile cards.

### Browser and visual coverage

Playwright verifies:

- desktop default and conditional duplicate states;
- desktop filter popover and sort menu;
- mobile list and mobile filter sheet;
- Ready, Processing, Failed, and Partial;
- empty, search-empty, and filtered-empty states;
- rename and delete dialogs;
- Back/Forward query restoration;
- no horizontal overflow at 320 px;
- keyboard navigation, touch behavior, 200% zoom, and reduced motion;
- reopening an existing result without a new intake or usage charge.

Visual snapshots cover at least 1680 px desktop, 980 px tablet, 430 px mobile,
390 px mobile, and 320 px narrow mobile. The two supplied references are
copied into the repository's approved design evidence during implementation
so future visual review does not depend on external Downloads paths.

## Assumptions and risks

- The references show one desktop and one mobile family; tablet interpolates
  between them without a new layout concept.
- The static references do not show the overflow menu, rename dialog, delete
  dialog, Partial badge, empty states, or pagination. These states use existing
  Prism primitives and tokens while leaving approved default geometry intact.
- Source/channel and keyword search depend on truthful persisted metadata.
  Missing legacy metadata remains absent rather than fabricated.
- Large history tables require indexed owner/query fields and cursor-based
  reads; query plans and database advisors are part of verification.

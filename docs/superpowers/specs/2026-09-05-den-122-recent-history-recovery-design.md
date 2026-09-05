# DEN-122 Recent Analyses and History Recovery Design

## Purpose

Gleen will make saved work visible on the New Analysis page and make recovery
from a partial result available directly from History. The change also refines
the buttons on New Analysis and the History action menu without changing the
visual language of unrelated authenticated pages.

The user-approved direction is a scoped, integrated change: persisted recent
analyses, a direct retry for missing materials, and restrained The Prism
interaction polish. Settings remains a separate DEN-119 delivery.

## Sources of truth and scope

Sources of truth, in order:

1. DEN-122 and this approved design.
2. DEN-19 History behavior and approved desktop/mobile screenshots.
3. DEN-118 partial-analysis retry semantics.
4. `docs/product.md`, `docs/design-system.md`, and `docs/architecture.md`.
5. Existing shared tokens and UI primitives.

In scope:

- The Recent Analyses panel on `/app`.
- Buttons and interactive states on `/app`.
- The three-dot action menu on `/app/history`.
- A direct retry action for partial analyses.

Out of scope:

- Redesigning the full History page or result workspace.
- Changing billing, quota, duplicate identity, or artifact-generation policy.
- Retrying complete or currently processing analyses.
- Global button changes outside New Analysis and the History action menu.
- Settings, which is delivered by DEN-119.

## Recent Analyses data flow

`/app` loads the three newest owned rows through the existing History read
model. The server page performs this read independently from onboarding and
active-analysis recovery. A History read failure is converted into a localized
unavailable state and never blocks the intake form.

The client component receives a typed view model; it does not query Supabase.
Every row contains only presentation-safe fields already exposed by History:
analysis id, owned href, title, channel, thumbnail or fallback, analyzed date,
summary mode, and status. The panel is not a second persistence mechanism and
does not use local storage.

States:

- Ready: up to three newest items are shown.
- Empty: the existing first-analysis explanation remains.
- Unavailable: a quiet localized message and link to History are shown.
- Active or partial records remain visible with their truthful status and route.

The whole title area is a link, thumbnails have safe fallbacks, and status is
not communicated by color alone. Desktop uses compact rows; mobile retains the
same information in a single-column composition without horizontal scrolling.

## New Analysis button treatment

Only controls inside the New Analysis experience are changed. The submit,
advanced settings, duplicate-result actions, recovery actions, and panel links
use shared semantic tokens with scoped composition classes.

- Primary actions use a light prism face with a restrained spectral edge on
  hover and visible cyan focus.
- Secondary actions stay dark with a thin border and subtle raised hover.
- Pressed state moves at most one pixel and is disabled for reduced motion.
- Disabled and pending states remain legible and cannot be mistaken for active.
- Every touch action is at least 44 by 44 pixels.

No large gradients, glow blobs, generic SaaS card treatment, or hover-only
information is introduced.

## History action menu

The existing Radix dropdown remains the accessibility and keyboard foundation.
The menu receives a History-scoped presentation rather than changing every
dropdown in the product.

- The trigger uses a deliberate three-dot glyph and clear hover, open, focus,
  and pressed states.
- Each action has a small line icon, text label, and consistent 44-pixel mobile
  target.
- Actions are grouped as navigation/recovery, organization, export, and danger.
- The menu surface uses a quiet elevated panel, crisp border, restrained shadow,
  and a one-pixel spectral edge on highlighted non-dangerous items.
- Delete remains visually distinct but not saturated.
- Opening and closing uses only a short opacity/translate transition, removed
  under `prefers-reduced-motion: reduce`.

The existing Open/Continue, Rename, Export, and Delete behaviors are preserved.
Favorite remains outside the menu as the current quick action.

## Partial-analysis retry

An item whose History status is `partial` shows **Retry missing materials** in
the first menu group. Ready, processing, and failed items do not show this new
action; failed items keep the existing Continue route to their recovery screen.

Selecting retry:

1. Closes or disables the menu action and announces a localized pending state.
2. Sends the owned analysis id to an authenticated server action.
3. Reuses DEN-118's `prepareRetry` and `startAnalysis` boundary.
4. Preserves ready artifacts and starts only missing or failed artifacts.
5. Does not create a new intake or paid reservation.
6. On success, navigates to `/app?analysis=<owned-id>` so progress and reload
   recovery use the existing processing experience.
7. On failure, stays on History, restores the control, and announces a generic
   localized error without exposing provider or database details.

The server verifies ownership even if a client submits an arbitrary id, and
duplicate concurrent selections are ignored while the first request is pending.

## Component and server boundaries

Suggested boundaries:

- `AppPage` coordinates independent loading of onboarding, active recovery, and
  recent History.
- `NewAnalysisHome` renders `RecentAnalysisItem` values and state only.
- A small recent-list component may be extracted if it keeps tests and markup
  focused.
- `HistoryItemActions` renders and coordinates menu state.
- A History server action adapts the existing analysis retry action into the
  History action result contract; privileged clients never enter visual code.

No new production dependency is needed.

## Localization and accessibility

New copy is added for Ukrainian, Russian, English, Spanish, and German with key
parity tests. Dates and status labels continue through the locale-aware History
presentation boundary.

The recent list and menu preserve semantic links/buttons, visible focus,
screen-reader announcements, Escape dismissal, arrow-key navigation, focus
restoration, and logical DOM order. No meaning depends on animation or color.

## Testing and verification

Test-driven implementation begins with failing tests for:

- `/app` requesting three owned newest History items.
- ready, empty, and unavailable Recent Analyses states.
- recent rows linking to ready, partial, failed, and processing destinations.
- retry visibility only for partial items.
- one retry submission while pending, successful navigation, and recoverable
  failure.
- owner verification and reuse of only missing/failed artifacts through the
  existing retry boundary.
- five-locale key parity.
- scoped hover/focus/pressed/reduced-motion CSS contracts.

Browser coverage exercises desktop and mobile Recent Analyses, keyboard and
touch History menus, partial retry, failure recovery, responsive layout, and
reduced motion. Completion requires formatting, lint, strict type checking,
focused and full tests, production build, and browser verification.

## Risks and mitigations

- **Coupling `/app` availability to History:** isolate the query and degrade only
  the panel.
- **Double-charging a retry:** call the existing technical retry boundary rather
  than reanalysis intake.
- **Retrying the wrong state:** render the action only for `partial` and enforce
  eligibility again in the repository/server boundary.
- **Global visual regressions:** use New Analysis and History-scoped selectors;
  do not modify global dropdown or button behavior.
- **Stale rows after retry:** navigate to the canonical active-analysis URL and
  let the existing recovery/polling flow own subsequent state.

# GLE-005 Authenticated Application Shell Design

## Goal

Implement DEN-15 so authenticated users land in a responsive application shell
that matches `/Users/niga/Downloads/gleen-motion-prototype-v2/app.html` without
redesigning it. The shell must provide the stable navigation and layout required
by later video, history, billing, and settings issues.

## Sources of truth

- Linear issue DEN-15.
- `docs/product.md`, `docs/design-system.md`, `docs/architecture.md`, and
  `docs/roadmap.md`.
- `/Users/niga/Downloads/gleen-motion-prototype-v2/screen-map.html`.
- `/Users/niga/Downloads/gleen-motion-prototype-v2/app.html`, `styles.css`,
  `app.js`, and `icons.svg` for exact shell and New analysis visuals.
- Existing repository design tokens and UI primitives.

The prototype directory and the approved files under `design/` are read-only.

## Scope

DEN-15 includes:

- the desktop sidebar and top bar;
- the tablet collapsed-sidebar behavior from the reference;
- the mobile top bar and fixed bottom navigation;
- the New analysis home composition;
- navigation to History, Subscription, and Settings;
- the user identity control and a truthful usage state;
- empty, loading, and session-expired states;
- keyboard, touch, active-route, mobile, and reduced-motion behavior.

DEN-15 does not implement:

- YouTube validation or submission, which belongs to DEN-16;
- processing, saved analyses, or result metrics;
- usage accounting, limits, plans, or billing;
- complete History, Subscription, or Settings functionality;
- notifications or support workflows.

## Routes and layout

Create an authenticated route group rooted at `/app`:

- `/app` — New analysis home;
- `/app/history` — honest shell-contained placeholder for DEN-19;
- `/app/subscription` — honest shell-contained placeholder for DEN-20;
- `/app/settings/profile` — honest shell-contained placeholder for the settings
  work that will be completed across later issues.

`/app/layout.tsx` is the protected Server Component boundary. It retrieves the
current Supabase user, redirects unauthenticated requests to `/session-expired`,
builds a small serializable identity view model, and renders one shared shell.
The shell owns navigation and responsive chrome; child routes own page content.

After onboarding completes, the success redirect changes from `/protected` to
`/app`. The existing `/protected` verification page becomes a compatibility
redirect to `/app`, so old local bookmarks do not strand users on the temporary
DEN-14 screen.

## Shell composition

Match the reference hierarchy and geometry:

- fixed desktop sidebar with Gleen brand, Workspace navigation, Help label,
  usage region, and user chip;
- desktop top bar with current route title, usage state, language action,
  notifications action, and avatar;
- tablet sidebar collapsed to its reference icon rail;
- mobile top bar with brand, notifications action, and avatar;
- mobile bottom navigation with New, History, Plan, and Profile;
- main content offset and responsive padding exactly derived from the prototype.

Navigation configuration is defined once and consumed by desktop and mobile
navigation. The current pathname determines the active item. Active state uses
the reference background/edge marker plus `aria-current="page"`, never color
alone.

Buttons whose workflows are outside DEN-15 must not pretend to work. Language,
notification, and Support controls use disabled or explicitly unavailable
states with accessible text until their owning issues are implemented.

## Identity and usage data

Identity comes from the authenticated Supabase user:

- display name: verified `full_name`/`name` metadata when present, otherwise the
  email local part;
- email: the authenticated email;
- avatar initials: derived from the display name with a deterministic fallback.

No name, email, plan, price, limit, reset date, analysis count, study progress,
or export count may be copied from prototype fixture data.

DEN-15 does not yet have a usage ledger. Preserve the reference usage surfaces
but render a truthful neutral state such as `Usage available with billing`
without a fabricated meter or number. Usage UI consumes a typed view model so
DEN-20 can replace the neutral state with real data without redesigning shell
components.

## New analysis home

Match the `app.html` New analysis composition:

- eyebrow and headline;
- beam-form shell with link icon, YouTube URL input, and Analyze video action;
- advanced-options row;
- Recent analyses panel;
- This month panel.

Because intake begins in DEN-16, the URL field and action are presented as an
unavailable preview with a visible explanation. They must not submit, consume
credits, or navigate to a fake result.

Recent analyses renders a designed empty state instead of prototype videos.
This month renders neutral unavailable metrics instead of `18`, `62%`, or `11`.
The panel geometry remains faithful to the reference while the data state is
truthful.

## Placeholder destinations

History, Subscription, and Settings routes render within the exact shared shell
and preserve the page-head rhythm from the corresponding prototype screens.
Each page explains which later issue owns its full functionality and provides a
working link back to New analysis. They do not duplicate full future screens or
introduce dead controls.

## Styling and assets

Port only the application-shell and New analysis rules required from the motion
prototype. Express repeated colors, spacing, radii, shadows, and timing through
the repository's existing CSS variables. Add semantic tokens only when an exact
reference value has no existing equivalent.

Use the prototype icon geometry from `icons.svg` through repository-owned,
accessible React icon components or a copied public sprite. Decorative icons
are hidden from assistive technology; icon-only controls have accessible names.

The shell remains dark-only. Spectral color is limited to fine usage, focus, and
edge accents. Do not add generic SaaS cards, large gradient blobs, excessive
glassmorphism, or new visual motifs.

## Motion

Port the reference shell entrance and functional hover/focus behavior, but keep
application motion restrained:

- short sidebar/topbar/content entrance only on the initial mount;
- subtle active-navigation ray and usage trace where meaningful;
- no marketing cursor, parallax, or continuous decorative motion;
- no content hidden until JavaScript animation completes.

Under `prefers-reduced-motion: reduce`, entrance and hover travel are removed
while all content and active-state indicators remain visible.

## Accessibility and responsive behavior

- Include a skip link to the main content.
- Use semantic `aside`, `nav`, `header`, and `main` landmarks with distinct
  accessible navigation labels.
- Preserve visible focus and logical tab order.
- Use at least 44px touch targets on coarse pointers.
- Keep the mobile bottom navigation clear of safe-area insets.
- Prevent horizontal scrolling at desktop, tablet, and 390px mobile widths.
- Ensure content is not obscured by the fixed mobile navigation.
- Announce loading and unavailable states in text, not by color alone.

## Loading and session states

Add an `/app/loading.tsx` shell-shaped loading state using existing skeleton
primitives. It must reserve sidebar/topbar/content geometry and respect reduced
motion.

Unauthenticated `/app` requests redirect to `/session-expired`. Supabase or
profile-read failures must not expose secrets or render fixture identity data;
the safe fallback is the authenticated email metadata already present in the
session.

## Testing and verification

Automated coverage must verify:

- authenticated layout protection and `/protected` compatibility redirect;
- onboarding success redirects to `/app`;
- identity derivation and absence of prototype fixture data;
- one shared navigation definition and correct active states;
- `aria-current`, landmarks, skip link, accessible unavailable controls, and
  keyboard navigation;
- exact desktop, tablet, and mobile layout contracts;
- no horizontal overflow and mobile safe-area spacing;
- reduced-motion behavior;
- New analysis and destination empty states;
- no hard-coded plans, usage limits, reset dates, or fixture metrics.

Before completion run formatting, linting, type checking, all unit/integration
tests, the production build, development browser E2E, and production E2E.
Browser verification must cover desktop, tablet, mobile, keyboard navigation,
touch targets, active routes, and reduced motion.

## Risks and follow-ups

- The product spec still describes onboarding step three as a first video,
  while DEN-14 and its implemented flow define output preferences. DEN-15 does
  not change onboarding scope; New analysis is the first post-onboarding video
  entry point.
- Usage and recent-analysis surfaces cannot show real values until later domain
  work exists. Truthful empty states are intentional and must not be replaced by
  prototype fixture numbers.
- Complete destination screens belong to their named Linear issues. DEN-15
  establishes their routes and shell only.

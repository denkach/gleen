# GLE-004 Account Access and Onboarding Design

## Goal and scope

Implement DEN-14 exactly: Google sign-in, email magic links, email/password
access, verification, password recovery, expired-session recovery, protected
routes, safe account linking, and a three-step onboarding flow for interface
language and output preferences.

Video intake, video processing, billing, the authenticated application shell,
and unrelated product screens remain out of scope.

## Approved visual source

The visual source of truth for this issue is the local prototype at
`/Users/niga/Downloads/gleen-motion-prototype-v2/`:

- `screen-map.html` defines the approved product surface map;
- `sign-in.html` and `sign-up.html` define authentication composition and copy;
- `settings.html` defines language and output-preference controls reused in
  onboarding;
- `styles.css`, `design-tokens.json`, and `app.js` define exact tokens,
  responsive behavior, motion, hover, focus, and reduced-motion behavior;
- `previews/signin-desktop-render.png` is the authentication visual check.

These source files are read-only. Implementation must port them without
redesign. Existing repository references under `design/reference-v3/` and
`design/screenshots/` also remain unchanged.

## Authentication architecture

Supabase Auth is the sole identity provider. Supported paths are:

- Google OAuth;
- email magic link;
- email/password sign-up and sign-in;
- email verification;
- forgot-password and reset-password;
- session-expired recovery.

Next.js server-side Supabase clients read and update cookie-backed sessions.
Protected route checks happen on the server and redirect unauthenticated users
to sign-in with a validated internal return path. Secrets never enter client
components. Passwords, access tokens, and refresh tokens are never stored in
application tables.

Identity linking may use only Supabase-supported verified identity flows. The
application must not merge accounts merely because unverified email strings
match. Recovery and authentication errors preserve non-sensitive user input,
explain the next action, and never echo passwords.

## Routes and states

Public routes:

- `/sign-in`
- `/sign-up`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/session-expired`
- `/auth/callback`

A minimal protected route exists only to verify the session boundary and
onboarding redirect. It is not the application shell owned by DEN-15.

Each form supports idle, submitting, success, validation error, provider error,
offline/retry, and accessible status-announcement states. OAuth and email
callbacks reject unsafe external redirect targets.

## Three-step onboarding

The three steps remain within the Linear issue's language and output-preference
scope:

1. Interface language: Ukrainian, Russian, English, Spanish, or German.
2. Output language: an explicit generated-content language independent of the
   interface language.
3. Output defaults: summary depth and flashcard count using the approved
   selection-card pattern from `settings.html`.

Non-essential preference steps can be skipped. Completing or skipping a step
persists progress so the user can resume. No YouTube URL, processing action, or
integration setup appears in this issue.

## Data model and security

An application-owned profile/preferences row is keyed by the authenticated
Supabase user UUID and stores onboarding progress, completion time, interface
locale, output locale, summary preset, and flashcard preset. Prices, limits,
currencies, and processing behavior are not stored in visual components.

Row Level Security restricts reads and writes to the owning authenticated user.
Database migrations define the table, constraints, defaults, update timestamp,
and policies. Server validation constrains every locale and preference value to
an explicit supported set.

## Visual and interaction behavior

Desktop authentication uses the approved two-panel layout: optical prism scene
on the left and a 440px access form on the right. Tablet stacks the panels at
980px. Mobile uses the exact 720px prototype rules. Authentication motion stays
calm and continuous; application-style onboarding motion is shorter and
functional. Every animation has a complete `prefers-reduced-motion` fallback.

Forms use semantic labels, visible focus, keyboard navigation, WCAG AA contrast,
touch-friendly targets, live status announcements, and no hover-only action.
The Google control, dividers, inputs, language cards, preference cards, error
messages, and CTA hierarchy remain traceable to the prototype.

## Dependencies

- `@supabase/supabase-js`: official Supabase client and auth API.
- `@supabase/ssr`: cookie-backed server/browser clients for Next.js SSR.
- A focused schema-validation package for server action and callback boundaries.

No other production dependency is introduced without a separate explanation.

## Verification

- Unit tests cover validation, safe redirects, client boundaries, and preference
  serialization.
- Integration tests cover sign-up, sign-in, magic-link, password recovery,
  callback, protected-route, onboarding-resume, and error states with controlled
  Supabase boundaries.
- Browser tests verify the approved desktop, tablet, and mobile geometry,
  keyboard use, errors, session expiry, and reduced motion.
- Formatting, linting, strict type checking, unit/integration tests, production
  build, and browser verification must pass before completion.

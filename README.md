# Gleen

Gleen is an AI platform that transforms a YouTube video into reusable knowledge artifacts:

- structured summary;
- interactive flashcards;
- clickable timestamps;
- transcript;
- exports to Obsidian, Notion, and NotebookLM.

## Repository status

This repository contains the DEN-11 frontend foundation: a strict TypeScript,
Next.js App Router application with Tailwind CSS, environment validation, unit
tests, Playwright smoke tests, and CI verification. The root route is an
intentionally neutral foundation; product screens will be implemented in later
issues from the approved visual references.

## Start here

1. Read `AGENTS.md`.
2. Read `docs/product.md`.
3. Read `docs/design-system.md`.
4. Review the approved visual prototype in `design/reference-v3/index.html`.
5. Read the current Linear issue before making changes.

The files in `design/reference-v3/` and `design/screenshots/` are approved design
assets. They are not implementation scratch files: do not edit, reinterpret, or
redesign them without explicit instruction. Implement approved screens by
matching the references.

## Application setup

### Prerequisites

- Node.js 22.12.0 or newer;
- npm (included with Node.js);
- Python 3 only if you want to preview the static design reference separately.

From the repository root, install dependencies and create the local environment
file:

```bash
npm install
cp .env.example .env.local
```

Set `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The Supabase URL and publishable key are
safe browser configuration; service-role keys and other secrets must remain
server-only and must never be committed.

YouTube intake also requires these server-only variables:

- `YOUTUBE_DATA_API_KEY` — a Google Cloud server key restricted to the YouTube
  Data API v3 and, where practical, to the deployment's server addresses;
- `SUPADATA_API_KEY` — a Supadata server key used only for native transcript
  requests. DEN-16 always requests `mode=native`; do not enable an automatic or
  generated-transcript fallback.

Enable YouTube Data API v3 in the linked Google Cloud project before creating
the restricted key. Keep both provider values outside source control and never
prefix them with `NEXT_PUBLIC_`.

The durable analysis pipeline also requires two server-only variables:

- `OPENROUTER_API_KEY` — the OpenRouter key used by the structured-output
  adapter;
- `OPENROUTER_MODEL` — one structured-output-capable model slug.

Production generation requires parameter-compatible routing with data
collection denied, zero-data-retention routing enabled, and compatible
fallbacks allowed. Never prefix either variable with `NEXT_PUBLIC_`, and never
log prompts, transcripts, generated content, or credentials.

For DEN-14 account access:

1. Create or link a Supabase project.
2. Apply `supabase/migrations/202607120001_create_profiles.sql`.
3. Enable Google and email/password providers in Supabase Auth.
4. Add local and production `/auth/callback` URLs to the Supabase redirect
   allowlist.
5. Copy the public project URL and publishable key into `.env.local`.

For DEN-16 video intake, apply the intake schema after linking the intended
Supabase project:

```bash
npx supabase db push
```

This applies `supabase/migrations/202607120002_create_analysis_intakes.sql`.
Verify the target project before running the command; migration and provider
configuration are server-side setup and contain no credential values.

For DEN-17, also apply
`supabase/migrations/202607170001_create_analysis_pipeline.sql`. It creates the
owned job, event, artifact, and reservation records, selective retry RPCs, and
the Realtime publication used as a refetch notification channel.

Start the application:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Authenticated application

The application shell requires a valid Supabase session. After onboarding,
authenticated users land on `/app`; unauthenticated requests are redirected to
the account-access flow. The shell currently provides these routes:

- `/app` — New analysis home;
- `/app/history` — History placeholder;
- `/app/subscription` — Subscription placeholder;
- `/app/settings/profile` — Profile settings placeholder.

Video intake, saved-analysis history, billing and usage accounting, and full
settings workflows belong to later issues. Their current shell destinations are
truthful placeholders and do not simulate those product capabilities.

For deterministic responsive and accessibility browser checks, development and
non-production previews expose `/app-shell-fixture`. Its local-only `intake`
query selects fixed ready, duplicate, validation, provider-failure, and
re-analysis dependencies backed by in-memory storage. These fixtures never read
provider keys or write Supabase. Production builds return an exact 404 for every
fixture URL and fixture readiness page; this is not an authentication bypass.

## Verification

Install Playwright's Chromium browser once before running browser tests:

```bash
npx playwright install chromium
```

Run the repository checks with:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run test:e2e:production
```

The Next.js development and production build commands load `.env.local`.
Playwright supplies non-secret test configuration when it starts the test
server and never contacts a production Supabase project. In CI and other
environments without `.env.local`, provide all three public variables explicitly.

### Authentication dependencies

- `@supabase/supabase-js@2.110.2` provides the official Auth and Postgres client.
- `@supabase/ssr@0.12.0` provides cookie-backed browser/server clients for the
  Next.js App Router.
- `zod@4.4.3` validates authentication and onboarding boundaries.

## UI primitives preview

The UI primitives preview is available for development and non-production
preview only at `http://localhost:3000/ui` while `npm run dev` is running. It
is a review and QA surface, not a production route: production builds return
an exact 404 for `/ui`.

Run the development preview and app-shell browser suite with `npm run test:e2e`. Run
`npm run test:e2e:production` to build and start the production application and
verify the exact 404 boundaries for `/ui` and `/app-shell-fixture`. Keyboard QA covers visible focus, dialog focus
containment and return, dropdown navigation, tabs, tooltips, and toast actions.
The preview also supports `prefers-reduced-motion`; reduced motion shortens or
removes animation without hiding content or changing interaction behavior.

Radix supplies accessible interaction behavior only. Gleen owns the public
component APIs, design tokens, markup composition, and all visuals. The five
direct Radix production dependencies are intentionally limited to:

- `@radix-ui/react-dialog` for modal semantics, focus containment, Escape, and
  focus return;
- `@radix-ui/react-dropdown-menu` for menu semantics and keyboard navigation;
- `@radix-ui/react-tabs` for tab semantics, roving focus, and activation;
- `@radix-ui/react-toast` for timed notifications, announcements, actions, and
  dismissal;
- `@radix-ui/react-tooltip` for accessible pointer and keyboard-triggered
  descriptions.

### Landing-page dependencies

- `gsap@3.15.0` is restricted to the marketing motion controller for
  deterministic ScrollTrigger scenes.
- `@fontsource-variable/inter@5.2.8`,
  `@fontsource-variable/space-grotesk@5.2.10`, and
  `@fontsource-variable/jetbrains-mono@5.2.8` provide self-hosted assets with
  no runtime Google Fonts request.
- Application UI and server processing must not import GSAP.

## Static design-reference preview

The approved static reference is separate from the Next.js application. Preview
it from the repository root with:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/design/reference-v3/
```

## Recommended workflow

```text
ChatGPT: product, UX, visual design, design review
Linear: planning and issue tracking
Codex: implementation, tests, debugging, pull requests
GitHub: source control, CI, reviews, releases
```

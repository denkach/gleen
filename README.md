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

`NEXT_PUBLIC_APP_URL` is the only required application variable. The example
sets it to `http://localhost:3000`. Keep real credentials out of committed
environment files.

Start the application:

```bash
npm run dev
```

Then open `http://localhost:3000`.

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
```

The Next.js development and production build commands load `.env.local`.
Playwright supplies its own application URL when it starts the test server. In
CI and other environments without `.env.local`, provide `NEXT_PUBLIC_APP_URL`
explicitly for commands that validate or use the application environment.

## UI primitives preview

The UI primitives preview is available for development and non-production
preview only at `http://localhost:3000/ui` while `npm run dev` is running. It
is a review and QA surface, not a production route: production builds return
an exact 404 for `/ui`.

Run the development preview browser suite with `npm run test:e2e`. Run
`npm run test:e2e:production` to build and start the production application and
verify the 404 boundary. Keyboard QA covers visible focus, dialog focus
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

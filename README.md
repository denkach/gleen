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

# GLE-001 — Initialize the frontend application

## Outcome

A production-ready frontend foundation exists and can be developed, tested, and deployed consistently.

## Context

Gleen currently has an approved product specification and visual prototype but no production application.

## Scope

- initialize Next.js using App Router;
- enable TypeScript strict mode;
- configure Tailwind CSS;
- connect CSS design tokens from `docs/design-system.md`;
- configure linting and formatting;
- add environment variable validation;
- configure a unit-test runner;
- configure Playwright;
- add a minimal CI workflow;
- create a basic root layout and placeholder home route;
- preserve all existing documentation and visual references.

## Out of scope

- production landing page implementation;
- authentication;
- database;
- Stripe;
- YouTube processing;
- Three.js prism;
- application dashboard.

## Acceptance criteria

- [ ] Development server starts successfully.
- [ ] Production build succeeds.
- [ ] Lint succeeds.
- [ ] Type checking succeeds.
- [ ] Unit-test command succeeds.
- [ ] Playwright smoke test opens the home route.
- [ ] CI runs lint, type checking, tests, and build.
- [ ] Design reference remains untouched.
- [ ] No secrets are committed.
- [ ] Setup instructions are documented in the root README.

## Technical constraints

- Follow `AGENTS.md`.
- Do not implement product features.
- Do not redesign the approved visual reference.
- Explain every production dependency added.

## Tests

- [ ] Unit-test smoke test.
- [ ] Playwright home-route smoke test.
- [ ] Production build.

## Definition of done

- [ ] All acceptance criteria pass.
- [ ] Pull request includes commands run and their results.
- [ ] No unrelated files are modified.

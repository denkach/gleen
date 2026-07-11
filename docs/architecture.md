# Gleen architecture

## Current status

Architecture is intentionally not finalized. This document establishes boundaries and preferred technologies before implementation.

## Frontend

Preferred stack:

- Next.js App Router;
- React;
- TypeScript strict mode;
- Tailwind CSS;
- CSS variables for design tokens;
- Framer Motion for application UI;
- GSAP and ScrollTrigger for marketing scenes;
- React Three Fiber for the production prism;
- a production-grade localization solution;
- schema validation for forms and API boundaries.

## Planned domains

- public marketing;
- authentication and sessions;
- onboarding;
- YouTube URL intake;
- metadata and transcript acquisition;
- processing jobs;
- AI artifact generation;
- result workspace;
- history and duplicate detection;
- usage accounting;
- Stripe billing;
- exports and integrations;
- localization;
- notifications;
- privacy and account data.

## Architectural boundaries

- UI must not contain hard-coded billing or usage rules.
- AI processing must run outside the browser.
- Stripe webhooks must be server-side and idempotent.
- authentication, billing, and processing secrets must never reach client code.
- long-running video processing must use persistent jobs rather than request-bound execution.
- duplicate detection must use canonical video identity plus analysis configuration.
- integration tokens require encrypted storage and expiration handling.

## Decisions to make before feature implementation

- authentication provider;
- database and ORM;
- job queue and worker platform;
- transcript acquisition strategy;
- AI provider and structured-output contracts;
- storage strategy;
- deployment platform;
- monitoring and error reporting;
- product analytics;
- usage-ledger model;
- Stripe product and webhook model.

Record major decisions as ADR files under `docs/adr/` when implementation begins.

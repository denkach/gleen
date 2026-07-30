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

## Billing and usage

ADR 0003 defines the DEN-20 responsibility boundary:

- Stripe is the system of record for products, Prices, customers,
  subscriptions, payments, invoices, and refunds.
- Supabase is the application-facing source of truth for entitlements, usage
  reservations, settled usage, and Stripe projections.
- The server resolves active Stripe Price IDs from the database. Visual
  components never hard-code plans, prices, currencies, limits, or Stripe
  object IDs.
- Only a raw-body, signature-verified, idempotently claimed webhook may project
  paid access. Checkout redirects and Portal returns cannot grant entitlement.
- Customer Portal owns payment-method updates and subscription management.
- Analysis usage is reserved atomically, then settled for a usable result or
  released for a zero-cost technical failure. Reuse does not consume another
  credit.
- Owner-facing billing views are protected by RLS and limited grants; webhook
  ingestion and projection use server-only privileged access.

The webhook projection handles
`customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.paid`,
`invoice.payment_failed`, `invoice.updated`, and `charge.refunded`. Unknown
events are recorded as unsupported without changing entitlement.

Stripe configuration is validated lazily at billing boundaries. The only
public Stripe value is `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`;
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SUPABASE_SECRET_KEY` remain
server-only.

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

Record major decisions as ADR files under `docs/adr/` when implementation begins.

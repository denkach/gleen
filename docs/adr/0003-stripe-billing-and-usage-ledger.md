# ADR 0003: Stripe billing and usage ledger

- Status: Accepted
- Date: 2026-07-30
- Linear: DEN-20

## Context

DEN-20 introduces paid plans, checkout, subscription management, and usage
enforcement. Payments and application authorization have different consistency
and availability requirements: Stripe is the payment system of record, while
Gleen must continue to resolve entitlements and enforce usage even during a
temporary Stripe outage.

The billing integration must also prevent a successful browser redirect or an
unverified, duplicated webhook from granting paid access.

## Decision

Supabase owns Gleen entitlements and usage. Stripe owns payments, invoices, and
subscription objects.

Checkout Sessions use `ui_mode: 'custom'` with Stripe Elements. Customer Portal
handles payment method and subscription management.

Verified idempotent webhooks are the only paid-entitlement writer. Client
callbacks, checkout redirects, and portal returns never grant paid access.

Stripe environment variables are validated lazily at billing boundaries.
Non-billing routes do not require Stripe secrets and remain buildable without
them.

Free fallback and usage enforcement stay functional if Stripe is temporarily
unavailable. Gleen reads the last verified entitlement state from Supabase and
continues to apply free-plan limits where no paid entitlement exists.

## Consequences

- Stripe outages can prevent new checkout or subscription-management actions,
  but they do not disable free usage enforcement.
- Supabase provides the application-facing entitlement and usage ledger.
- Webhook handlers must verify signatures, deduplicate events, and apply
  entitlement changes idempotently.
- Billing routes must validate Stripe configuration when invoked rather than at
  application startup.
- Customer-facing subscription management delegates to Stripe Customer Portal.

## Alternatives considered

### Read Stripe on every authorization decision

Rejected because authorization would inherit Stripe latency and availability,
and usage enforcement could fail during a Stripe outage.

### Grant access after a successful checkout redirect

Rejected because browser redirects are not a verified payment event and can be
replayed or abandoned before payment state is durable.

### Build subscription management in Gleen

Rejected because Stripe Customer Portal already provides secure payment-method,
invoice, cancellation, and subscription-management flows.

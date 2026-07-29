# DEN-20 Billing and Usage Design

## Outcome

Gleen users can understand their plan and usage, subscribe through Stripe
Sandbox, manage billing, review invoices, and recover from limit or payment
states without the client deciding entitlements or handling sensitive payment
data.

DEN-20 implements the six approved production screens from
`design/prototypes/billing/gleen-billing-pages-v3.html`:

- Subscription;
- Usage ledger;
- Checkout;
- Billing portal;
- Invoices;
- Limit reached.

The approved prototype is the visual source of truth for desktop, tablet,
mobile, keyboard focus, bottom-sheet navigation, and reduced-motion behavior.
The production implementation matches its geometry, typography, colors,
icons, responsive breakpoints, and component states one for one inside the
existing authenticated Gleen application shell.

The approved prototype currently exists as an untracked file in the primary
checkout. It must be copied unchanged into the DEN-20 branch at the same
repository path before visual implementation and committed as a reference
asset. No implementation may silently edit that reference.

## Scope boundaries

The prototype's page directory, `Back to page map` links, `SCREEN 01…06`
labels, duplicate `Billing & Usage` sidebar item, and demo-only toasts are
prototype navigation and are not production UI.

DEN-20 does not implement:

- team membership, invitations, roles, or seat management;
- one-off purchases of extra credits;
- live Stripe charges;
- localization;
- export integrations.

The Team plan and team-seat surfaces remain visually represented where the
approved screen requires them, but purchase and seat actions are disabled with
a truthful unavailable explanation until a separate team-account issue is
implemented. The extra-credit action is likewise present only as a disabled,
truthfully explained control. Separate Linear issues will own those behaviors.

## Environments and dependencies

Stripe Sandbox/Test Mode is the first billing environment. Live mode is enabled
only after the complete sandbox acceptance flow passes.

Sandbox execution depends on configured Stripe Products and Prices, an enabled
Customer Portal configuration, a registered webhook endpoint, and matching
Vercel environment values. Secrets are configured outside Git and never placed
in fixtures, screenshots, logs, or documentation.

The implementation adds pinned production dependencies:

- `stripe` for server-side Checkout Sessions, webhook verification, Customer
  Portal sessions, invoice links, and subscription reads;
- `@stripe/stripe-js` and `@stripe/react-stripe-js` for Stripe Elements backed
  by Checkout Sessions custom UI mode.

These dependencies are required because raw card number, expiry, and CVC data
must never enter Gleen React state, server actions, logs, or Supabase.

Required server-only environment values are:

- `STRIPE_SECRET_KEY`;
- `STRIPE_WEBHOOK_SECRET`;

The Stripe publishable key is the only Stripe value permitted in browser code.
Plan and Price identifiers are resolved server-side from the database rather
than accepted from a client request.

## Source-of-truth model

Supabase Postgres is the source of truth for Gleen entitlements and usage.
Stripe is the source of truth for payment, invoice, and subscription objects.
Verified Stripe webhooks project payment state into Supabase.

### Catalog

`billing_plans` stores stable plan slugs, display names, descriptions, analysis
limits, feature copy, availability, display order, and whether a plan can be
purchased.

`billing_prices` stores a plan reference, monthly or yearly interval, currency,
unit amount, optional comparison or savings copy, active state, and Stripe
Price ID. The browser receives only the presentation fields it needs.

The initial sandbox catalog includes the required Free entitlement and follows
the approved Subscription screen for the three paid comparison cards:

| Plan | Monthly | Annual monthly equivalent | Included analyses |
| --- | ---: | ---: | ---: |
| Free | USD 0 | Not applicable | 3 |
| Starter | USD 19 | USD 15 | 10 |
| Prism Pro | USD 49 | USD 39 | 25 |
| Team | USD 129 | USD 103 | 100 |

Annual subscriptions are billed for twelve months. Savings labels and amounts
are catalog data, not UI constants. Free is the default non-purchasable
entitlement and appears in the current-plan overview for a free user. The
approved three-card comparison grid remains Starter, Prism Pro, and Team.

The prototype contains contradictory fixture values across Subscription,
Checkout, and Limit reached. Production deliberately does not reproduce those
data errors. The same catalog record supplies every screen, so a plan, currency,
period, total, and limit remain identical throughout the flow while the visual
layout stays one for one.

### Customer and subscription projection

`billing_customers` maps one Supabase user UUID to one Stripe Customer ID.

`billing_subscriptions` stores the latest verified projection:

- Stripe Subscription and Price IDs;
- plan and interval;
- normalized status;
- current period start and end;
- trial end;
- cancellation-at-period-end flag and effective date;
- scheduled downgrade plan and effective date;
- latest Stripe event timestamp;
- last paid-through timestamp.

Client components cannot write these records. Users can read only their own
projection through RLS. Webhook writes use a focused server-only repository.

### Invoices and webhook events

`billing_invoices` stores the user-owned presentation projection required by
the invoice screen: Stripe invoice ID and number, plan, interval, amount,
currency, status, dates, hosted invoice URL, PDF URL, and refund state.

`billing_webhook_events` stores each verified Stripe Event ID once, its type,
Stripe creation timestamp, processing status, attempts, and diagnostic error
code. It does not store card data or full webhook payloads.

A unique event ID makes delivery idempotent. Projection updates compare Stripe
event timestamps, so late older events cannot overwrite newer subscription
state. A webhook returns success only after the event and its projection commit
durably. Transient failures return `5xx` for Stripe retry; invalid signatures
return `400`.

## Entitlements and usage ledger

An entitlement period contains:

- user and active plan;
- period start and end;
- analysis-limit snapshot;
- paid-through state;
- source subscription when applicable.

Free periods are monthly. Paid periods use Stripe's verified period boundaries.
A limit is snapshotted at the start of a period, so later catalog edits do not
alter an active period retroactively.

The existing `analysis_usage_reservations` becomes the job-level reservation
projection of an append-only `usage_ledger`. Ledger entries include:

- reservation;
- settlement;
- release;
- period renewal;
- manual adjustment;
- refund;
- non-billable technical retry.

Each entry has a unique idempotency key, user, entitlement period, signed
quantity, source, status, optional job reference, event time, and remaining
balance snapshot.

The analysis creation transaction:

1. resolves the user's current entitlement period;
2. locks the entitlement row;
3. counts settled and reserved usage;
4. rejects the request with `usage_limit_reached` when no included analysis is
   available;
5. creates one reservation, analysis job, artifacts, and ledger entry
   atomically.

Opening an exact duplicate never reaches this transaction. Retrying the same
job reuses its reservation. A completely failed analysis releases the
reservation. A complete result or a partial result with at least one usable
artifact settles one analysis. This behavior preserves the existing workflow
ledger interface rather than embedding billing policy into UI or providers.

## Subscription lifecycle

### Checkout

The authenticated user chooses a plan slug and interval. A server action loads
the active purchasable catalog row, ensures a single Stripe Customer mapping,
and creates a subscription Checkout Session in custom UI mode. Gleen never
trusts a client-supplied amount or Stripe Price ID.

The Checkout page matches the approved product, cycle, included-features,
payment-card, order-summary, promotion, secure-copy, desktop, and mobile
layout. Stripe Elements owns the actual payment and address inputs and is
themed with the approved dark tokens through the Appearance API.

The success return shows a confirming state until a verified webhook activates
the subscription. A redirect or Checkout Session alone never grants access.
Cancellation returns to Subscription without changing entitlement.

### Customer Portal

The approved in-app Billing portal screen is a summary and navigation surface.
Payment-method, billing-detail, plan-change, downgrade, and cancellation
actions create short-lived Stripe Customer Portal sessions or deep links on
demand. The browser never supplies a customer ID.

Scheduled cancellation retains access through the explicitly displayed date.
Downgrades take effect at the end of the paid period. Upgrades become active
only after the required invoice is paid and the verified webhook is applied.

### Status policy

- `trialing` and `active` grant the verified plan.
- `past_due` keeps the current paid-through entitlement while Stripe retries;
  it does not create a new paid period.
- `invoice.paid` restores good standing and advances the period.
- `unpaid`, `incomplete_expired`, a completed cancellation, or a period that is
  no longer paid through falls back to Free.
- A refund is shown on the invoice and ledger. It does not independently alter
  the plan unless Stripe also changes subscription status.
- Unknown Price IDs or unsupported status combinations never grant paid
  access; they produce a server diagnostic and a recoverable billing state.

## Production routes

The protected application routes are:

- `/app/subscription`;
- `/app/subscription/usage`;
- `/app/subscription/checkout`;
- `/app/subscription/portal`;
- `/app/subscription/invoices`;
- `/app/subscription/limit-reached`.

The existing Subscription navigation destination remains canonical. Billing
sub-pages use internal links and the prototype's mobile bottom sheet without
adding a second workspace-level billing destination.

## Screen behavior

### Subscription

The current plan overview, capacity, used count, reset date, billing-period
switch, three plan cards, and billing summary all consume the same server
snapshot. Actions expose current, upgrade, scheduled downgrade, scheduled
cancellation, trial, past-due, and unavailable-plan states without changing
card geometry.

### Usage ledger

Metrics, progress, remaining analyses, reset date, table, mobile cards, search,
period filter, event-type filter, CSV export, breakdown chart, and explanatory
copy use real user-owned ledger data. The screen includes loading, empty,
filtered-empty, and recoverable error states.

### Checkout

The chosen catalog entry drives cycle choices, features, subtotal, discount,
tax state, currency, and total. Stripe calculates authoritative taxes,
discounts, and totals. The order button has ready, submitting, authentication,
success-confirming, canceled, and error states.

### Billing portal

The screen displays verified plan, renewal, outstanding balance, masked payment
method, billing details, and recent billing activity. Supported controls open
Stripe Customer Portal flows. Team-seat controls are disabled and explained
until their separate issue.

### Invoices

Summary metrics and the invoice table/mobile cards support search, status and
year filters, hosted receipt/PDF links, and CSV export. Paid, open, refunded,
and failed states match the approved color treatment.

### Limit reached

An atomic `usage_limit_reached` response sends the user to the approved locked
state. It displays real used/limit values, percentage, reset timestamp, current
plan, upgrade comparison, and usage-ledger link. Saved results remain
available. The extra-credit button is disabled with an unavailable
explanation until its own issue is implemented.

## Accessibility and responsive behavior

The approved `1120px` and `760px` breakpoints are preserved. Mobile tables
become cards, multi-column summaries collapse as specified, checkout and limit
content stack, and the billing bottom sheet respects safe-area insets.

All controls use semantic buttons, links, labels, and headings. Status is not
communicated by color alone. Dialogs and the bottom sheet trap focus, close on
Escape, restore trigger focus, and prevent background interaction. Errors and
checkout progress are announced with live regions.

`prefers-reduced-motion: reduce` disables smooth scrolling, page entrances,
transitions, and animated progress while preserving every state change.

## Security

- Stripe secret keys, webhook secrets, and Supabase service keys remain
  server-only.
- Stripe signatures are verified against the raw request body.
- Checkout, Portal, invoice, and usage actions require a fresh authenticated
  user and never trust browser user/customer identifiers.
- Plan, price, limit, tax, discount, currency, and entitlement decisions are
  server-authoritative.
- Billing tables in exposed schemas have RLS and explicit grants. Internal
  webhook tables are not exposed to `anon` or `authenticated`.
- User metadata is not used for authorization.
- Security-definer database functions live outside the exposed API surface,
  revoke default `PUBLIC` execution, validate the authenticated user where
  applicable, and set an empty search path.
- Logs contain Stripe object IDs and controlled error codes, not payment
  details, secrets, transcripts, or generated content.

## Failure handling

- Stripe API failure leaves the current entitlement unchanged and presents a
  retryable action.
- Invalid webhook signatures are rejected without database writes.
- Duplicate webhook delivery returns success after confirming the existing
  durable result.
- Database failure returns a retryable webhook response without partial
  projection updates.
- Checkout cancellation changes no subscription or usage state.
- Missing or unknown catalog mappings never grant access.
- Invoice and usage failures preserve the application shell and offer retry.
- A payment failure does not double-reset usage or create conflicting
  entitlement periods.

## Verification

Database tests cover migrations, explicit grants, RLS ownership, webhook event
uniqueness, period snapshots, ledger idempotency, and concurrent reservation of
the final available analysis.

Unit tests cover catalog presentation, currency formatting, annual
calculation, entitlement status mapping, usage transitions, invoice mapping,
and stale-event rejection.

Integration tests cover:

- raw-body Stripe signature verification;
- duplicate and out-of-order webhooks;
- Checkout and Portal authorization;
- client plan or Price ID substitution;
- successful subscription activation;
- upgrade, scheduled downgrade, and scheduled cancellation;
- payment failure, retry, recovery, unpaid fallback, and refund projection;
- full failure release and non-billable retry behavior.

Component tests cover loading, empty, success, disabled, confirming, canceled,
past-due, payment-failed, scheduled-change, and error states across all six
screens.

Playwright verifies each screen on desktop and mobile, keyboard navigation,
focus restoration, mobile bottom sheet, no horizontal overflow, and reduced
motion. Visual snapshots compare the production screens with the approved
prototype geometry.

The final sandbox acceptance path is:

1. subscribe monthly;
2. receive and replay the activation webhook;
3. verify one atomic analysis charge;
4. verify a technical retry costs zero;
5. simulate renewal and failed payment;
6. update the payment method and recover;
7. schedule downgrade and cancellation;
8. verify invoice, refund, and reset projections.

Formatting, linting, type checking, unit/integration tests, production build,
desktop/mobile browser verification, and reduced-motion verification must all
pass before DEN-20 can be marked complete.

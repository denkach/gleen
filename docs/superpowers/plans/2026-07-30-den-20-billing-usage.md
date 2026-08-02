# DEN-20 Billing, Usage, and Stripe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the six approved billing screens one-to-one with a server-authoritative Supabase entitlement/usage ledger and a real Stripe Sandbox subscription lifecycle.

**Architecture:** Supabase Postgres owns plan presentation, entitlement periods, atomic analysis reservations, usage history, and verified billing projections. Stripe Checkout Sessions custom UI, Customer Portal, invoices, and signed idempotent webhooks own payment operations; authenticated Next.js Server Components and server actions expose closed view models to the approved responsive UI.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Zod 4, Supabase/Postgres with RLS, Stripe Node 20.4.1 (Clover-compatible Custom Checkout), Stripe.js 9.12.1, React Stripe.js 6.8.0, CSS variables, Vitest/Testing Library, Playwright.

## Global Constraints

- Match `design/prototypes/billing/gleen-billing-pages-v3.html` one-to-one for the six production screens; do not reinterpret approved geometry, responsive behavior, colors, icons, or motion.
- Keep the existing authenticated Gleen shell and canonical `/app/subscription` navigation destination.
- Do not ship the prototype page map, `Back to page map`, `SCREEN 01…06`, duplicate `Billing & Usage` sidebar item, or demo-only toasts.
- The same catalog row must supply prices, currencies, limits, totals, and plan copy on every screen; do not reproduce contradictory prototype fixture values.
- Free is the default 3-analysis entitlement; the paid comparison cards are Starter, Prism Pro, and Team.
- Team purchase/seats and one-off extra credits remain disabled with truthful explanations and separate Linear issues.
- Stripe Sandbox/Test Mode comes first; do not enable live charges before the sandbox acceptance flow passes.
- Raw card number, expiry, and CVC must remain inside Stripe Elements. Never send or log them through Gleen.
- Stripe secret keys, webhook secrets, Supabase service keys, Customer IDs, and internal Price IDs remain server-only.
- Checkout redirects never grant access. Only a verified, durably projected webhook changes paid entitlement.
- Duplicate analysis reuse consumes zero credits; a technical retry consumes zero additional credits; complete or usable partial results settle one reservation; a complete failure releases it.
- Use owner-scoped RLS with `(select auth.uid())`, explicit grants, indexed foreign keys, short transactions, deterministic lock ordering, and no exposed security-definer helpers.
- Use TypeScript strict mode, shared tokens, focused modules, keyboard navigation, safe-area-aware mobile layouts, and `prefers-reduced-motion`.
- Add only the three explained and exact-pinned Stripe dependencies.
- Create the SQL migration with `npx supabase migration new den_20_billing_usage`; do not invent a migration timestamp.
- Do not mark DEN-20 complete until format, lint, typecheck, unit/integration tests, production build, database advisors, desktop/mobile browser verification, reduced-motion verification, and the Stripe Sandbox acceptance flow pass.

## File Structure

- `design/prototypes/billing/gleen-billing-pages-v3.html` — immutable approved visual reference copied into the branch.
- `docs/adr/0003-stripe-billing-and-usage-ledger.md` — accepted Stripe/Supabase responsibility boundary.
- `src/env.ts` — validated public and server-only Stripe configuration.
- `src/lib/billing/domain.ts` — closed Zod schemas and normalized billing/usage types.
- `src/lib/billing/presentation.ts` — money/date/status/plan-to-screen mapping with no UI policy.
- `src/lib/billing/repository.ts` — billing snapshot and mutation interfaces.
- `src/lib/billing/supabase-repository.ts` — owner-scoped reads and privileged webhook projections.
- `src/lib/billing/stripe.ts` — pinned server client and Stripe object mapping.
- `src/lib/billing/actions.ts` — authenticated Checkout, Portal, CSV, and invoice actions.
- `src/lib/billing/webhook.ts` — signature verification, idempotency, stale-event rejection, and projection dispatch.
- `src/app/api/stripe/webhook/route.ts` — raw-body webhook transport.
- `src/lib/analysis-pipeline/usage-ledger.ts` — real settle/release adapter.
- `src/lib/analysis-pipeline/supabase-repository.ts` — typed `usage_limit_reached` RPC failure.
- `src/lib/youtube-intake/action-factory.ts` and `src/lib/youtube-intake/providers.ts` — safe limit error state.
- `src/lib/app-shell.ts` and `src/app/app/layout.tsx` — real shell usage snapshot.
- `src/components/billing/billing-icons.tsx` — exact approved SVG symbols.
- `src/components/billing/billing-page.tsx` — shared heading, status, card, and mobile billing navigation primitives.
- `src/components/billing/subscription-screen.tsx` — Subscription view.
- `src/components/billing/usage-screen.tsx` — Usage ledger table/cards/chart.
- `src/components/billing/checkout-screen.tsx` — custom Checkout Sessions + Stripe Elements surface.
- `src/components/billing/portal-screen.tsx` — in-app portal summary and Stripe Portal launch actions.
- `src/components/billing/invoices-screen.tsx` — invoice metrics, filters, table/cards.
- `src/components/billing/limit-reached-screen.tsx` — exact blocked-analysis state.
- `src/styles/billing-reference.css` — exact approved desktop/tablet/mobile/reduced-motion styling.
- `src/app/app/subscription/**/page.tsx` — six protected production route compositions.
- `src/app/billing-fixture/**/page.tsx` — deterministic visual fixtures only available outside production.
- `supabase/migrations/*_den_20_billing_usage.sql` — CLI-generated catalog, projections, ledger, RLS, grants, indexes, and atomic RPCs.
- `tests/e2e/billing.spec.ts` and `tests/e2e/billing.visual.spec.ts` — behavior, accessibility, responsive, and snapshot coverage.

---

### Task 1: Lock the approved reference, dependency versions, environment contract, and ADR

**Files:**

- Create: `design/prototypes/billing/gleen-billing-pages-v3.html`
- Create: `docs/adr/0003-stripe-billing-and-usage-ledger.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/env.ts`
- Modify: `src/env.test.ts`

**Interfaces:**

- Produces: `StripePublicEnv`, `StripeServerEnv`, `validateStripePublicEnv()`, `validateStripeServerEnv()`.
- Consumes: the approved prototype from the primary checkout without modifying its bytes.

- [ ] **Step 1: Copy and verify the approved reference**

Run:

```bash
mkdir -p design/prototypes/billing
cp /Users/niga/Downloads/gleen/design/prototypes/billing/gleen-billing-pages-v3.html design/prototypes/billing/gleen-billing-pages-v3.html
shasum -a 256 /Users/niga/Downloads/gleen/design/prototypes/billing/gleen-billing-pages-v3.html design/prototypes/billing/gleen-billing-pages-v3.html
```

Expected: both SHA-256 values are identical.

- [ ] **Step 2: Write failing Stripe environment tests**

Add:

```ts
expect(
  validateStripePublicEnv({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ' pk_test_123 ',
  }),
).toEqual({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123' });

expect(() => validateStripeServerEnv({})).toThrow(
  'STRIPE_SECRET_KEY is required',
);
expect(() =>
  validateStripeServerEnv({ STRIPE_SECRET_KEY: 'sk_test_123' }),
).toThrow('STRIPE_WEBHOOK_SECRET is required');
expect(
  validateStripeServerEnv({
    STRIPE_SECRET_KEY: ' sk_test_123 ',
    STRIPE_WEBHOOK_SECRET: ' whsec_123 ',
  }),
).toEqual({
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_123',
});
```

- [ ] **Step 3: Run RED**

Run: `npm test -- src/env.test.ts`

Expected: FAIL because the Stripe validators do not exist.

- [ ] **Step 4: Install exact dependencies and implement validators**

Run:

```bash
npm install --save-exact stripe@20.4.1 @stripe/stripe-js@9.12.1 @stripe/react-stripe-js@6.8.0
```

Implement:

```ts
export type StripePublicEnv = Readonly<{
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
}>;

export type StripeServerEnv = Readonly<{
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}>;
```

Both validators trim values and throw the exact messages asserted above. Do not add Stripe validation to `next.config.ts`; routes that do not use billing must still build without Stripe secrets.

- [ ] **Step 5: Record ADR 0003**

The ADR must state:

- Supabase owns Gleen entitlements and usage.
- Stripe owns payments, invoices, and subscription objects.
- Checkout Sessions use `ui_mode: 'custom'` with Stripe Elements.
- verified idempotent webhooks are the only paid-entitlement writer;
- Customer Portal handles payment method and subscription management;
- Free fallback and usage enforcement stay functional if Stripe is temporarily unavailable.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
npm test -- src/env.test.ts
npm run typecheck
git diff --check
```

Expected: PASS with no TypeScript or whitespace errors.

```bash
git add design/prototypes/billing/gleen-billing-pages-v3.html docs/adr/0003-stripe-billing-and-usage-ledger.md package.json package-lock.json src/env.ts src/env.test.ts
git commit -m "chore(den-20): establish Stripe billing foundation"
```

### Task 2: Add the secure catalog, entitlement, webhook, invoice, and usage schema

**Files:**

- Create: `supabase/migrations/*_den_20_billing_usage.sql` through the Supabase CLI.
- Create: `src/lib/billing/database-contract.test.ts`

**Interfaces:**

- Produces: `billing_plans`, `billing_prices`, `billing_customers`, `billing_subscriptions`, `billing_entitlement_periods`, `billing_invoices`, `billing_webhook_events`, `usage_ledger`, enhanced `analysis_usage_reservations`, `get_or_create_free_entitlement()`, `reserve_analysis_usage()`, and owner-readable billing views.
- Consumes: `auth.users`, `analysis_intakes`, `analysis_jobs`, and the existing pipeline RPCs.

- [ ] **Step 1: Create the migration via the CLI**

Run: `npx supabase migration new den_20_billing_usage`

Expected: one new file ending in `_den_20_billing_usage.sql`; use the exact printed path in the remaining commands and commit.

- [ ] **Step 2: Write the failing migration contract test**

Read the generated file and assert:

```ts
expect(sql).toContain('create table public.billing_plans');
expect(sql).toContain('create table public.billing_prices');
expect(sql).toContain('create table public.billing_entitlement_periods');
expect(sql).toContain('create table public.usage_ledger');
expect(sql).toContain('unique (stripe_event_id)');
expect(sql).toContain('with (security_invoker = true)');
expect(sql).toContain('(select auth.uid()) = user_id');
expect(sql).toContain('for update');
expect(sql).toContain('usage_limit_reached');
expect(sql).toContain('revoke all');
expect(sql).toContain('grant select');
```

- [ ] **Step 3: Run RED**

Run: `npm test -- src/lib/billing/database-contract.test.ts`

Expected: FAIL because the generated migration is empty.

- [ ] **Step 4: Implement catalog and projection tables**

Use UUID primary keys, lowercase identifiers, check constraints, unique Stripe IDs, and explicit FK indexes. Store monetary amounts as non-negative integer minor units and ISO currency as lowercase three-character text.

Required catalog seed:

```sql
insert into public.billing_plans
  (slug, display_name, description, analysis_limit, features, display_order,
   is_default, is_purchasable, is_active)
values
  ('free', 'Free', 'For exploring Gleen.', 3,
   '["3 analyses per month","Saved history"]'::jsonb, 0, true, false, true),
  ('starter', 'Starter',
   'For individuals getting started with AI analysis.', 10,
   '["10 analyses per month","Basic insights & summaries","Standard templates","Export results","Email support"]'::jsonb,
   1, false, true, true),
  ('prism-pro', 'Prism Pro',
   'For professionals who need deeper insights and more capacity.', 25,
   '["25 analyses per month","Advanced insights & takeaways","All premium templates","Export & download","Priority support"]'::jsonb,
   2, false, true, true),
  ('team', 'Team', 'For teams collaborating and scaling their impact.', 100,
   '["100 analyses per month","Team workspace","Collaboration & sharing","Admin controls & roles","Priority onboarding"]'::jsonb,
   3, false, false, true);
```

Seed monthly and yearly presentation amounts from the specification. Store sandbox Stripe Price IDs through a later privileged configuration command, not placeholder strings in Git.

- [ ] **Step 5: Implement ownership, indexes, and views**

Enable RLS on every exposed table. Authenticated users may select active plan presentation and only their own entitlement, invoice, and ledger rows. They cannot directly insert/update/delete billing state. Revoke all access from `anon`.

Create indexes at minimum on:

```sql
create unique index billing_customers_user_idx on public.billing_customers(user_id);
create unique index billing_customers_stripe_idx on public.billing_customers(stripe_customer_id);
create index billing_subscriptions_user_status_idx on public.billing_subscriptions(user_id, status);
create index billing_entitlement_user_period_idx on public.billing_entitlement_periods(user_id, period_end desc);
create index billing_invoices_user_created_idx on public.billing_invoices(user_id, created_at desc);
create index usage_ledger_user_occurred_idx on public.usage_ledger(user_id, occurred_at desc, id desc);
create unique index usage_ledger_idempotency_idx on public.usage_ledger(idempotency_key);
create index usage_reservations_entitlement_status_idx
  on public.analysis_usage_reservations(entitlement_period_id, status);
```

Create `security_invoker = true` views containing only the exact fields required by the six screens.

- [ ] **Step 6: Implement short atomic entitlement and reservation functions**

`get_or_create_free_entitlement(target_user_id uuid)` may be called only by the authenticated owner or `service_role`. It creates one UTC monthly Free period with a limit snapshot of 3.

`reserve_analysis_usage(analysis_id uuid)` locks the current entitlement row `for update`, verifies `(settled + reserved) < analysis_limit`, inserts one idempotent reservation and ledger event, then lets `create_analysis_pipeline` create the job and artifacts in the same transaction. Raise:

```sql
raise exception 'usage_limit_reached'
  using errcode = 'P0001', detail = period.period_end::text;
```

Update `retry_analysis_pipeline` to reuse the existing reservation and write a zero-quantity `technical_retry` entry. Update settlement/release through one idempotent database function so workflow retries cannot duplicate ledger entries.

- [ ] **Step 7: Reset and inspect**

Run:

```bash
npx supabase db reset
npx supabase db advisors --local
npx supabase migration list --local
npm test -- src/lib/billing/database-contract.test.ts
```

Expected: migrations apply, contract passes, and advisors report no DEN-20 security or missing-index finding.

- [ ] **Step 8: Prove concurrency and commit**

Run two concurrent authenticated calls for a period with one remaining analysis.

Expected: exactly one reservation succeeds, the other returns `usage_limit_reached`, and the ledger contains one negative reservation entry.

```bash
git add supabase/migrations/*_den_20_billing_usage.sql src/lib/billing/database-contract.test.ts
git commit -m "feat(den-20): add billing and usage schema"
```

### Task 3: Define closed billing domain and presentation contracts

**Files:**

- Create: `src/lib/billing/domain.ts`
- Create: `src/lib/billing/domain.test.ts`
- Create: `src/lib/billing/presentation.ts`
- Create: `src/lib/billing/presentation.test.ts`
- Create: `src/lib/billing/repository.ts`

**Interfaces:**

- Produces: `BillingInterval`, `BillingSubscriptionStatus`, `BillingPlan`, `BillingPrice`, `BillingSnapshot`, `UsageLedgerPage`, `InvoicePage`, `formatMoney()`, `toSubscriptionPresentation()`, `toUsagePresentation()`, and `toInvoicePresentation()`.
- Consumes: database-view rows, not raw Stripe objects.

- [ ] **Step 1: Write failing schema and presentation tests**

Assert:

```ts
expect(billingIntervalSchema.parse('year')).toBe('year');
expect(() => billingIntervalSchema.parse('weekly')).toThrow();
expect(formatMoney({ amountMinor: 4900, currency: 'usd', locale: 'en' })).toBe(
  '$49.00',
);
expect(
  toEntitlementStatus({
    status: 'past_due',
    paidThrough: '2026-08-01T00:00:00.000Z',
    now: '2026-07-30T00:00:00.000Z',
  }),
).toBe('past_due_with_access');
expect(
  toEntitlementStatus({
    status: 'unpaid',
    paidThrough: '2026-07-29T00:00:00.000Z',
    now: '2026-07-30T00:00:00.000Z',
  }),
).toBe('free');
```

Also assert that one catalog price generates the same amount/currency on Subscription, Checkout, and Invoices.

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/lib/billing/domain.test.ts src/lib/billing/presentation.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement domain schemas**

Define:

```ts
export const billingIntervalSchema = z.enum(['month', 'year']);
export const billingSubscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'canceled',
  'paused',
]);
export type BillingPlan = Readonly<{
  id: string;
  slug: 'free' | 'starter' | 'prism-pro' | 'team';
  displayName: string;
  description: string;
  analysisLimit: number;
  features: readonly string[];
  purchasable: boolean;
}>;
export type BillingPrice = Readonly<{
  planId: string;
  interval: BillingInterval;
  amountMinor: number;
  currency: string;
  savingsPercent: number | null;
}>;
```

`BillingSnapshot` contains current plan/price, period, used/reserved/remaining, scheduled change, payment summary, recent activity, and available plans. It must be serializable and contain no Stripe secret/customer/internal Price ID.

- [ ] **Step 4: Implement repository interfaces and presentation**

Repository contracts:

```ts
export type BillingRepository = Readonly<{
  getOwnedSnapshot(userId: string): Promise<BillingSnapshot>;
  listOwnedUsage(userId: string, query: UsageQuery): Promise<UsageLedgerPage>;
  listOwnedInvoices(userId: string, query: InvoiceQuery): Promise<InvoicePage>;
  getOwnedCustomerId(userId: string): Promise<string | null>;
}>;

export type BillingProjectionRepository = Readonly<{
  claimWebhookEvent(
    event: BillingWebhookEvent,
  ): Promise<'claimed' | 'duplicate'>;
  applySubscription(input: SubscriptionProjection): Promise<void>;
  applyInvoice(input: InvoiceProjection): Promise<void>;
  markWebhookProcessed(eventId: string): Promise<void>;
  markWebhookFailed(eventId: string, code: string): Promise<void>;
}>;
```

Use `Intl.NumberFormat` and `Intl.DateTimeFormat`; components receive formatted copy and semantic status variants rather than recreating policy.

- [ ] **Step 5: Run GREEN and commit**

Run:

```bash
npm test -- src/lib/billing/domain.test.ts src/lib/billing/presentation.test.ts
npm run typecheck
```

Expected: PASS.

```bash
git add src/lib/billing/domain.ts src/lib/billing/domain.test.ts src/lib/billing/presentation.ts src/lib/billing/presentation.test.ts src/lib/billing/repository.ts
git commit -m "feat(den-20): define billing domain contracts"
```

### Task 4: Implement Supabase billing reads and the real analysis usage adapter

**Files:**

- Create: `src/lib/billing/supabase-repository.ts`
- Create: `src/lib/billing/supabase-repository.test.ts`
- Modify: `src/lib/analysis-pipeline/usage-ledger.ts`
- Modify: `src/lib/analysis-pipeline/usage-ledger.test.ts`
- Modify: `src/lib/analysis-pipeline/supabase-repository.ts`
- Modify: `src/lib/analysis-pipeline/supabase-repository.test.ts`

**Interfaces:**

- Produces: `createSupabaseBillingRepository()`, `createSupabaseBillingProjectionRepository()`, `UsageLimitReachedError`, and `createUsageLedger()`.
- Consumes: Task 2 views/RPCs and Task 3 repository contracts.

- [ ] **Step 1: Write failing owner-scope and usage-limit tests**

Assert repository queries always include owner ID and parse closed rows. Assert a Supabase RPC error with message `usage_limit_reached` becomes:

```ts
expect(error).toBeInstanceOf(UsageLimitReachedError);
expect(error.code).toBe('usage_limit_reached');
expect(error.resetAt).toBe('2026-08-01T00:00:00.000Z');
```

Assert:

```ts
await ledger.settle('job-1');
await ledger.release('job-2');
expect(repository.transitionReservation).toHaveBeenNthCalledWith(
  1,
  'job-1',
  'settled',
);
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/lib/billing/supabase-repository.test.ts src/lib/analysis-pipeline/usage-ledger.test.ts src/lib/analysis-pipeline/supabase-repository.test.ts
```

Expected: FAIL for missing repository/error/transition interface.

- [ ] **Step 3: Implement owner-scoped readers and privileged projectors**

The user repository accepts a cookie-backed client and queries only the security-invoker views. The projection repository accepts only the admin client and calls database RPCs that atomically claim/apply/finish an event. Parse every boundary with Task 3 Zod schemas and throw controlled `BillingRepositoryError` on malformed rows.

- [ ] **Step 4: Replace the no-op ledger**

Keep:

```ts
export type UsageLedger = Readonly<{
  settle(jobId: string): Promise<void>;
  release(jobId: string): Promise<void>;
}>;
```

Rename `createNoopUsageLedger()` to `createUsageLedger()` and delegate to `transitionReservation(jobId, status)`, which invokes the idempotent database transition RPC. Update workflow/start/retry call sites and tests.

- [ ] **Step 5: Run GREEN and commit**

Run:

```bash
npm test -- src/lib/billing/supabase-repository.test.ts src/lib/analysis-pipeline
npm run typecheck
```

Expected: PASS.

```bash
git add src/lib/billing src/lib/analysis-pipeline src/lib/youtube-intake/actions.ts
git commit -m "feat(den-20): enforce real analysis usage"
```

### Task 5: Add Stripe Checkout, Customer Portal, invoice, and export actions

**Files:**

- Create: `src/lib/billing/stripe.ts`
- Create: `src/lib/billing/stripe.test.ts`
- Create: `src/lib/billing/actions.ts`
- Create: `src/lib/billing/actions.test.ts`

**Interfaces:**

- Produces: `createStripeClient()`, dependency-injected `createBillingActions()`, authenticated `createCheckoutSession()`, `createPortalSession()`, `exportUsageCsv()`, and `exportInvoicesCsv()`.
- Consumes: Task 1 env, Task 3 repository contracts, and authenticated user identity.

- [ ] **Step 1: Write failing authorization and substitution tests**

Tests must prove:

```ts
await expect(
  actions.createCheckoutForUser({
    userId: 'u1',
    plan: 'free',
    interval: 'month',
  }),
).resolves.toEqual({ ok: false, code: 'plan_unavailable' });
await expect(
  createCheckoutSession({ plan: 'prism-pro', interval: 'year' }),
).resolves.toEqual({ ok: false, code: 'session_expired' });
expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
  expect.objectContaining({
    mode: 'subscription',
    ui_mode: 'custom',
    line_items: [{ price: 'price_server_owned', quantity: 1 }],
    client_reference_id: 'u1',
  }),
);
```

`createCheckoutForUser()` is the dependency-injected server service used by tests after identity is resolved. The exported server action authenticates internally and accepts only `plan` and `interval`, never `userId`, amount, customer ID, or Price ID from the client.

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/lib/billing/stripe.test.ts src/lib/billing/actions.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement Stripe client and actions**

Initialize Stripe once per server process using `validateStripeServerEnv()`. Do not manually pin an API version different from the installed SDK type version.

Checkout configuration:

```ts
{
  mode: 'subscription',
  ui_mode: 'custom',
  customer: ownedCustomerId,
  line_items: [{ price: serverResolvedStripePriceId, quantity: 1 }],
  client_reference_id: userId,
  metadata: { gleen_user_id: userId, plan_slug: plan, interval },
  subscription_data: { metadata: { gleen_user_id: userId } },
  return_url: `${appUrl}/app/subscription/checkout?session_id={CHECKOUT_SESSION_ID}`,
}
```

Create a customer only server-side when no mapping exists. Every exported server action resolves the current user through the server Supabase client before calling its dependency-injected service. Portal sessions use the stored owned customer ID and return to `/app/subscription/portal`. CSV actions quote cells safely, set UTF-8 content, and read only owner-scoped rows.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
npm test -- src/lib/billing/stripe.test.ts src/lib/billing/actions.test.ts
npm run typecheck
```

Expected: PASS.

```bash
git add src/lib/billing/stripe.ts src/lib/billing/stripe.test.ts src/lib/billing/actions.ts src/lib/billing/actions.test.ts
git commit -m "feat(den-20): add secure Stripe billing actions"
```

### Task 6: Process signed idempotent and out-of-order Stripe webhooks

**Files:**

- Create: `src/lib/billing/webhook.ts`
- Create: `src/lib/billing/webhook.test.ts`
- Create: `src/app/api/stripe/webhook/route.ts`
- Create: `src/app/api/stripe/webhook/route.test.ts`

**Interfaces:**

- Produces: `processStripeWebhook(rawBody, signature, dependencies)` and App Router `POST`.
- Consumes: Task 4 projection repository and Task 5 Stripe client.

- [ ] **Step 1: Write failing signature, duplicate, stale, and retry tests**

Cover:

- missing/invalid signature returns `invalid_signature`;
- a duplicate Event ID performs no second projection and succeeds;
- an older `customer.subscription.updated` cannot overwrite a newer projection;
- `invoice.paid`, `invoice.payment_failed`, `invoice.updated`, and `charge.refunded` map safely;
- a repository failure returns a retryable error and records a controlled code;
- unsupported event types are durably marked processed without changing entitlement.

Route test:

```ts
const request = new Request('http://localhost/api/stripe/webhook', {
  method: 'POST',
  headers: { 'stripe-signature': 'sig' },
  body: '{"id":"evt_1"}',
});
expect(await POST(request)).toMatchObject({ status: 200 });
expect(constructEvent).toHaveBeenCalledWith(
  '{"id":"evt_1"}',
  'sig',
  'whsec_test',
);
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/lib/billing/webhook.test.ts src/app/api/stripe/webhook/route.test.ts
```

Expected: FAIL because webhook modules do not exist.

- [ ] **Step 3: Implement raw-body verification and event dispatch**

Read `await request.text()` exactly once. Call `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)`. Claim the Event ID before projection. Map only controlled fields; never persist the complete payload.

For subscription events, project status, Price ID mapping, period boundaries, cancellation, and latest event creation timestamp in one database transaction. For invoice events, project amount/currency/status/URLs and advance paid-through only for `invoice.paid`. Unknown Price IDs mark the event failed with `unknown_price` and do not grant access.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
npm test -- src/lib/billing/webhook.test.ts src/app/api/stripe/webhook/route.test.ts
npm run typecheck
```

Expected: PASS.

```bash
git add src/lib/billing/webhook.ts src/lib/billing/webhook.test.ts src/app/api/stripe/webhook
git commit -m "feat(den-20): project verified Stripe webhooks"
```

### Task 7: Feed real usage into the application shell and limit error flow

**Files:**

- Modify: `src/lib/app-shell.ts`
- Modify: `src/lib/app-shell.test.ts`
- Modify: `src/app/app/layout.tsx`
- Modify: `src/app/app/layout.test.tsx`
- Modify: `src/lib/youtube-intake/providers.ts`
- Modify: `src/lib/youtube-intake/action-factory.ts`
- Modify: `src/lib/youtube-intake/action-factory.test.ts`
- Modify: `src/components/app-shell/new-analysis-form.tsx`
- Modify: `src/components/app-shell/new-analysis-form.test.tsx`

**Interfaces:**

- Produces: available `AppUsage` and `usage_limit_reached` action state with `/app/subscription/limit-reached`.
- Consumes: Task 4 repository and `UsageLimitReachedError`.

- [ ] **Step 1: Write failing shell and limit tests**

Assert:

```ts
const usage: AppUsage = {
  status: 'available',
  label: '7 analyses left',
  planName: 'Prism Pro',
  used: 18,
  limit: 25,
  resetAt: '2026-08-01T00:00:00.000Z',
};
expect(screen.getAllByText('7 analyses left')).not.toHaveLength(0);
```

Assert a `UsageLimitReachedError` becomes:

```ts
{
  status: 'error',
  code: 'usage_limit_reached',
  redirectTo: '/app/subscription/limit-reached',
  message: 'Your analysis limit has been reached.',
}
```

and the client router navigates to that route.

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/lib/app-shell.test.ts src/app/app/layout.test.tsx src/lib/youtube-intake/action-factory.test.ts src/components/app-shell/new-analysis-form.test.tsx
```

Expected: FAIL for the unavailable-only usage type and missing limit code.

- [ ] **Step 3: Implement real usage and safe redirect**

Make `AppUsage` a discriminated union of `unavailable` and `available`. Resolve the owner billing snapshot in `AppLayout`; a billing read failure keeps the truthful unavailable state without breaking navigation.

Add `usage_limit_reached` to the safe intake error contract. Preserve duplicate checking before reservation. Only this error navigates to Limit reached; provider/persistence errors stay in the analysis form.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
npm test -- src/lib/app-shell.test.ts src/app/app/layout.test.tsx src/lib/youtube-intake src/components/app-shell/new-analysis-form.test.tsx
npm run typecheck
```

Expected: PASS.

```bash
git add src/lib/app-shell.ts src/lib/app-shell.test.ts src/app/app/layout.tsx src/app/app/layout.test.tsx src/lib/youtube-intake src/components/app-shell/new-analysis-form.tsx src/components/app-shell/new-analysis-form.test.tsx
git commit -m "feat(den-20): enforce limits in the application shell"
```

### Task 8: Build exact shared billing primitives, Subscription, and Usage screens

**Files:**

- Create: `src/components/billing/billing-icons.tsx`
- Create: `src/components/billing/billing-page.tsx`
- Create: `src/components/billing/subscription-screen.tsx`
- Create: `src/components/billing/subscription-screen.test.tsx`
- Create: `src/components/billing/usage-screen.tsx`
- Create: `src/components/billing/usage-screen.test.tsx`
- Create: `src/styles/billing-reference.css`
- Create: `src/styles/billing-reference.test.ts`
- Modify: `src/app/globals.css`
- Replace: `src/app/app/subscription/page.tsx`
- Create: `src/app/app/subscription/usage/page.tsx`

**Interfaces:**

- Produces: exact approved Subscription and Usage UI consuming closed view models.
- Consumes: Task 3 presentation and Task 5 CSV actions.

- [ ] **Step 1: Write failing semantic and stylesheet contract tests**

Subscription tests assert current plan, monthly/yearly switch, three paid cards, real usage/reset data, current/unavailable/scheduled states, and Portal link. Usage tests assert metrics, searchable/filterable ledger, desktop table, mobile cards, chart accessible summary, CSV action, and empty/error states.

CSS contract must assert:

```ts
expect(css).toContain('--bg:#080a0f');
expect(css).toMatch(
  /\.billing-plan-overview\s*{[^}]*grid-template-columns:\s*1\.65fr repeat\(3,.72fr\)/s,
);
expect(css).toMatch(/@media\s*\(max-width:\s*1120px\)/);
expect(css).toMatch(/@media\s*\(max-width:\s*760px\)/);
expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/components/billing/subscription-screen.test.tsx src/components/billing/usage-screen.test.tsx src/styles/billing-reference.test.ts
```

Expected: FAIL because components/styles do not exist.

- [ ] **Step 3: Port exact approved primitives and CSS**

Namespace every prototype selector under `.billing-experience` to avoid changing History, results, or marketing. Reuse shared design tokens where values already match; introduce billing aliases only in `billing-reference.css`. Port SVG paths exactly into `BillingIcon`.

Use semantic markup, real buttons/links, no inline fixture amounts, and no raw HTML injection. The period switch changes presentation using server-provided monthly/yearly rows.

- [ ] **Step 4: Compose authenticated Server Component routes**

`/app/subscription` and `/app/subscription/usage` verify the user, load owner data, map it through presentation, and render exact loading/error/empty states. URL search parameters validate period, search, event type, and cursor through Zod.

- [ ] **Step 5: Run GREEN and commit**

Run:

```bash
npm test -- src/components/billing src/styles/billing-reference.test.ts src/app/app/subscription
npm run typecheck
```

Expected: PASS.

```bash
git add src/components/billing src/styles/billing-reference.css src/styles/billing-reference.test.ts src/app/globals.css src/app/app/subscription
git commit -m "feat(den-20): build subscription and usage screens"
```

### Task 9: Build exact Checkout, Portal, and Invoices screens

**Files:**

- Create: `src/components/billing/checkout-screen.tsx`
- Create: `src/components/billing/checkout-screen.test.tsx`
- Create: `src/components/billing/portal-screen.tsx`
- Create: `src/components/billing/portal-screen.test.tsx`
- Create: `src/components/billing/invoices-screen.tsx`
- Create: `src/components/billing/invoices-screen.test.tsx`
- Create: `src/app/app/subscription/checkout/page.tsx`
- Create: `src/app/app/subscription/portal/page.tsx`
- Create: `src/app/app/subscription/invoices/page.tsx`

**Interfaces:**

- Produces: exact approved payment and management screens.
- Consumes: Task 5 actions and Task 3 presentation.

- [ ] **Step 1: Write failing screen-state tests**

Checkout covers selected plan/period, authoritative order total, Stripe Element mount, submit disabled/loading, authentication-required, confirming webhook, canceled, and retryable errors.

Portal covers masked payment method, plan/renewal/outstanding balance, real Portal action forms, billing activity, and disabled Team seats with `aria-describedby`.

Invoices covers summary, search/status/year filters, desktop/mobile rendering, hosted/PDF actions, CSV, empty/filtered-empty/error, paid/open/refunded/failed variants.

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/components/billing/checkout-screen.test.tsx src/components/billing/portal-screen.test.tsx src/components/billing/invoices-screen.test.tsx
```

Expected: FAIL because screens do not exist.

- [ ] **Step 3: Implement custom Checkout Sessions UI**

Initialize Stripe.js with `validateStripePublicEnv()` output. Use `CheckoutProvider` and Stripe Elements components supported by `ui_mode: 'custom'`. Apply:

```ts
{
  theme: 'night',
  inputs: 'spaced',
  labels: 'above',
  disableAnimations: reducedMotion,
  variables: {
    colorPrimary: '#ad83ff',
    colorBackground: '#0d1119',
    colorText: '#f5f4f8',
    colorDanger: '#ff6d78',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '10px',
  },
}
```

Stripe owns payment/address fields; Gleen owns only surrounding approved layout and order presentation. Confirming success polls/revalidates the server snapshot with a bounded timeout and never grants access locally.

- [ ] **Step 4: Implement Portal and Invoices**

Every supported Portal control submits a server action that creates a fresh short-lived Stripe Portal session. Team seat controls remain disabled and explained. Invoice links use server-projected Stripe-hosted HTTPS URLs and include `rel="noreferrer"`.

- [ ] **Step 5: Run GREEN and commit**

Run:

```bash
npm test -- src/components/billing src/app/app/subscription
npm run typecheck
```

Expected: PASS.

```bash
git add src/components/billing src/app/app/subscription
git commit -m "feat(den-20): add checkout portal and invoices"
```

### Task 10: Build the exact Limit reached screen and deterministic visual fixtures

**Files:**

- Create: `src/components/billing/limit-reached-screen.tsx`
- Create: `src/components/billing/limit-reached-screen.test.tsx`
- Create: `src/app/app/subscription/limit-reached/page.tsx`
- Create: `src/app/billing-fixture/layout.tsx`
- Create: `src/app/billing-fixture/[screen]/page.tsx`
- Create: `src/lib/billing/fixtures.ts`
- Create: `src/lib/billing/fixtures.test.ts`

**Interfaces:**

- Produces: exact dynamic blocked state and deterministic non-production fixtures for six screens.
- Consumes: Task 3 presentation and Task 7 usage state.

- [ ] **Step 1: Write failing limit and fixture tests**

Assert real values:

```ts
expect(screen.getByText('25 of 25 analyses used')).toBeVisible();
expect(screen.getByText('100%')).toBeVisible();
expect(screen.getByText(/Saved results remain available/)).toBeVisible();
expect(screen.getByRole('link', { name: /Open usage ledger/ })).toHaveAttribute(
  'href',
  '/app/subscription/usage',
);
expect(
  screen.getByRole('button', { name: /Buy extra credits/ }),
).toBeDisabled();
```

Fixtures must cover `free`, `active`, `past-due`, `scheduled-cancel`, `empty-usage`, `failed-invoice`, and `limit-reached` without importing production secrets.

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- src/components/billing/limit-reached-screen.test.tsx src/lib/billing/fixtures.test.ts
```

Expected: FAIL because files do not exist.

- [ ] **Step 3: Implement exact screen and fixtures**

Port locked input, note, prism, progress, reset copy, plan mini-card, upgrade comparison, desktop/mobile stacking, and disabled extra-credit explanation exactly. Route data comes from the owner snapshot, not query parameters.

Guard fixture routes so production returns `notFound()`, matching existing fixture patterns.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
npm test -- src/components/billing/limit-reached-screen.test.tsx src/lib/billing/fixtures.test.ts
npm run typecheck
```

Expected: PASS.

```bash
git add src/components/billing/limit-reached-screen.tsx src/components/billing/limit-reached-screen.test.tsx src/app/app/subscription/limit-reached src/app/billing-fixture src/lib/billing/fixtures.ts src/lib/billing/fixtures.test.ts
git commit -m "feat(den-20): add limit state and billing fixtures"
```

### Task 11: Add end-to-end, visual, accessibility, and reduced-motion coverage

**Files:**

- Create: `tests/e2e/billing.spec.ts`
- Create: `tests/e2e/billing.visual.spec.ts`
- Create: `tests/e2e/billing.visual.spec.ts-snapshots/*-chromium.png`
- Modify: `playwright.config.ts`

**Interfaces:**

- Produces: regression evidence for all six screens and critical billing flows.
- Consumes: Task 10 fixtures and existing Playwright auth helpers.

- [ ] **Step 1: Write failing behavior tests**

Cover authenticated access, plan period switch, usage search/filter/CSV, Checkout safe client payload, Portal actions, invoice filters/links, limit redirect, keyboard order, mobile bottom sheet focus trap/Escape/restore, no horizontal overflow at 320 px, and reduced motion.

- [ ] **Step 2: Run RED**

Run:

```bash
PLAYWRIGHT_PORT=3060 npx playwright test tests/e2e/billing.spec.ts --project=chromium
```

Expected: FAIL until fixture routing and selectors are complete.

- [ ] **Step 3: Add exact desktop/mobile visual tests**

Capture each deterministic fixture at approved desktop geometry and Pixel 7 mobile geometry. Hide only nondeterministic Next.js dev portals. Do not mask billing content, prices, dates, icons, or responsive navigation.

- [ ] **Step 4: Run GREEN**

Run:

```bash
PLAYWRIGHT_PORT=3060 npx playwright test tests/e2e/billing.spec.ts tests/e2e/billing.visual.spec.ts --project=chromium
PLAYWRIGHT_PORT=3061 npx playwright test tests/e2e/billing.spec.ts --project=mobile-chrome
```

Expected: all behavior and visual assertions pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/billing.spec.ts tests/e2e/billing.visual.spec.ts tests/e2e/billing.visual.spec.ts-snapshots playwright.config.ts
git commit -m "test(den-20): verify billing experience"
```

### Task 12: Configure and verify Stripe Sandbox and the production build

**Files:**

- Modify: `docs/codex-setup.md`
- Modify: `docs/architecture.md`
- Modify: `docs/roadmap.md`

**Interfaces:**

- Produces: documented sandbox configuration and verified end-to-end billing state.
- Consumes: all prior tasks.

- [ ] **Step 1: Configure sandbox resources without committing secrets**

Create Stripe Sandbox Products/Prices matching active catalog rows, enable Customer Portal payment method/update/cancel behavior, register `/api/stripe/webhook`, and set Vercel Development/Preview environment values:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Apply Stripe Price IDs to the database through a privileged configuration command and verify no `.env*` file is staged.

- [ ] **Step 2: Verify webhook and lifecycle behavior**

Use Stripe CLI or Sandbox to run:

1. monthly subscription;
2. replayed activation event;
3. one settled analysis;
4. one zero-cost technical retry;
5. renewal;
6. payment failure and `past_due`;
7. payment-method recovery;
8. scheduled downgrade;
9. scheduled cancellation;
10. invoice/refund projection.

Expected: database entitlement, usage, invoice, and UI states match after each step; no duplicate event changes counts.

- [ ] **Step 3: Run the complete repository gate**

Run:

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx supabase db advisors --local
npx supabase migration list --local
PLAYWRIGHT_PORT=3062 npm run test:e2e
```

Expected: every command exits 0 and build output contains no secret/client-boundary warning.

- [ ] **Step 4: Browser verification**

Verify all six routes at desktop, tablet, and 320 px mobile; keyboard-only operation; 200% zoom; bottom-sheet focus; error/empty/disabled states; and `prefers-reduced-motion`. Compare against the approved prototype side by side.

Expected: no visual, console, network, accessibility, or horizontal-overflow regression.

- [ ] **Step 5: Update documentation and commit**

Document only variable names, setup flow, webhook event types, database responsibility boundaries, and verification commands. Never record secret values.

```bash
git add docs/codex-setup.md docs/architecture.md docs/roadmap.md
git commit -m "docs(den-20): document billing operations"
```

## Final Review Checklist

- [ ] The approved prototype asset is byte-identical and unchanged.
- [ ] All six screens match desktop/mobile/reduced-motion references one-to-one.
- [ ] No visual component hard-codes a plan, price, currency, limit, tax, or reset date.
- [ ] Free fallback exists and Team/extra-credit actions are truthful and disabled.
- [ ] Checkout uses custom Checkout Sessions + Stripe Elements; Gleen never handles raw card data.
- [ ] Webhooks verify raw-body signatures, are idempotent, reject stale projections, and retry transient failures.
- [ ] Entitlement/usage reservation is atomic under concurrency.
- [ ] Duplicate reuse and technical retries cost zero; usable results settle one; total failures release one.
- [ ] RLS, grants, indexes, advisors, and authenticated/anonymous database checks pass.
- [ ] Format, lint, typecheck, tests, build, Playwright, browser, mobile, keyboard, 200% zoom, and reduced-motion checks pass.
- [ ] Stripe Sandbox lifecycle passes before any live-mode configuration.

# DEN-20 Prorated Plan Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change an existing paid Gleen subscription through Stripe Customer Portal with immediate prorated upgrades, end-of-period downgrades, and no duplicate Checkout subscriptions.

**Architecture:** The Subscription screen routes paid customers to a server-owned Stripe Portal deep link for a specific target plan while free customers continue to Checkout. Both Checkout and plan-change actions resolve the authenticated user's Stripe Customer and current subscription server-side; Checkout fails closed when any non-terminal subscription already exists. Verified webhooks project future `cancel_at` cancellations and tolerate invoices arriving before their subscription projection.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9 strict mode, Stripe SDK 20.4, Supabase Postgres 17, Vitest 4, Playwright 1.61.

## Global Constraints

- Preserve the dark-only “The Prism” design and the approved `design/reference-v3/` / `design/screenshots/` geometry.
- Do not add a production dependency.
- Do not hard-code plan IDs, Price IDs, amounts, usage limits, currencies, or proration amounts in visual components.
- Stripe remains authoritative for subscriptions, prorations, invoices, and payment outcomes; Supabase remains authoritative for Gleen entitlements.
- The browser may submit only a plan slug and billing interval; customer, subscription, item, Price ID, amount, and proration are server-resolved.
- Upgrades apply only after Stripe successfully collects the prorated invoice; failed payment preserves the current plan.
- Downgrades apply at the end of the paid period with no immediate refund.
- All UI changes must support desktop, mobile, keyboard navigation, and `prefers-reduced-motion`.
- Never commit `.env` files, credentials, Stripe secrets, or Vercel bypass tokens.

---

### Task 1: Close Checkout and Portal action boundaries

**Files:**

- Modify: `src/env.ts`
- Modify: `src/env.test.ts`
- Modify: `src/lib/billing/actions.ts`
- Modify: `src/lib/billing/actions.test.ts`

**Interfaces:**

- Consumes: `BillingActionAdminRepository.resolvePurchasablePrice(plan, interval): Promise<string | null>` and `BillingRepository.getOwnedCustomerId(userId): Promise<string | null>`.
- Produces: `createPlanChangePortalSession(input: CheckoutActionInput): Promise<PortalResult>`.
- Produces: `ActionErrorCode` member `subscription_already_exists`.
- Produces: `BillingStripeClient.subscriptions.list(...)` and `BillingStripeClient.billingPortal.configurations.retrieve(...)` test seams.
- Produces: `validateStripePortalEnv(input): StripePortalEnv` with
  `STRIPE_PORTAL_CONFIGURATION_ID: string`.

- [ ] **Step 1: Add failing environment tests for the Portal configuration ID**

Add cases to `src/env.test.ts` proving the server schema rejects a missing or malformed value and trims a valid `bpc_` identifier:

```ts
expect(() => validateStripePortalEnv({})).toThrow(
  'STRIPE_PORTAL_CONFIGURATION_ID is required',
);

expect(
  validateStripePortalEnv({
    STRIPE_PORTAL_CONFIGURATION_ID: ' bpc_test_prorated ',
  }),
).toEqual({
  STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_test_prorated',
});
```

- [ ] **Step 2: Run the environment test and verify the red state**

Run:

```bash
npx vitest run src/env.test.ts
```

Expected: FAIL because `STRIPE_PORTAL_CONFIGURATION_ID` is neither required nor returned.

- [ ] **Step 3: Validate the server-only Portal configuration ID**

Add a focused server-only environment type and validator in `src/env.ts` so
webhook processing continues to require only its existing Stripe secrets:

```ts
export type StripePortalEnv = Readonly<{
  STRIPE_PORTAL_CONFIGURATION_ID: string;
}>;

export function validateStripePortalEnv(
  input: Readonly<Partial<NodeJS.ProcessEnv>>,
): StripePortalEnv {
  const configurationId = input.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
  if (!configurationId) {
    throw new Error('STRIPE_PORTAL_CONFIGURATION_ID is required');
  }
  if (!configurationId.startsWith('bpc_')) {
    throw new Error('STRIPE_PORTAL_CONFIGURATION_ID must start with bpc_');
  }
  return Object.freeze({
    STRIPE_PORTAL_CONFIGURATION_ID: configurationId,
  });
}
```

Do not add the value to `StripeServerEnv` or the public environment schema.

- [ ] **Step 4: Add failing action tests for duplicate prevention and a specific plan-change flow**

Extend `createStripe()` in `src/lib/billing/actions.test.ts` with:

```ts
subscriptions: {
  list: vi.fn(async () => ({ data: [] })),
},
billingPortal: {
  configurations: {
    retrieve: vi.fn(async () => ({
      features: {
        subscription_update: {
          enabled: true,
          proration_behavior: 'always_invoice',
          products: [
            {
              product: 'prod_gleen',
              prices: ['price_server_owned'],
            },
          ],
        },
      },
    })),
  },
  sessions: {
    create: vi.fn(async () => ({
      url: 'https://billing.stripe.com/p/session/test',
    })),
  },
},
```

Add a Checkout test whose Stripe subscription list contains one active subscription:

```ts
vi.mocked(stripe.subscriptions.list).mockResolvedValue({
  data: [
    {
      id: 'sub_active',
      status: 'active',
      items: { data: [{ id: 'si_current', price: { id: 'price_current' } }] },
    },
  ],
} as never);

await expect(
  actions.createCheckoutForUser({
    userId: 'u1',
    email: 'owner@example.test',
    plan: 'prism-pro',
    interval: 'month',
  }),
).resolves.toEqual({
  ok: false,
  code: 'subscription_already_exists',
});
expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
```

Cover every non-terminal Stripe state:

```ts
it.each([
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
] as const)('blocks Checkout for a %s subscription', async (status) => {
  const stripe = createStripe();
  vi.mocked(stripe.subscriptions.list).mockResolvedValue({
    data: [
      {
        id: 'sub_existing',
        status,
        items: {
          data: [
            {
              id: 'si_existing',
              price: { id: 'price_current' },
            },
          ],
        },
      },
    ],
  } as never);
  const { actions } = createActions({ stripe });

  await expect(
    actions.createCheckoutForUser({
      userId: 'u1',
      email: 'owner@example.test',
      plan: 'prism-pro',
      interval: 'month',
    }),
  ).resolves.toEqual({
    ok: false,
    code: 'subscription_already_exists',
  });
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});
```

Add a plan-change test proving the action sends only server-owned identifiers:

```ts
expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
  configuration: 'bpc_test_prorated',
  customer: 'cus_owned',
  return_url: 'https://gleen.example/app/subscription',
  flow_data: {
    type: 'subscription_update_confirm',
    subscription_update_confirm: {
      subscription: 'sub_active',
      items: [{ id: 'si_current', price: 'price_server_owned' }],
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        return_url: 'https://gleen.example/app/subscription',
      },
    },
  },
});
```

Also assert that plan change fails closed without calling `sessions.create` when:

- the customer mapping is absent;
- the target catalog price is unavailable;
- there is no non-terminal subscription;
- there is more than one non-terminal subscription;
- the subscription has zero or multiple items;
- the configured Portal does not use `always_invoice`;
- the target Price is absent from the configuration.

- [ ] **Step 5: Run the action tests and verify the red state**

Run:

```bash
npx vitest run src/lib/billing/actions.test.ts
```

Expected: FAIL because subscription listing, configuration validation, the controlled error, and the specific Portal flow do not exist.

- [ ] **Step 6: Implement one reusable non-terminal subscription resolver**

In `src/lib/billing/actions.ts`, add the closed status set and resolver:

```ts
const terminalSubscriptionStatuses = new Set<Stripe.Subscription.Status>([
  'canceled',
  'incomplete_expired',
]);

async function listNonTerminalSubscriptions(
  stripe: BillingStripeClient,
  customerId: string,
) {
  const result = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });
  return result.data.filter(
    (subscription) => !terminalSubscriptionStatuses.has(subscription.status),
  );
}
```

Extend `BillingStripeClient` with the exact `subscriptions.list` and Portal configuration methods used by this resolver and the plan-change action. Keep the return projections narrow enough for tests but structurally compatible with the Stripe SDK.
Add `portalConfigurationId: string` to `BillingActionsDependencies`, populate it
from `validateStripePortalEnv(process.env)` in `productionBillingActions`, and
use `'bpc_test_prorated'` in `createActions()` tests.

- [ ] **Step 7: Block repeat Checkout before creating a session**

After resolving or creating `ownedCustomerId`, call `listNonTerminalSubscriptions`. When the list is non-empty, return:

```ts
return actionFailure('subscription_already_exists');
```

Do this before `stripe.checkout.sessions.create`. A newly created customer still goes through the same check so replay and partial-recovery paths remain safe.

- [ ] **Step 8: Implement the authenticated plan-change Portal action**

Add a strict input schema containing `userId`, `plan`, and `interval`. Resolve the owned customer and target price, require exactly one non-terminal single-item subscription, retrieve the configured Portal configuration, and verify:

```ts
const update = configuration.features.subscription_update;
const allowedPrices =
  update.products?.flatMap((product) => product.prices) ?? [];

if (
  !update.enabled ||
  update.proration_behavior !== 'always_invoice' ||
  !allowedPrices.includes(ownedPriceId)
) {
  return actionFailure('billing_unavailable');
}
```

Create `subscription_update_confirm` with the owned subscription ID, owned item ID, server-resolved target Price ID, and a return URL on the current Preview origin. Export:

```ts
export async function createPlanChangePortalSession(
  input: CheckoutActionInput,
): Promise<PortalResult>;
```

Authenticate internally and close the public action input:

```ts
export async function createPlanChangePortalSession(
  input: CheckoutActionInput,
): Promise<PortalResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  const parsed = checkoutActionInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure('invalid_request');
  return productionBillingActions(
    context.supabase,
    await requestBillingAppUrl(),
  ).createPlanChangePortalForUser({
    userId: context.userId,
    ...parsed.data,
  });
}
```

The strict `checkoutActionInputSchema` rejects extra identity, customer,
subscription, item, Price, and amount fields.

- [ ] **Step 9: Run the focused tests and make them green**

Run:

```bash
npx vitest run src/env.test.ts src/lib/billing/actions.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit the closed server boundary**

```bash
git add src/env.ts src/env.test.ts src/lib/billing/actions.ts src/lib/billing/actions.test.ts
git commit -m "fix(billing): prevent duplicate subscriptions"
```

---

### Task 2: Route paid plan choices to prorated Portal confirmation

**Files:**

- Modify: `src/components/billing/subscription-screen.tsx`
- Modify: `src/components/billing/subscription-screen.test.tsx`
- Modify: `src/app/app/subscription/portal/page.tsx`
- Modify: `src/components/billing/portal-screen.tsx`
- Modify: `src/components/billing/portal-screen.test.tsx`
- Modify: `src/app/billing-fixture/[screen]/fixture-screen.tsx`
- Modify: `tests/e2e/billing.spec.ts`

**Interfaces:**

- Consumes: `createPlanChangePortalSession({ plan, interval })`.
- Consumes: `SubscriptionPresentation.currentPrice` and `SubscriptionPresentation.entitlement.key`.
- Produces: plan-change query contract `/app/subscription/portal?plan=<slug>&interval=<month|year>`.
- Produces: `PortalScreen` prop `planChange: CheckoutActionInput | null`.

- [ ] **Step 1: Add failing component tests for paid and free plan links**

In `src/components/billing/subscription-screen.test.tsx`, assert an active paid presentation links a non-current purchasable plan to Portal:

```ts
expect(screen.getByRole('link', { name: 'Change to Starter' })).toHaveAttribute(
  'href',
  '/app/subscription/portal?plan=starter&interval=month',
);
```

Render a Free presentation with `currentPrice: null` and assert its paid plan link remains:

```ts
expect(screen.getByRole('link', { name: 'Choose Starter' })).toHaveAttribute(
  'href',
  '/app/subscription/checkout?plan=starter&interval=month',
);
```

Add a Portal component test with `planChange={{ plan: 'prism-pro', interval: 'month' }}`. Assert the page announces the selected target and calls the specific action with only:

```ts
{ plan: 'prism-pro', interval: 'month' }
```

- [ ] **Step 2: Run component tests and verify the red state**

Run:

```bash
npx vitest run src/components/billing/subscription-screen.test.tsx src/components/billing/portal-screen.test.tsx
```

Expected: FAIL because paid alternatives still link to Checkout and Portal has no plan-change intent.

- [ ] **Step 3: Route only paid alternatives to Portal**

In `SubscriptionScreen`, derive:

```ts
const hasPaidSubscription =
  presentation.currentPrice !== null &&
  ['active', 'trial', 'past_due_with_access'].includes(
    presentation.entitlement.key,
  );
```

For an available non-current plan:

```ts
const actionLabel = current
  ? 'Manage plan'
  : hasPaidSubscription
    ? `Change to ${row.plan.displayName}`
    : `Choose ${row.plan.displayName}`;

const href = hasPaidSubscription
  ? `/app/subscription/portal?plan=${encodeURIComponent(
      row.plan.slug,
    )}&interval=${interval}`
  : `/app/subscription/checkout?plan=${encodeURIComponent(
      row.plan.slug,
    )}&interval=${interval}`;
```

Do not calculate or display a made-up difference; Stripe shows the exact proration before confirmation.

- [ ] **Step 4: Parse a closed plan-change query on the Portal page**

In `src/app/app/subscription/portal/page.tsx`, accept `searchParams` as a promise and validate `plan` and `interval` with the existing billing schemas. Invalid, incomplete, Free, and Team targets resolve to `null`. Pass the valid intent and both Portal actions to `PortalScreen`:

```tsx
<PortalScreen
  subscription={portalSubscription}
  activity={activity}
  portalAction={createPortalSession}
  planChangeAction={createPlanChangePortalSession}
  planChange={planChange}
/>
```

- [ ] **Step 5: Add a restrained confirmation action to PortalScreen**

When `planChange` is non-null, render one accessible status/description above Plan management and change the primary label to `Review plan change in Stripe`. Its click calls:

```ts
await planChangeAction(planChange);
```

All other Portal controls continue to call the generic zero-argument action. Reuse the existing `opening`, error live region, concurrency guard, and `window.location.assign` path.

- [ ] **Step 6: Update deterministic fixtures and browser expectations**

Update the fixture boundary so a specific plan-change action records exactly:

```json
{ "plan": "prism-pro", "interval": "year" }
```

Change the active Subscription E2E expectation from Checkout to:

```ts
await expect(
  page.getByRole('link', { name: 'Change to Prism Pro' }),
).toHaveAttribute(
  'href',
  '/app/subscription/portal?plan=prism-pro&interval=year',
);
```

Add a Free fixture assertion that `Choose Starter` still links to Checkout.

- [ ] **Step 7: Run focused unit and E2E tests**

Run:

```bash
npx vitest run src/components/billing/subscription-screen.test.tsx src/components/billing/portal-screen.test.tsx 'src/app/billing-fixture/[screen]/page.test.tsx'
PLAYWRIGHT_PORT=3076 npx playwright test tests/e2e/billing.spec.ts --project=chromium --grep "switches monthly|Portal action"
```

Expected: PASS.

- [ ] **Step 8: Commit the paid plan-change UX**

```bash
git add src/components/billing/subscription-screen.tsx src/components/billing/subscription-screen.test.tsx src/app/app/subscription/portal/page.tsx src/components/billing/portal-screen.tsx src/components/billing/portal-screen.test.tsx 'src/app/billing-fixture/[screen]/fixture-screen.tsx' tests/e2e/billing.spec.ts
git commit -m "feat(billing): route plan changes through Stripe Portal"
```

---

### Task 3: Project scheduled cancellation and out-of-order invoices

**Files:**

- Create: `supabase/migrations/20260731020000_den_20_resilient_subscription_invoice_projection.sql`
- Modify: `src/lib/billing/webhook.ts`
- Modify: `src/lib/billing/webhook.test.ts`
- Modify: `src/lib/billing/database-contract.test.ts`

**Interfaces:**

- Consumes: existing `SubscriptionProjection.cancelAtPeriodEnd` and `cancellationEffectiveAt`.
- Consumes: existing `apply_billing_invoice_projection(...)` signature.
- Produces: `billing_invoices.stripe_subscription_id text`.
- Produces: trigger function `private.link_billing_invoice_subscription()`.

- [ ] **Step 1: Add a failing webhook test for Stripe's explicit future `cancel_at` form**

In `src/lib/billing/webhook.test.ts`, process:

```ts
subscription({
  cancel_at_period_end: false,
  cancel_at: eventCreated + 2_678_400,
});
```

Assert `applySubscription` receives:

```ts
expect.objectContaining({
  cancelAtPeriodEnd: true,
  cancellationEffectiveAt: new Date(
    (eventCreated + 2_678_400) * 1_000,
  ).toISOString(),
});
```

Retain and run the existing no-cancellation and completed-cancellation
assertions in the same suite so the new branch does not change either
projection.

- [ ] **Step 2: Run the webhook test and verify the red state**

Run:

```bash
npx vitest run src/lib/billing/webhook.test.ts
```

Expected: FAIL because future `cancel_at` is ignored when `cancel_at_period_end` is false.

- [ ] **Step 3: Normalize both scheduled cancellation representations**

In `subscriptionProjection`, derive:

```ts
const explicitCancelAt = nullableTimestamp(subscription.cancel_at);
const scheduledCancellation =
  status.data !== 'canceled' &&
  (booleanValue(subscription.cancel_at_period_end) ||
    explicitCancelAt !== null);
const cancellationEffectiveAt = scheduledCancellation
  ? (explicitCancelAt ?? currentPeriodEnd)
  : status.data === 'canceled'
    ? (nullableTimestamp(subscription.ended_at) ??
      nullableTimestamp(subscription.canceled_at) ??
      currentPeriodEnd)
    : null;
```

Return `cancelAtPeriodEnd: scheduledCancellation`. This domain flag means “scheduled to end” even when Stripe uses explicit `cancel_at`.

- [ ] **Step 4: Add failing database-contract tests for invoice-before-subscription ordering**

In `src/lib/billing/database-contract.test.ts`, discover the new migration by its `_den_20_resilient_subscription_invoice_projection.sql` suffix and assert it:

```ts
expect(resilientInvoiceSql).toContain(
  'add column if not exists stripe_subscription_id text',
);
expect(resilientInvoiceSql).not.toContain('into strict subscription');
expect(resilientInvoiceSql).toContain(
  'new.stripe_subscription_id = subscription.stripe_subscription_id',
);
expect(resilientInvoiceSql).toContain(
  'after insert or update of stripe_subscription_id',
);
expect(resilientInvoiceSql).toContain(
  'revoke all on function public.apply_billing_invoice_projection',
);
expect(resilientInvoiceSql).toContain(
  'grant execute on function public.apply_billing_invoice_projection',
);
```

- [ ] **Step 5: Run the database contract and verify the red state**

Run:

```bash
npx vitest run src/lib/billing/database-contract.test.ts
```

Expected: FAIL because the forward migration does not exist.

- [ ] **Step 6: Add the forward-only resilient invoice migration**

Create `supabase/migrations/20260731020000_den_20_resilient_subscription_invoice_projection.sql` that:

1. adds nullable `billing_invoices.stripe_subscription_id text` with a Stripe ID check;
2. backfills it from the currently linked `billing_subscriptions` row;
3. replaces `public.apply_billing_invoice_projection(...)` without changing its signature;
4. selects a projected subscription without `STRICT`, allowing `subscription_id` to remain null;
5. stores `target_external_subscription_id` in `stripe_subscription_id`;
6. preserves ownership, catalog, stale-event, paid-through, security-invoker, empty-search-path, revoke, and service-role grant behavior from the latest applied function;
7. creates `private.link_billing_invoice_subscription()` so insert/update of a subscription links matching unlinked invoices owned by the same user;
8. creates an `AFTER INSERT OR UPDATE OF stripe_subscription_id` trigger on `billing_subscriptions`;
9. revokes default execution on the private trigger function.

The trigger update must be owner-scoped:

```sql
update public.billing_invoices as invoice
set subscription_id = new.id
where invoice.user_id = new.user_id
  and invoice.stripe_subscription_id = new.stripe_subscription_id
  and invoice.subscription_id is null;
```

- [ ] **Step 7: Run webhook and database tests**

Run:

```bash
npx vitest run src/lib/billing/webhook.test.ts src/lib/billing/database-contract.test.ts src/lib/billing/supabase-projection-repository.test.ts
```

Expected: PASS.

- [ ] **Step 8: Apply and validate the migration on the linked staging Supabase project**

Before applying, fetch `https://supabase.com/changelog.md` and the current official migration/RLS guidance required by the Supabase skill. Apply only the new migration through the Supabase migration tool, then run:

```sql
select stripe_invoice_id, stripe_subscription_id, subscription_id
from public.billing_invoices
where user_id = '52013ae4-99c9-409a-a492-b38895ec4e61'
order by created_at desc;
```

Expected: all subscription invoices retain their external subscription ID; known subscriptions have a non-null internal `subscription_id`.

Run Supabase security and performance advisors. Record any pre-existing unrelated findings separately; fix any finding introduced by this migration before continuing.

- [ ] **Step 9: Commit the projection repair**

```bash
git add src/lib/billing/webhook.ts src/lib/billing/webhook.test.ts src/lib/billing/database-contract.test.ts supabase/migrations/20260731020000_den_20_resilient_subscription_invoice_projection.sql
git commit -m "fix(billing): project scheduled changes reliably"
```

---

### Task 4: Configure Stripe Sandbox for controlled prorated changes

**Files:**

- Modify: `docs/superpowers/specs/2026-07-30-den-20-billing-usage-design.md` only if the verified Stripe limitation differs from the approved design.
- No secrets or environment files are committed.

**Interfaces:**

- Consumes: all active purchasable Stripe Product and Price IDs from the staging catalog.
- Produces: one Sandbox Portal configuration ID stored as `STRIPE_PORTAL_CONFIGURATION_ID` in Vercel Preview.

- [ ] **Step 1: Inspect the current catalog without exposing secrets**

Query the staging catalog for active purchasable plans, Stripe Price IDs, intervals, and amounts. Retrieve those Prices from Stripe to group them by Stripe Product. Do not print keys or full environment output.

- [ ] **Step 2: Create or update one Sandbox Portal configuration**

Through Stripe Dashboard or the Stripe API, configure:

- subscription updates enabled;
- price changes enabled;
- every active purchasable Gleen Product and Price allowed;
- `proration_behavior=always_invoice`;
- downgrade condition `decreasing_item_amount` scheduled at period end;
- shorter-interval downgrade scheduled at period end;
- cancellation at period end.

If Stripe rejects scheduled downgrades because the catalog uses separate Products, stop before changing the catalog and report the exact product constraint. Do not silently recreate Products or Prices.

- [ ] **Step 3: Store the configuration ID in the correct Vercel scope**

Add `STRIPE_PORTAL_CONFIGURATION_ID` to the same Preview project/environment that serves:

```text
gleen-staging-denkach-denisito-projects.vercel.app
```

Redeploy the exact branch commit after all code tasks pass. Never paste the ID or any secret into Git.

- [ ] **Step 4: Verify the configuration fail-closed behavior**

Temporarily point a local test dependency at a configuration fixture using `proration_behavior=none`; assert `createPlanChangePortalForUser` returns `billing_unavailable`. Restore the valid fixture and assert the session is created.

- [ ] **Step 5: Record the verified Stripe behavior**

Confirm in Sandbox that Stripe's confirmation page displays:

- credit for unused time on the current plan;
- charge for remaining time on the target plan;
- only the net prorated amount due now;
- unchanged renewal anchor for an upgrade;
- end-of-period effective date for a supported downgrade.

---

### Task 5: Full verification and sandbox acceptance

**Files:**

- Modify: `.superpowers/sdd/2026-07-30-den-20-billing-usage/task-11-report.md`

**Interfaces:**

- Consumes: the completed server boundary, UI routing, webhook migration, Stripe configuration, and deployed Preview.
- Produces: evidence-backed Task 11 acceptance report.

- [ ] **Step 1: Run formatting**

Run:

```bash
npm run format
npm run format:check
```

Expected: both commands exit 0.

- [ ] **Step 2: Run static verification**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 3: Run unit and integration tests**

Run:

```bash
npm test
```

Expected: all Vitest suites pass.

- [ ] **Step 4: Run the production build**

Run:

```bash
npm run build
```

Expected: Next.js production build exits 0 with all protected billing routes compiled.

- [ ] **Step 5: Run billing Playwright coverage**

Run:

```bash
CI=1 PLAYWRIGHT_PORT=3076 npx playwright test tests/e2e/billing.spec.ts --project=chromium
CI=1 PLAYWRIGHT_PORT=3077 npx playwright test tests/e2e/billing.spec.ts --project=mobile-chrome
```

Expected: desktop and mobile billing tests pass with no horizontal overflow, keyboard regression, or fixture secret leakage.

- [ ] **Step 6: Verify reduced motion**

Run the billing fixture with Playwright reduced-motion emulation and assert plan selection, Portal launch, error states, and redirects remain functional without transition-dependent waits.

- [ ] **Step 7: Deploy and verify the real Sandbox upgrade**

Deploy the tested commit to the approved Preview. In Chrome:

1. open Subscription as the authenticated owner;
2. choose a higher plan;
3. confirm the app opens a specific Stripe `subscription_update_confirm` flow;
4. verify Stripe displays only the net prorated difference;
5. complete payment with a Stripe test card;
6. verify exactly one non-terminal subscription remains for the selected account;
7. verify the paid invoice appears once;
8. verify Supabase entitlement changes only after the processed webhook;
9. verify returning to Subscription displays the upgraded plan.

- [ ] **Step 8: Verify payment failure and downgrade**

Use Stripe test behavior to fail the upgrade payment and verify the previous plan remains active. Then request a supported downgrade and verify Stripe schedules it for the renewal date without an immediate refund or entitlement reduction.

- [ ] **Step 9: Verify scheduled cancellation projection**

Cancel at period end in Portal and query the exact subscription row. Expected:

```text
status = active
cancel_at_period_end = true
cancellation_effective_at = current_period_end or explicit cancel_at
```

Prism Pro or the current selected plan remains accessible until that timestamp.

- [ ] **Step 10: Update the acceptance report**

Record:

- changed files and commits;
- format, lint, typecheck, test, build, desktop, mobile, and reduced-motion results;
- Stripe Portal configuration behavior;
- exact Sandbox flows exercised;
- Supabase advisor results;
- remaining catalog/product constraints;
- the older unrelated Starter subscription that was deliberately not canceled without separate authorization.

- [ ] **Step 11: Final verification commit**

```bash
git add .superpowers/sdd/2026-07-30-den-20-billing-usage/task-11-report.md
git commit -m "docs(billing): record prorated plan verification"
```

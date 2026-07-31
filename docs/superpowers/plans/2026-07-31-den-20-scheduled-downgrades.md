# DEN-20 Split Upgrade and Scheduled Downgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make paid-plan upgrades immediate with Stripe's authoritative net proration while scheduling every downgrade at the current paid-period boundary without creating duplicate subscriptions.

**Architecture:** A server-only catalog classifier routes upgrades to the existing target-aware Stripe Customer Portal configuration and routes downgrades to a Gleen-owned Stripe Subscription Schedule. Schedule webhooks use a dedicated, independently ordered Supabase projection so normal subscription events cannot erase a pending downgrade; the existing Subscription and Invoice projections remain authoritative when the phase actually changes and payment is collected.

**Tech Stack:** Next.js 16 App Router and Server Actions, React 19, TypeScript 5.9 strict mode, Stripe Node SDK 20.4.1, Supabase/Postgres migrations, Zod 4, Vitest 4, Testing Library, Playwright 1.61.

## Global Constraints

- Work only in the DEN-20 branch/worktree and keep the change focused on upgrade, downgrade, cancellation, webhook projection, and verification.
- Stripe Sandbox/Test Mode is the only payment environment used by this plan; do not create live-mode charges or configuration.
- The server accepts only stable plan slug and interval from the browser. It never accepts a customer ID, subscription ID, Product ID, Price ID, amount, currency, or proration amount from the client.
- Higher catalog order is an upgrade; lower catalog order is a downgrade. Within one tier, month-to-year is immediate and year-to-month is deferred.
- Upgrades use the dedicated target-aware Portal configuration with `proration_behavior=always_invoice`; Stripe calculates and displays the monetary difference.
- Downgrades preserve the current plan and entitlement through the current item `current_period_end`, create no immediate refund or credit, and take effect only through verified webhooks.
- Exactly one non-terminal, single-item Stripe Subscription is required. Multiple subscriptions, unknown prices, external schedules, incompatible schedules, and stale ownership all fail closed.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID`, and `SUPABASE_SECRET_KEY` remain server-only. Do not add or commit `.env` files or credentials.
- Do not add a production dependency; the pinned Stripe, Supabase, Next.js, React, Zod, Vitest, and Playwright versions already cover this work.
- Preserve the approved dark-only “The Prism” billing UI. Reuse existing tokens and components; do not redesign cards or add one-off color values.
- UI behavior must remain keyboard accessible, mobile-safe at 320px, and inert under `prefers-reduced-motion: reduce`.
- All webhook mutations require a verified raw-body signature, an idempotently claimed Stripe Event, and a privileged atomic RPC.
- Public-schema database objects require explicit grants. New privileged functions must set `search_path = ''`, reject non-`service_role` callers, revoke `PUBLIC`/`anon`/`authenticated` execution, and grant only the required `service_role` wrapper.
- Create the migration with `npx supabase migration new den_20_scheduled_plan_change_projection`; do not hand-invent its timestamp.
- Primary references: [Stripe schedule creation](https://docs.stripe.com/api/subscription_schedules/create), [schedule updates](https://docs.stripe.com/billing/subscriptions/subscription-schedules#update-subscription-schedules), [schedule release](https://docs.stripe.com/api/subscription_schedules/release), and [Portal configuration limits](https://docs.stripe.com/customer-management/configure-portal).

---

## File Map

- Create `src/lib/billing/plan-change.ts`: pure catalog-order and interval direction policy.
- Create `src/lib/billing/plan-change.test.ts`: exhaustive policy tests independent of Stripe.
- Create `src/lib/billing/subscription-schedule.ts`: server-only Stripe Schedule creation, replacement, retry, and release logic.
- Create `src/lib/billing/subscription-schedule.test.ts`: Stripe call-shape, ownership, compatibility, and idempotency tests.
- Modify `src/lib/billing/actions.ts`: route a plan change to Portal or Schedule and expose cancel-scheduled-downgrade Server Action.
- Modify `src/lib/billing/actions.test.ts`: action-boundary authorization, server-owned identifiers, upgrade, downgrade, retry, and conflict tests.
- Create via Supabase CLI `supabase/migrations/*_den_20_scheduled_plan_change_projection.sql`: independent schedule projection columns, trigger, RPCs, ACLs, and indexes.
- Modify `src/lib/billing/database-contract.test.ts`: migration, security, ordering, and preservation contracts.
- Modify `src/lib/billing/repository.ts`: `ScheduledChangeProjection` schema and repository method.
- Modify `src/lib/billing/supabase-projection-repository.ts`: call the schedule projection service-role RPC.
- Modify `src/lib/billing/supabase-projection-repository.test.ts`: exact RPC boundary tests.
- Modify `src/lib/billing/webhook.ts`: parse and project schedule lifecycle events.
- Modify `src/lib/billing/webhook.test.ts`: owned schedule, clear, duplicate, malformed, unknown-price, and out-of-order tests.
- Modify `src/app/app/subscription/portal/page.tsx`: pass the split action results, projected scheduled state, and cancel action to the client screen.
- Modify `src/components/billing/portal-screen.tsx`: redirect only upgrades; announce scheduled/canceled downgrades and expose cancellation.
- Modify `src/components/billing/portal-screen.test.tsx`: client behavior and accessibility tests.
- Modify `src/app/billing-fixture/[screen]/fixture-screen.tsx`: deterministic upgrade, downgrade, cancel, and error action fixtures.
- Modify `src/app/billing-fixture/[screen]/page.tsx`: allow the new portal fixture boundary values.
- Modify `tests/e2e/billing.spec.ts`: closed client payload, no-redirect downgrade, cancel, concurrency, mobile, and reduced-motion coverage.
- Modify `.superpowers/sdd/2026-07-30-den-20-billing-usage/task-11-report.md`: final automated and Sandbox acceptance evidence.

---

### Task 1: Encode the Server-Authoritative Plan-Change Policy

**Files:**

- Create: `src/lib/billing/plan-change.ts`
- Create: `src/lib/billing/plan-change.test.ts`

**Interfaces:**

- Consumes: `BillingSnapshot`, `BillingPlanSlug`, and `BillingInterval` from `src/lib/billing/domain.ts`.
- Produces:

```ts
export type PlanChangeTarget = Readonly<{
  plan: BillingPlanSlug;
  interval: BillingInterval;
}>;

export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'unchanged';

export class PlanChangePolicyError extends Error {}

export function classifyPlanChange(
  snapshot: BillingSnapshot,
  target: PlanChangeTarget,
): PlanChangeDirection;
```

- The function uses the order of `snapshot.availablePlans`, which is already parsed from database `display_order`; it never compares display prices or browser values.
- It throws the exported controlled `PlanChangePolicyError` when the current paid price is absent, either plan is missing from the server catalog, or the target interval is unavailable for the target plan.

- [ ] **Step 1: Write the failing policy tests**

Add table-driven cases using a snapshot whose catalog order is `free`, `starter`, `prism-pro`, `team`:

```ts
it.each([
  ['starter', 'month', 'prism-pro', 'month', 'upgrade'],
  ['starter', 'year', 'prism-pro', 'month', 'upgrade'],
  ['prism-pro', 'month', 'starter', 'year', 'downgrade'],
  ['prism-pro', 'year', 'starter', 'month', 'downgrade'],
  ['starter', 'month', 'starter', 'year', 'upgrade'],
  ['starter', 'year', 'starter', 'month', 'downgrade'],
  ['starter', 'month', 'starter', 'month', 'unchanged'],
] as const)(
  '%s/%s -> %s/%s is %s',
  (currentPlan, currentInterval, targetPlan, targetInterval, expected) => {
    expect(
      classifyPlanChange(snapshotFor(currentPlan, currentInterval), {
        plan: targetPlan,
        interval: targetInterval,
      }),
    ).toBe(expected);
  },
);
```

Also assert fail-closed behavior for a Free/no-price snapshot, a missing target plan, and a target plan without the requested interval.

- [ ] **Step 2: Run the test and verify the red state**

Run: `npx vitest run src/lib/billing/plan-change.test.ts`

Expected: FAIL because `plan-change.ts` and `classifyPlanChange` do not exist.

- [ ] **Step 3: Implement the minimal pure classifier**

Implement the policy in this order:

```ts
const currentIndex = snapshot.availablePlans.findIndex(
  ({ plan }) => plan.slug === snapshot.currentPlan.slug,
);
const targetIndex = snapshot.availablePlans.findIndex(
  ({ plan }) => plan.slug === target.plan,
);

if (snapshot.currentPrice === null || currentIndex < 0 || targetIndex < 0) {
  throw new PlanChangePolicyError();
}
if (
  !snapshot.availablePlans[targetIndex]!.prices.some(
    ({ interval }) => interval === target.interval,
  )
) {
  throw new PlanChangePolicyError();
}
if (targetIndex > currentIndex) return 'upgrade';
if (targetIndex < currentIndex) return 'downgrade';
if (target.interval === snapshot.currentPrice.interval) return 'unchanged';
return snapshot.currentPrice.interval === 'month' && target.interval === 'year'
  ? 'upgrade'
  : 'downgrade';
```

Export `PlanChangePolicyError` only so the action layer can convert that controlled policy failure and tests can assert `instanceof`; do not export catalog ordering constants.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run src/lib/billing/plan-change.test.ts src/lib/billing/domain.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the policy unit**

```bash
git add src/lib/billing/plan-change.ts src/lib/billing/plan-change.test.ts
git commit -m "feat(billing): classify plan change direction"
```

---

### Task 2: Build the Gleen-Owned Stripe Subscription Schedule Orchestrator

**Files:**

- Create: `src/lib/billing/subscription-schedule.ts`
- Create: `src/lib/billing/subscription-schedule.test.ts`

**Interfaces:**

- Consumes: a validated owned single-item Stripe subscription and the server-resolved target Price.
- Produces:

```ts
export type OwnedSingleItemSubscription = Readonly<{
  id: string;
  schedule: string | Pick<Stripe.SubscriptionSchedule, 'id'> | null;
  items: Readonly<{
    data: readonly Pick<
      Stripe.SubscriptionItem,
      | 'id'
      | 'price'
      | 'quantity'
      | 'current_period_start'
      | 'current_period_end'
    >[];
  }>;
}>;

export type SubscriptionScheduleStripeClient = Readonly<{
  subscriptionSchedules: Readonly<{
    create(
      params: Stripe.SubscriptionScheduleCreateParams,
      options?: Stripe.RequestOptions,
    ): PromiseLike<Stripe.SubscriptionSchedule>;
    retrieve(id: string): PromiseLike<Stripe.SubscriptionSchedule>;
    update(
      id: string,
      params: Stripe.SubscriptionScheduleUpdateParams,
      options?: Stripe.RequestOptions,
    ): PromiseLike<Stripe.SubscriptionSchedule>;
    release(
      id: string,
      params: Stripe.SubscriptionScheduleReleaseParams,
      options?: Stripe.RequestOptions,
    ): PromiseLike<Stripe.SubscriptionSchedule>;
  }>;
}>;

export type ScheduledDowngrade = Readonly<{
  scheduleId: string;
  targetPlan: BillingPlanSlug;
  targetInterval: BillingInterval;
  effectiveAt: string;
}>;

export class SubscriptionScheduleConflictError extends Error {}

export async function scheduleOwnedDowngrade(
  input: Readonly<{
    stripe: SubscriptionScheduleStripeClient;
    subscription: OwnedSingleItemSubscription;
    targetPriceId: string;
    targetPlan: BillingPlanSlug;
    targetInterval: BillingInterval;
  }>,
): Promise<ScheduledDowngrade>;

export async function releaseOwnedDowngrade(
  input: Readonly<{
    stripe: SubscriptionScheduleStripeClient;
    subscription: OwnedSingleItemSubscription;
  }>,
): Promise<void>;
```

- Use metadata keys exactly: `gleen_owner=den-20`, `gleen_subscription_id`, `gleen_target_plan`, `gleen_target_interval`, `gleen_effective_at`, and `gleen_change_key`.
- Build the bootstrap idempotency key with `` `gleen-den20-schedule:${subscription.id}:${currentPeriodEnd}` ``. Build both `gleen_change_key` and the Schedule-update idempotency key with `` `gleen-den20-update:${schedule.id}:${targetPriceId}:${currentPeriodEnd}` ``. The bootstrap key is independent of the target so a retry can safely recover a Schedule created before its metadata update.
- The final target phase has `duration: { interval: targetInterval, interval_count: 1 }`; `end_behavior: 'release'` leaves the target subscription running normally after that phase.

- [ ] **Step 1: Write failing creation and phase-preservation tests**

Create an active single-item subscription with item period `2026-07-01` to `2026-08-01`. Mock `subscriptionSchedules.create` to return the Schedule Stripe generates from `from_subscription`, including its current phase and inherited settings. Assert:

```ts
expect(stripe.subscriptionSchedules.create).toHaveBeenCalledWith(
  { from_subscription: 'sub_owned' },
  { idempotencyKey: 'gleen-den20-schedule:sub_owned:1785542400' },
);
expect(stripe.subscriptionSchedules.update).toHaveBeenCalledWith(
  'sub_sched_owned',
  expect.objectContaining({
    end_behavior: 'release',
    proration_behavior: 'none',
    phases: [
      expect.objectContaining({
        start_date: 1782864000,
        end_date: 1785542400,
        items: [{ price: 'price_prism_month', quantity: 1 }],
        proration_behavior: 'none',
      }),
      expect.objectContaining({
        start_date: 1785542400,
        duration: { interval: 'month', interval_count: 1 },
        items: [{ price: 'price_starter_month', quantity: 1 }],
        proration_behavior: 'none',
      }),
    ],
  }),
  { idempotencyKey: expect.stringContaining('sub_owned:price_starter_month') },
);
```

The current-phase serializer must preserve all supported values returned by Stripe: item quantity/metadata/tax rates/discount IDs; phase metadata, discounts, automatic tax, collection method, currency, default payment method/tax rates, description, invoice settings, billing thresholds, application fee, on-behalf-of, transfer data, and trial end. Expanded objects must be reduced to their IDs. If an inherited setting cannot be represented safely by the installed SDK types, throw `SubscriptionScheduleConflictError` before `update` rather than silently dropping it.

- [ ] **Step 2: Write failing idempotency, replacement, conflict, and release tests**

Cover these exact cases:

1. An active Gleen-owned schedule with the same target/effective date returns its existing result without `update`.
2. An active Gleen-owned schedule with a different target replaces only the future phase and metadata; the current phase start, end, Price, quantity, discounts, tax, and payment settings are unchanged.
3. A Schedule with no Gleen metadata is accepted only when replaying `create({from_subscription})` with the same bootstrap idempotency key returns that exact attached Schedule ID; otherwise it throws `SubscriptionScheduleConflictError`.
4. A schedule owned by another integration, a terminal schedule, more than two current/future phases, multiple items, a future phase before `current_period_end`, or an expanded deleted Price fails closed.
5. `releaseOwnedDowngrade` retrieves the attached Schedule, validates Gleen ownership and subscription ID, then calls:

```ts
stripe.subscriptionSchedules.release(
  'sub_sched_owned',
  { preserve_cancel_date: true },
  { idempotencyKey: 'gleen-den20-release:sub_sched_owned' },
);
```

6. Releasing when there is no attached Schedule is idempotent success; releasing an external Schedule fails closed.

- [ ] **Step 3: Run the helper tests and verify they fail**

Run: `npx vitest run src/lib/billing/subscription-schedule.test.ts`

Expected: FAIL because the orchestrator does not exist.

- [ ] **Step 4: Implement Schedule normalization and orchestration**

Implement these private helpers before the exported functions:

```ts
function stripeId(value: string | { id: string }, prefix: string): string;
function attachedScheduleId(
  value: OwnedSingleItemSubscription['schedule'],
): string | null;
function ownedMetadata(
  schedule: Stripe.SubscriptionSchedule,
  subscriptionId: string,
): boolean;
function currentPhaseUpdate(
  schedule: Stripe.SubscriptionSchedule,
  periodStart: number,
  periodEnd: number,
): Stripe.SubscriptionScheduleUpdateParams.Phase;
function futureTargetPhase(
  targetPriceId: string,
  targetInterval: BillingInterval,
  effectiveAt: number,
): Stripe.SubscriptionScheduleUpdateParams.Phase;
```

Creation is two calls because Stripe forbids phases alongside `from_subscription`: first create/replay the bootstrap Schedule, then update it with the preserved current phase, one target phase, `proration_behavior: 'none'`, `end_behavior: 'release'`, and the exact metadata keys. Before every mutation, verify the attached/retrieved Schedule manages the same subscription and is `active` or `not_started`.

- [ ] **Step 5: Run focused helper tests and type checking**

Run:

```bash
npx vitest run src/lib/billing/subscription-schedule.test.ts
npm run typecheck
```

Expected: PASS with Stripe 20.4.1 types and no casts to `any`.

- [ ] **Step 6: Commit the orchestrator**

```bash
git add src/lib/billing/subscription-schedule.ts src/lib/billing/subscription-schedule.test.ts
git commit -m "feat(billing): schedule owned downgrades"
```

---

### Task 3: Split the Authenticated Plan-Change Server Action

**Files:**

- Modify: `src/lib/billing/actions.ts`
- Modify: `src/lib/billing/actions.test.ts`

**Interfaces:**

- Consumes: `classifyPlanChange`, `scheduleOwnedDowngrade`, and `releaseOwnedDowngrade` from Tasks 1–2.
- Produces:

```ts
export type PlanChangeResult =
  | Readonly<{ ok: true; kind: 'upgrade'; url: string }>
  | Readonly<{
      ok: true;
      kind: 'downgrade';
      plan: BillingPlanSlug;
      interval: BillingInterval;
      effectiveAt: string;
    }>
  | ActionError;

export type CancelScheduledDowngradeResult =
  Readonly<{ ok: true }> | ActionError;

export async function changePlan(
  input: CheckoutActionInput,
): Promise<PlanChangeResult>;

export async function cancelScheduledDowngrade(): Promise<CancelScheduledDowngradeResult>;
```

- Replace the factory method `createPlanChangePortalForUser` with `changePlanForUser`; add `cancelScheduledDowngradeForUser` for focused unit testing.
- Extend `BillingStripeClient` with `SubscriptionScheduleStripeClient` and include `schedule` plus item period fields in `subscriptions.list` results.

- [ ] **Step 1: Rewrite the current upgrade test as a split-action test**

For a Starter-month snapshot targeting Prism-Pro month, assert `changePlanForUser` returns:

```ts
{
  ok: true,
  kind: 'upgrade',
  url: 'https://billing.stripe.com/p/session/test',
}
```

Keep the current exact `subscription_update_confirm` expectation. Also assert the action retrieves and validates the configured `always_invoice` Portal Price before creating a session.

- [ ] **Step 2: Add failing downgrade and cancel action tests**

For a Prism-Pro-month snapshot targeting Starter month:

- assert the browser input remains exactly `{plan:'starter', interval:'month'}`;
- assert `resolvePurchasablePrice` supplies `price_starter_month`;
- assert no Portal configuration/session method is called;
- assert Schedule creation/update receives only the owned subscription and server Price;
- assert the result is `{ok:true, kind:'downgrade', plan:'starter', interval:'month', effectiveAt:'2026-08-01T00:00:00.000Z'}`;
- assert a retry returns the same result;
- assert cancel releases only a Gleen-owned attached Schedule.

Add fail-closed cases for unchanged target, absent customer, null current price, missing target catalog entry, unavailable target Price, zero/multiple subscriptions, zero/multiple items, external Schedule, and authentication failure. In every failure, assert neither Portal nor Schedule mutation occurs.

- [ ] **Step 3: Run the action tests and verify the red state**

Run: `npx vitest run src/lib/billing/actions.test.ts`

Expected: FAIL on missing split result and cancel action.

- [ ] **Step 4: Implement `changePlanForUser`**

After validating input, load the owned customer, server snapshot, server target Price, and exactly one non-terminal subscription. Classify with `classifyPlanChange(snapshot, target)`.

- For `upgrade`, execute the existing Portal configuration checks and return `{ok:true, kind:'upgrade', url}`.
- For `downgrade`, call `scheduleOwnedDowngrade` and return its server-derived ISO effective date.
- For `unchanged` or `PlanChangePolicyError`, return `{ok:false, code:'invalid_request'}`.
- Convert Stripe, repository, parse, and schedule-conflict failures to `{ok:false, code:'billing_unavailable'}` without exposing Stripe messages.

Do not optimistically mutate Supabase from this action.

- [ ] **Step 5: Implement the authenticated Server Actions**

Replace `createPlanChangePortalSession` with `changePlan`, and add `cancelScheduledDowngrade`. Both call `authenticatedContext()` first, parse a closed schema, derive `userId` server-side, and call `requestBillingAppUrl()` only where a Portal return URL is needed.

- [ ] **Step 6: Run focused and boundary tests**

Run:

```bash
npx vitest run src/lib/billing/actions.test.ts src/lib/billing/authenticated-e2e-boundary.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit the split action**

```bash
git add src/lib/billing/actions.ts src/lib/billing/actions.test.ts
git commit -m "feat(billing): split upgrade and downgrade actions"
```

---

### Task 4: Project Subscription Schedule Events Independently in Supabase

**Files:**

- Create via CLI: `supabase/migrations/*_den_20_scheduled_plan_change_projection.sql`
- Modify: `src/lib/billing/database-contract.test.ts`
- Modify: `src/lib/billing/repository.ts`
- Modify: `src/lib/billing/supabase-projection-repository.ts`
- Modify: `src/lib/billing/supabase-projection-repository.test.ts`
- Modify: `src/lib/billing/webhook.ts`
- Modify: `src/lib/billing/webhook.test.ts`

**Interfaces:**

- Produces in `repository.ts`:

```ts
export const scheduledChangeProjectionSchema = z
  .object({
    eventId: z.string().trim().min(1),
    eventCreatedAt: z.iso.datetime({ offset: true }),
    userId: z.string().trim().min(1),
    externalSubscriptionId: z.string().regex(/^sub_[A-Za-z0-9]+$/),
    externalScheduleId: z.string().regex(/^sub_sched_[A-Za-z0-9]+$/),
    scheduledPlanSlug: billingPlanSlugSchema.nullable(),
    scheduledChangeAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.scheduledPlanSlug === null) !==
      (value.scheduledChangeAt === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Scheduled target and date must change together',
      });
    }
  })
  .readonly();

export type ScheduledChangeProjection = z.infer<
  typeof scheduledChangeProjectionSchema
>;
```

- Add `applyScheduledChange(input: ScheduledChangeProjection): Promise<void>` to `BillingProjectionRepository`.

- [ ] **Step 1: Create the migration with the Supabase CLI**

Run:

```bash
npx supabase migration new den_20_scheduled_plan_change_projection
rg --files supabase/migrations | rg '_den_20_scheduled_plan_change_projection\.sql$'
```

Expected: exactly one generated migration path. Use that exact returned path for every remaining migration step and `git add` command in this task.

- [ ] **Step 2: Write failing database contract assertions**

Extend `database-contract.test.ts` to locate the migration by its exact suffix and assert it contains:

- `stripe_subscription_schedule_id text` with `^sub_sched_` validation;
- `scheduled_change_event_created_at timestamptz`;
- a unique partial index for non-null Schedule IDs;
- `private.preserve_billing_schedule_projection()` and a `before update` trigger;
- `public.apply_billing_schedule_projection` and `public.apply_billing_schedule_projection_service_role`;
- claimed-event verification and a separate comparison against `scheduled_change_event_created_at`;
- exact Schedule-ID matching before a clear;
- `set search_path = ''`, role validation, explicit revokes, and a grant only to `service_role`.

Also assert the migration does not grant table access to `anon` or `authenticated` and does not use `user_metadata` or `security definer` in `public`.

- [ ] **Step 3: Add the independent schedule columns, trigger, and indexes**

The migration must add:

```sql
alter table public.billing_subscriptions
  add column stripe_subscription_schedule_id text check (
    stripe_subscription_schedule_id is null
    or stripe_subscription_schedule_id ~ '^sub_sched_[A-Za-z0-9]+$'
  ),
  add column scheduled_change_event_created_at timestamptz;

create unique index billing_subscriptions_schedule_id_idx
  on public.billing_subscriptions(stripe_subscription_schedule_id)
  where stripe_subscription_schedule_id is not null;
```

The `private.preserve_billing_schedule_projection()` trigger must restore the old Schedule ID, scheduled plan, effective date, and schedule-event timestamp when a normal subscription projection tries to clear them with an unchanged schedule-event timestamp before the boundary. It must allow the clear when either the new current plan equals the scheduled plan, `new.current_period_start >= old.scheduled_change_at`, or a schedule RPC supplies a newer `scheduled_change_event_created_at`.

- [ ] **Step 4: Add the atomic schedule projection RPCs**

Use this exact parameter order for both functions:

```sql
(
  target_event_id text,
  target_event_created_at timestamptz,
  target_user_id uuid,
  target_external_subscription_id text,
  target_external_schedule_id text,
  target_scheduled_plan_slug text,
  target_scheduled_change_at timestamptz
)
```

The inner `public.apply_billing_schedule_projection` must:

1. require the claimed Event ID, creation time, and `processing` status;
2. require `service_role` context;
3. require plan/date to be both null or both non-null;
4. resolve a non-null plan slug through `billing_plans`;
5. update only the row matching both `target_user_id` and `target_external_subscription_id`;
6. accept only events newer than or equal to `scheduled_change_event_created_at`;
7. on set, store the Schedule ID, plan ID, date, and event time;
8. on clear, clear only when the stored Schedule ID equals `target_external_schedule_id`, then retain only the newer schedule-event timestamp;
9. never modify current plan, Price, interval, status, paid-through, entitlement, usage, or `latest_stripe_event_created_at`.

The service-role wrapper must set the legacy role GUC exactly like the existing DEN-20 wrappers, call the inner function, revoke all execution from `public, anon, authenticated, service_role`, then grant execution only on the wrapper to `service_role`.

- [ ] **Step 5: Add repository schema and RPC tests**

Write tests that `applyScheduledChange` validates input and calls:

```ts
admin.rpc('apply_billing_schedule_projection_service_role', {
  target_event_id: 'evt_schedule',
  target_event_created_at: '2026-07-31T10:00:00.000Z',
  target_user_id: '5c5583a7-131b-4c05-b76a-7a4835dba8df',
  target_external_subscription_id: 'sub_1',
  target_external_schedule_id: 'sub_sched_1',
  target_scheduled_plan_slug: 'starter',
  target_scheduled_change_at: '2026-08-01T00:00:00.000Z',
});
```

Add the method in `supabase-projection-repository.ts` using `parseValue` and `rpcSuccess`; do not add direct table writes.

- [ ] **Step 6: Write failing schedule webhook tests**

Use verified event envelopes for all five event types:

- `subscription_schedule.updated` with Gleen metadata, one current phase, and one future single-item phase projects the future server-resolved plan and its phase `start_date`.
- `subscription_schedule.released`, `.canceled`, and `.completed` clear the matching schedule projection using `subscription`, `released_subscription`, or the validated `gleen_subscription_id` fallback.
- the initial `.created` event emitted before the two-call update is recorded as `unsupported` and performs no projection when Gleen metadata/future phase is absent.
- an unowned external Schedule is `unsupported`, not adopted.
- an owned Schedule with an unknown future Price returns controlled `unknown_price`; malformed/multiple future items returns `malformed_event`.
- duplicate Events never call `applyScheduledChange` twice.
- an older Schedule Event reaches the repository but the SQL contract independently prevents overwriting a newer schedule state.

- [ ] **Step 7: Implement schedule webhook parsing**

Add these cases to the existing switch:

```ts
case 'subscription_schedule.created':
case 'subscription_schedule.updated':
case 'subscription_schedule.completed':
case 'subscription_schedule.released':
case 'subscription_schedule.canceled':
```

For active/not-started owned schedules, find exactly one future phase that begins at the current phase end, extract its single Price, resolve customer ownership and Price mapping through the repository, and project that phase start. For terminal owned schedules, project both scheduled fields as null. Metadata proves Gleen ownership but never supplies the authoritative target plan; the future Price mapping does.

- [ ] **Step 8: Run migration and projection verification**

Run:

```bash
npx vitest run src/lib/billing/database-contract.test.ts src/lib/billing/supabase-projection-repository.test.ts src/lib/billing/webhook.test.ts
npx supabase --version
npx supabase db reset
npx supabase migration list --local
```

Expected: all tests pass, local reset applies every migration, and the new migration is listed. If local Supabase is unavailable because Docker is not running, record that exact environmental blocker and still run the static SQL contract tests; do not claim database runtime verification passed.

- [ ] **Step 9: Commit the projection unit**

```bash
git add src/lib/billing/database-contract.test.ts src/lib/billing/repository.ts src/lib/billing/supabase-projection-repository.ts src/lib/billing/supabase-projection-repository.test.ts src/lib/billing/webhook.ts src/lib/billing/webhook.test.ts
git add "$(rg --files supabase/migrations | rg '_den_20_scheduled_plan_change_projection\.sql$')"
git commit -m "feat(billing): project scheduled downgrades"
```

---

### Task 5: Update the Billing Portal UI and Deterministic Browser Boundaries

**Files:**

- Modify: `src/app/app/subscription/portal/page.tsx`
- Modify: `src/components/billing/portal-screen.tsx`
- Modify: `src/components/billing/portal-screen.test.tsx`
- Modify: `src/app/billing-fixture/[screen]/fixture-screen.tsx`
- Modify: `src/app/billing-fixture/[screen]/page.tsx`
- Modify: `tests/e2e/billing.spec.ts`

**Interfaces:**

- `PortalScreen.planChangeAction` accepts `CheckoutActionInput` and returns `PlanChangeResult`.
- `PortalScreen.cancelScheduledDowngradeAction` accepts no client identifiers and returns `CancelScheduledDowngradeResult`.
- `PortalSubscription` adds `scheduledChange` from `SubscriptionPresentation`.

- [ ] **Step 1: Write failing component tests for split behavior**

Add these tests:

1. Upgrade result calls `openPortal(url)` once and shows no local scheduled notice.
2. Downgrade result does not call `openPortal`; it announces `Starter is scheduled for Aug 1, 2026. Your Prism Pro access remains active until then.` in `role=status`.
3. An existing projected downgrade renders its effective date and a `Cancel scheduled downgrade` button.
4. Successful cancellation announces `Scheduled downgrade canceled. Your current plan remains active.` and does not open Stripe.
5. Failed change or cancellation renders one retryable `role=alert`, resets `aria-busy=false`, and never exposes an internal Stripe message.
6. Rapid double-click invokes each Server Action only once while pending.

- [ ] **Step 2: Run the component test and verify the red state**

Run: `npx vitest run src/components/billing/portal-screen.test.tsx`

Expected: FAIL because the component assumes every successful change has a URL.

- [ ] **Step 3: Implement the result-discriminated client flow**

In `PortalScreen`:

- keep `openPortal` only for `{kind:'upgrade'}` and general Portal results;
- on `{kind:'downgrade'}`, set a local status message and call `router.refresh()` so the verified projection can replace the optimistic notice when its webhook arrives;
- expose `Cancel scheduled downgrade` only for a projected downgrade or the just-scheduled local result;
- after successful release, hide that button locally, announce cancellation, and call `router.refresh()`;
- use the neutral button copy `Confirm plan change` before server classification instead of promising a Stripe redirect;
- preserve the existing cards, spacing, tokens, focus treatment, and restrained motion.

In `portal/page.tsx`, include `subscription.scheduledChange`, pass `changePlan`, and pass `cancelScheduledDowngrade`. The page remains a Server Component; the actions are serializable Server Action props.

- [ ] **Step 4: Extend the deterministic fixture boundary**

Add fixture boundary values `portal-upgrade`, `portal-downgrade`, `portal-cancel`, and retain `portal-error`. Their action results are exactly:

```ts
{ ok: true, kind: 'upgrade', url: 'https://billing.stripe.test/session/1' }
{ ok: true, kind: 'downgrade', plan: 'starter', interval: 'month', effectiveAt: '2026-08-01T00:00:00.000Z' }
{ ok: true }
{ ok: false, code: 'fixture-error' }
```

The fixture output records only `{plan, interval}`, action count, and opened URL; it must never contain user, email, customer, subscription, Price, card, or secret values.

- [ ] **Step 5: Update Playwright behavior coverage**

Replace the current single Portal boundary test with assertions that:

- upgrade opens the fixture Stripe URL;
- downgrade submits only `{plan:'starter', interval:'month'}`, opens no URL, and shows the effective-date status;
- cancel sends no payload identifiers and hides the pending control;
- concurrent clicks still produce one action;
- recoverable errors clear `aria-busy`;
- the portal remains keyboard navigable, has no horizontal overflow at 320px, and all new status changes remain visible with reduced motion.

- [ ] **Step 6: Run component and browser tests**

Run:

```bash
npx vitest run src/components/billing/portal-screen.test.tsx src/app/app-shell-fixture/page.test.tsx 'src/app/billing-fixture/[screen]/page.test.tsx'
PLAYWRIGHT_PORT=3077 npx playwright test tests/e2e/billing.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 7: Commit the UI unit**

```bash
git add src/app/app/subscription/portal/page.tsx src/components/billing/portal-screen.tsx src/components/billing/portal-screen.test.tsx 'src/app/billing-fixture/[screen]/fixture-screen.tsx' 'src/app/billing-fixture/[screen]/page.tsx' tests/e2e/billing.spec.ts
git commit -m "feat(billing): present scheduled downgrades"
```

---

### Task 6: Configure Stripe Sandbox, Deploy the Exact Commit, and Verify the Full Story

**Files:**

- Modify: `.superpowers/sdd/2026-07-30-den-20-billing-usage/task-11-report.md`
- No credential or `.env` file is created or committed.

**Interfaces:**

- Consumes: the complete code path from Tasks 1–5 and the existing Vercel Preview project.
- Produces: read-back evidence for Stripe configuration, Vercel deployment, automated checks, desktop/mobile/reduced-motion browser verification, and Sandbox lifecycle behavior.

- [ ] **Step 1: Run the complete local quality gate**

Run in order:

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
PLAYWRIGHT_PORT=3077 npm run test:e2e
git diff --check
git status --short
```

Expected: every command passes. Review formatter changes before staging and revert only formatter changes that are unrelated to DEN-20.

- [ ] **Step 2: Configure the two Stripe Sandbox Portal policies through Chrome**

Read back and record IDs without exposing secrets:

- Default/general Portal configuration: payment methods, billing identity, invoices, and end-of-period cancellation remain enabled; arbitrary subscription plan switching is disabled.
- Dedicated upgrade configuration referenced by `STRIPE_PORTAL_CONFIGURATION_ID`: only Starter month/year and Prism Pro month/year are allowed; Team is excluded; switching is enabled with `always_invoice`; the billing-cycle anchor is preserved.

Do not change live-mode Portal configuration.

- [ ] **Step 3: Enable Schedule webhook events in Stripe Sandbox**

On the existing Preview webhook endpoint, retain all current event subscriptions and add exactly:

```text
subscription_schedule.created
subscription_schedule.updated
subscription_schedule.completed
subscription_schedule.released
subscription_schedule.canceled
```

Save, reopen the endpoint, and read back all five event types. Do not paste the signing secret into chat, Git, screenshots, logs, or the report.

- [ ] **Step 4: Verify Vercel Preview environment and deploy the exact commit**

Confirm `STRIPE_PORTAL_CONFIGURATION_ID` exists in Preview and points to the dedicated upgrade configuration. Commit any remaining intentional source/report changes, capture `git rev-parse HEAD`, deploy that exact clean commit, wait for Ready, and confirm the staging alias resolves to the immutable deployment.

- [ ] **Step 5: Verify immediate upgrade proration in Sandbox**

Use a controlled Sandbox Gleen account with exactly one active Starter monthly subscription and no attached Schedule:

1. choose Prism Pro monthly in Gleen;
2. confirm Gleen opens the target-aware Stripe Portal confirmation;
3. verify Stripe displays the unused Starter credit and charges only the net prorated difference, not a second full subscription;
4. confirm with a Stripe test payment method;
5. verify one non-terminal subscription remains;
6. verify `invoice.paid` and `customer.subscription.updated` project Prism Pro and the new invoice in Gleen;
7. verify a failed test payment leaves Starter entitlement unchanged.

If no controlled Starter account exists, stop before mutating the user's current Prism Pro subscription and request approval to create or repurpose a Sandbox-only account. This is the only allowed authorization pause in this step.

- [ ] **Step 6: Verify cross-Product scheduled downgrade and cancellation**

With exactly one active Prism Pro subscription:

1. choose Starter monthly;
2. verify Gleen stays on-site and announces the paid-period effective date;
3. verify Stripe has one active Gleen-owned Schedule with a preserved current Prism Pro phase and one future Starter phase;
4. verify no immediate invoice, refund, credit, second subscription, or entitlement change occurs;
5. verify Subscription and Portal screens show the scheduled Starter change;
6. cancel the scheduled downgrade in Gleen;
7. verify Stripe marks that Schedule `released`, preserves the active Prism Pro subscription, and Gleen clears the pending change after the webhook.

- [ ] **Step 7: Verify period transition with a dedicated Stripe Test Clock account**

Use a separate Sandbox Test Clock customer and Gleen test user rather than advancing or editing the user's ordinary account:

1. activate Prism Pro and schedule Starter;
2. advance the Test Clock past `current_period_end`;
3. verify the normal subscription/invoice webhooks project Starter only when the phase starts;
4. verify the Schedule projection clears after completion/release;
5. verify the next entitlement period snapshots the Starter analysis limit once;
6. replay the Schedule and Subscription Events and verify no duplicate projection, period, invoice, or usage entry appears.

- [ ] **Step 8: Verify desktop, mobile, keyboard, and reduced motion in Chrome**

Check `/app/subscription` and `/app/subscription/portal` at desktop width and 412px mobile width. Verify keyboard focus reaches confirm/cancel controls, status messages are announced, there is no horizontal overflow, and reduced motion disables transitions without hiding state.

- [ ] **Step 9: Record evidence and final risks**

Append to `task-11-report.md`:

- exact commit SHA and immutable deployment URL;
- Stripe Portal configuration read-back without secrets;
- webhook event subscription read-back;
- command results for format, lint, typecheck, tests, build, and Playwright;
- upgrade invoice ID and net-proration outcome;
- downgrade Schedule ID, effective date, no-immediate-invoice evidence, release outcome, and period-transition outcome;
- desktop/mobile/reduced-motion routes checked;
- any remaining risk or explicit environmental blocker.

- [ ] **Step 10: Commit the verification report**

```bash
git add .superpowers/sdd/2026-07-30-den-20-billing-usage/task-11-report.md
git commit -m "test(billing): verify split plan changes"
```

---

## Final Review Gate

Before declaring DEN-20 complete, verify all of the following are true:

- One customer can have only one non-terminal paid subscription through Gleen.
- Upgrade direction comes from the server catalog and opens only the dedicated `always_invoice` target confirmation.
- Stripe, not Gleen, calculates the credit and net charge.
- Failed upgrade payment does not grant the target entitlement.
- Cross-Product downgrade creates one Gleen-owned Schedule and no immediate invoice or entitlement change.
- Same-target retries are idempotent; different targets replace only a compatible Gleen-owned future phase.
- External or structurally incompatible schedules fail closed.
- Canceling a pending downgrade releases only the Gleen-owned Schedule and preserves the subscription.
- Schedule Events and Subscription Events have independent ordering, and ordinary subscription updates cannot erase a future downgrade early.
- Phase transition, invoice payment, entitlement period, and usage limit are projected only by verified idempotent webhooks.
- No client bundle, payload, log, report, or screenshot contains Stripe/Supabase secrets or payment data.
- Formatting, lint, typecheck, unit/integration tests, production build, Playwright, desktop, mobile, keyboard, and reduced-motion verification all pass.

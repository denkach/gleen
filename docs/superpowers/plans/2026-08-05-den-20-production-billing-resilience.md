# DEN-20 Production Billing Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `/app/subscription` usable when Stripe payment-method lookup fails and restore Stripe Sandbox configuration in Vercel Production.

**Architecture:** The server page continues fetching the Supabase snapshot and Stripe payment summary concurrently, but settles the payment request independently so it cannot erase valid entitlement data. Stable, non-sensitive diagnostics distinguish a degraded payment-method boundary from a failed subscription snapshot. Vercel receives the existing Preview sandbox values through a non-printing transfer, followed by an exact-commit redeploy.

**Tech Stack:** Next.js App Router, React, strict TypeScript, Vitest, Supabase, Stripe, Vercel CLI, Playwright.

## Global Constraints

- Do not change billing visuals, copy, plans, prices, limits, currencies, or entitlement policy.
- Do not expose secrets, Stripe object IDs, user IDs, or raw exception text in logs, commands, fixtures, screenshots, or commits.
- Keep Stripe in Sandbox/Test Mode; live-mode configuration is out of scope.
- Preserve desktop, tablet, mobile, keyboard, and `prefers-reduced-motion` behavior.
- Do not modify the user's unrelated files in the primary checkout.

---

### Task 1: Record the approved production-failure contract

**Files:**

- Create: `docs/superpowers/specs/2026-08-05-den-20-production-billing-resilience-design.md`
- Create: `docs/superpowers/plans/2026-08-05-den-20-production-billing-resilience.md`

**Interfaces:**

- Consumes: DEN-20 failure handling, architecture rule for lazy Stripe validation, confirmed Vercel environment audit.
- Produces: The exact behavioral and verification contract used by Tasks 2–4.

- [ ] **Step 1: Check the documents for placeholders and contradictions**

Run:

```bash
rg -n "T.B.D|T.O.D.O|implement[[:space:]]later|fill[[:space:]]in[[:space:]]details|live[_ -]?mode" docs/superpowers/specs/2026-08-05-den-20-production-billing-resilience-design.md docs/superpowers/plans/2026-08-05-den-20-production-billing-resilience.md
```

Expected: no placeholders; any `live-mode` match explicitly says it is out of scope.

- [ ] **Step 2: Format-check the documents**

Run:

```bash
npx prettier --check docs/superpowers/specs/2026-08-05-den-20-production-billing-resilience-design.md docs/superpowers/plans/2026-08-05-den-20-production-billing-resilience.md
```

Expected: both files pass.

### Task 2: Add the page-level regression test

**Files:**

- Modify: `src/app/app/subscription/billing-copy-boundary.test.tsx`

**Interfaces:**

- Consumes: mocked `getPaymentMethodSummary`, `repository.getOwnedSnapshot`, and `SubscriptionScreen` React element returned by `SubscriptionPage`.
- Produces: a regression test proving payment lookup rejection preserves the subscription presentation and emits only a stable diagnostic.

- [ ] **Step 1: Expose the payment mock and presentation arguments**

Add `getPaymentMethodSummary`, `toSubscriptionPresentation`, and `consoleError` spies to the hoisted fixture. Make the billing action mock delegate to the hoisted payment mock and make the presentation mock capture its options while returning `subscriptionPresentation`.

- [ ] **Step 2: Write the failing regression test**

Add a test that makes `getPaymentMethodSummary` reject with a sentinel error, calls `SubscriptionPage`, and asserts:

```ts
expect(toSubscriptionPresentation).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({ paymentMethod: { status: 'unavailable' } }),
);
expect(consoleError).toHaveBeenCalledWith({
  event: 'billing_subscription_payment_method_unavailable',
  route: '/app/subscription',
});
expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
  'sentinel-stripe-secret',
);
```

Also assert that the returned `SubscriptionScreen` element has the non-null `subscriptionPresentation`.

- [ ] **Step 3: Run the focused test and confirm RED**

Run:

```bash
npm test -- src/app/app/subscription/billing-copy-boundary.test.tsx
```

Expected: FAIL because the current `Promise.all` sets `presentation` to `null` and emits no diagnostic.

### Task 3: Preserve the snapshot and add safe diagnostics

**Files:**

- Modify: `src/app/app/subscription/page.tsx`
- Test: `src/app/app/subscription/billing-copy-boundary.test.tsx`

**Interfaces:**

- Consumes: `PaymentMethodResult` from `getPaymentMethodSummary` and `BillingPaymentMethod` from the billing domain.
- Produces: `resolvePaymentMethod(): Promise<BillingPaymentMethod>` local server helper and two literal diagnostic events.

- [ ] **Step 1: Implement degraded payment-method resolution**

Add a local helper that awaits the already-started payment promise, maps action failures and rejections to `{ status: 'unavailable' }`, and logs only:

```ts
{
  event: 'billing_subscription_payment_method_unavailable',
  route: '/app/subscription',
}
```

Start both requests before awaiting either. Await the snapshot and the helper together so concurrency is retained while failures are isolated.

- [ ] **Step 2: Add the snapshot diagnostic**

Replace the empty outer catch with:

```ts
console.error({
  event: 'billing_subscription_snapshot_unavailable',
  route: '/app/subscription',
});
```

Do not include the caught error or user identifier.

- [ ] **Step 3: Run focused tests and confirm GREEN**

Run:

```bash
npm test -- src/app/app/subscription/billing-copy-boundary.test.tsx src/lib/billing/actions.test.ts src/lib/billing/presentation.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit the code and documentation**

Run:

```bash
git add docs/superpowers/specs/2026-08-05-den-20-production-billing-resilience-design.md docs/superpowers/plans/2026-08-05-den-20-production-billing-resilience.md src/app/app/subscription/page.tsx src/app/app/subscription/billing-copy-boundary.test.tsx
git commit -m "fix(den-20): keep subscription visible during Stripe outage"
```

Expected: one focused Conventional Commit on `fix/den-20-production-billing-resilience`.

### Task 4: Verify code and affected browser behavior

**Files:**

- Verify: all tracked project files

**Interfaces:**

- Consumes: committed Task 3 behavior.
- Produces: evidence that the exact commit is releasable.

- [ ] **Step 1: Run repository checks**

Run, separately:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Run billing browser coverage**

Run the existing billing Playwright tests for Chromium desktop and mobile projects. Check the Subscription page has no horizontal overflow, its controls remain keyboard reachable, and reduced-motion disables non-essential motion.

Expected: all selected tests pass; no visual redesign is introduced.

### Task 5: Restore Production Stripe Sandbox configuration

**Files:**

- Modify externally: Vercel Production environment for `gleen-staging`
- Temporary: a permission-restricted file under `/tmp`, removed after transfer

**Interfaces:**

- Consumes: encrypted Preview values for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Produces: the same four variable names scoped to Production without exposing values.

- [ ] **Step 1: Pull Preview values without printing them**

Create a unique `/tmp` file with mode `600`, use `vercel env pull --environment=preview`, and validate only that the four names are present.

- [ ] **Step 2: Add each value to Production through standard input**

Load the temporary file in a private shell and pipe each exact value to `vercel env add <NAME> production --sensitive`. Do not use secret values as command arguments and do not print the file.

- [ ] **Step 3: Verify names and remove the temporary file**

Run `vercel env ls production`, confirm all four names are Production-scoped, then delete only the resolved temporary file.

Expected: no secret value appears in command output or repository files.

### Task 6: Publish and verify Production

**Files:**

- Modify externally: GitHub branch/main and Vercel Production deployment

**Interfaces:**

- Consumes: exact verified commit and configured Production environment.
- Produces: a Ready Vercel deployment at the canonical alias.

- [ ] **Step 1: Push the focused branch and integrate the verified commit**

Push `fix/den-20-production-billing-resilience`, fast-forward or merge it into `main` without touching unrelated primary-checkout files, and push `main`.

- [ ] **Step 2: Deploy the exact main commit to Production**

Deploy with Vercel CLI from the clean worktree and confirm the immutable deployment is Ready and aliased to `https://gleen-staging.vercel.app`.

- [ ] **Step 3: Verify the live route**

Check the canonical deployment, then verify `/app/subscription` in an authenticated session. Confirm the plan and usage render, payment method is either real or locally unavailable, retry/navigation remain functional, and no full-page unavailable state appears solely because Stripe payment lookup fails.

Expected: Production serves the corrected route on desktop and mobile. If an authenticated session cannot be reused, report that limitation explicitly instead of claiming the private-route check passed.

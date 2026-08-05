# DEN-20 Production Billing Resilience Design

## Outcome

The authenticated Subscription page keeps showing the Supabase-owned plan,
usage, and catalog when Stripe payment-method lookup is temporarily unavailable.
The payment-method area alone becomes unavailable, and the server emits a safe,
actionable diagnostic. Existing Stripe Sandbox credentials are also available to
the Production deployment so the complete billing flow can initialize there.

## Confirmed production failure

`/app/subscription` currently loads the entitlement snapshot and Stripe payment
method in one `Promise.all`. Constructing the production billing actions eagerly
validates Stripe configuration. Production has no Stripe variables, so that
construction throws. The page catches the combined rejection and discards the
already-working Supabase snapshot, rendering the full-screen billing unavailable
state. The application shell still shows the user's remaining analyses because
its independent Supabase request succeeds.

## Scope

- Preserve a successfully loaded subscription snapshot if payment-method lookup
  rejects or returns an action failure.
- Represent only the payment method as `{ status: 'unavailable' }` in that case.
- Emit a controlled server diagnostic with a stable event name and route, without
  secrets, Stripe objects, user identifiers, or raw exception text.
- Emit a separate controlled diagnostic when the subscription snapshot itself
  fails and retain the existing full-screen recoverable error for that case.
- Copy the existing encrypted Stripe Sandbox variables from Vercel Preview to
  Production without exposing their values.
- Redeploy the exact verified commit and check the authenticated Subscription
  route at desktop and mobile sizes.

## Out of scope

- Billing visual redesign or copy changes.
- Plan, price, usage-limit, currency, or entitlement-policy changes.
- Stripe live-mode credentials or real charges.
- Changes to webhook, checkout, portal, invoice, or database behavior beyond the
  Production environment values already required by DEN-20.

## Server behavior

The page starts the Supabase snapshot and payment-method requests concurrently,
but observes them independently. Payment-method rejection is converted to the
existing unavailable payment-method domain state. Snapshot rejection is the only
condition that makes the entire subscription presentation unavailable.

Diagnostics use literal metadata only:

```ts
console.error({
  event: 'billing_subscription_payment_method_unavailable',
  route: '/app/subscription',
});
```

and, for the page-owning data source:

```ts
console.error({
  event: 'billing_subscription_snapshot_unavailable',
  route: '/app/subscription',
});
```

Raw caught values are deliberately excluded.

## Vercel configuration

The following existing encrypted Preview values are copied to Production:

- `STRIPE_SECRET_KEY`;
- `STRIPE_WEBHOOK_SECRET`;
- `STRIPE_PORTAL_CONFIGURATION_ID`;
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

Values are transferred through a temporary restricted file and standard input,
never printed or committed. The temporary file is removed after use. This remains
Stripe Sandbox/Test Mode; live-mode configuration is still outside DEN-20's
current release gate.

## Verification

- A page-level regression test makes `getPaymentMethodSummary` reject while the
  repository snapshot succeeds, then asserts a non-null presentation with an
  unavailable payment method and the safe diagnostic.
- Existing copy-boundary and billing tests continue to pass.
- Formatting, linting, type checking, unit/integration tests, and production build
  pass from the isolated worktree.
- Browser verification checks desktop, mobile, keyboard reachability, horizontal
  overflow, and reduced-motion behavior on the affected route.
- Vercel Production lists all four required Stripe variable names, the deployment
  is Ready, and the canonical production alias serves the corrected route.

## Risks and controls

- A malformed copied secret could keep Stripe unavailable. Confirm variable names
  and redeploy, without displaying values.
- A valid Test Mode secret paired with the wrong Portal configuration can still
  make management actions fail. The UI remains recoverable and the new diagnostic
  identifies the affected boundary.
- Production browser verification requires an authenticated session. If automation
  cannot reuse one, verify the public deployment and report the authenticated check
  as requiring the user's existing browser session rather than claiming success.

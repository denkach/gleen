# Codex setup

## Local Codex

Launch Codex from the repository root so it receives the correct project context.

```bash
cd gleen
codex
```

First commands:

```text
/init
/status
```

This repository already contains an `AGENTS.md`. Preserve it and extend it deliberately rather than replacing it with generic instructions.

## First read-only prompt

```text
Study this repository, but do not modify anything yet.

Read:
- AGENTS.md
- docs/product.md
- docs/design-system.md
- docs/architecture.md
- docs/roadmap.md
- design/reference-v3/index.html

Then explain:
1. What Gleen is.
2. Which visual rules are non-negotiable.
3. Which architecture decisions are still open.
4. How you would split the first implementation milestone.
5. Which risks or contradictions you found.

Do not create files or install dependencies.
```

## GitHub and Codex Cloud

Recommended order:

1. initialize Git;
2. create a private GitHub repository;
3. push the baseline commit;
4. connect the repository to Codex Cloud;
5. create an environment;
6. validate a read-only cloud task;
7. connect Codex to Linear.

## UI implementation prompt

```text
Implement only the scope of the current Linear issue.

Read AGENTS.md and all linked design documentation.
Use design/reference-v3 as the approved visual reference.
Do not redesign the screen.
Match layout, typography, spacing, colors, and motion.
Verify desktop, tablet, mobile, keyboard navigation, and reduced motion.
Do not modify unrelated files.
```

## Stripe Sandbox billing setup

Keep DEN-20 in Stripe Sandbox/Test mode until the complete lifecycle below has
passed. Never commit environment files, keys, webhook signing secrets, Stripe
object IDs, or customer data.

Configure these variable names in the local environment and in Vercel
Development/Preview:

```text
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Setup flow:

1. Create Sandbox products and recurring monthly/yearly Prices corresponding to
   the active rows in `billing_plans` and `billing_prices`.
2. Enable Customer Portal payment-method updates, plan changes, and scheduled
   cancellation.
3. Register the HTTPS endpoint `/api/stripe/webhook`.
4. Subscribe it to:
   `customer.subscription.created`,
   `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`,
   `invoice.payment_failed`, `invoice.updated`, and `charge.refunded`.
5. Using an authenticated, privileged database session, map each Sandbox Price
   ID to its existing `billing_prices` row by plan and billing interval. Do not
   expose this write through a browser/client role.
6. Confirm that `git status --short` does not include an `.env*` file.

Run the acceptance lifecycle with Stripe CLI event forwarding or the Stripe
Sandbox Dashboard:

1. create a monthly subscription and replay its activation event;
2. settle one analysis and verify one credit is consumed;
3. retry the same technical operation and verify zero additional cost;
4. renew, fail payment into `past_due`, then recover the payment method;
5. schedule a downgrade and a cancellation;
6. verify invoice and refund projections.

After every step, compare Stripe state with the Supabase subscription,
entitlement, usage, webhook-event, and invoice records and the signed-in UI.
Replaying an event must not change counts.

Repository verification:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx supabase db advisors --local
npx supabase migration list --local
PLAYWRIGHT_PORT=3062 npm run test:e2e
```

The local Supabase checks require a running Docker-compatible container
runtime. Run the same security and performance advisors against the linked
staging project after applying migrations.

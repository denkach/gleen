# DEN-20 Task 4 Report

Status: DONE_WITH_CONCERNS

Commit: `feat(den-20): enforce real analysis usage`

## Outcome

Implemented the cookie-backed Supabase billing readers, the admin-only webhook
projection adapter, controlled usage-limit error mapping, and the real
idempotent analysis usage ledger. Added one CLI-generated follow-up migration
without changing either applied Task 2 migration.

The owner snapshot now obtains settled and reserved counts from a complete
owner-readable aggregation. It does not derive the split from paginated or
filterable activity and never assumes that reserved usage is zero.

Usable partial analysis results now settle their reservation, while complete
failures and workflow-start failures release it. Duplicate reservation and
technical-retry behavior remain in the existing atomic database functions.

## Files

Created:

- `src/lib/billing/supabase-repository.ts`
- `src/lib/billing/supabase-repository.test.ts`
- `supabase/migrations/20260730015211_den_20_billing_repository_boundaries.sql`

Modified:

- `src/lib/billing/domain.ts`
- `src/lib/billing/database-contract.test.ts`
- `src/lib/analysis-pipeline/repository.ts`
- `src/lib/analysis-pipeline/supabase-repository.ts`
- `src/lib/analysis-pipeline/supabase-repository.test.ts`
- `src/lib/analysis-pipeline/usage-ledger.ts`
- `src/lib/analysis-pipeline/usage-ledger.test.ts`
- `src/lib/analysis-pipeline/workflow.ts`
- `src/lib/analysis-pipeline/workflow.test.ts`
- `src/lib/analysis-pipeline/retry-actions.ts`
- `src/lib/youtube-intake/actions.ts`
- `src/lib/youtube-intake/actions.test.ts`

## RED / GREEN evidence

Initial RED:

- `src/lib/billing/supabase-repository.test.ts` could not resolve the missing
  repository.
- Analysis repository tests failed because `UsageLimitReachedError` and
  `transitionReservation()` did not exist.
- Usage ledger tests failed because `createUsageLedger()` did not exist.
- Migration contract tests failed because the CLI-generated follow-up
  migration was empty.

Focused GREEN:

- Billing repository, database contract, usage ledger, and analysis repository:
  4 files, 27 tests passed.
- Billing repository plus complete analysis-pipeline suite:
  17 files, 102 tests passed.

Additional TDD cycle:

- Changed the partial-result expectation from release to settle and observed
  the intended workflow test failure.
- Updated the workflow to persist partial state and settle the reservation;
  the focused workflow test then passed.

Full-suite integration:

- The first full run found 16 failures in
  `src/lib/youtube-intake/actions.test.ts` because the newly separated admin
  client factory was not represented at that test boundary.
- Added the admin-client factory double; the focused action suite passed
  19/19, then the full suite passed 122/122 files and 1034/1034 tests.

## Query and RLS boundaries

The owner repository receives only the cookie-backed client and reads these
`security_invoker` views:

- `billing_plan_catalog`
- `billing_subscription_overview`
- `billing_usage_summary`
- `billing_usage_activity`
- `billing_payment_summary`
- `billing_invoice_history`
- `billing_customer_overview`

Every user-specific query includes `.eq('user_id', userId)`, even though RLS
also enforces ownership. Every returned row is parsed through a strict Zod
schema. Database errors, malformed rows, malformed query cursors, and malformed
projection inputs become `BillingRepositoryError`; raw Supabase/Zod failures
do not escape.

The new views are `security_invoker = true`, authenticated-read-only, revoked
from `PUBLIC` and `anon`, and rely on the existing indexed owner RLS policies
of their source tables.

The projection repository receives only the server admin client. It performs
no direct table operation and calls service-role-only, security-invoker RPCs:

- `claim_billing_webhook_event`
- `apply_billing_subscription_projection`
- `apply_billing_invoice_projection`
- `mark_billing_webhook_processed`
- `mark_billing_webhook_failed`

Each RPC contains a null-safe service-role guard. Execute is revoked from
`PUBLIC`, `anon`, and `authenticated`. Claim retries failed or interrupted
processing events, while processed events remain duplicates. Apply operations
are idempotent and stale Stripe event timestamps cannot overwrite newer
subscription or invoice projections. Processed/failed completion operations
are safe across retries.

The subscription projection resolves exactly one active configured
`billing_prices` row owned by the supplied plan and interval; missing or
ambiguous configuration fails closed. Public repository types continue to use
stable plan slugs and do not expose database plan IDs or Stripe Price IDs.

## Complete usage aggregation proof

`billing_usage_summary` first selects the same single active entitlement
priority used by `billing_subscription_overview`: paid-through Stripe before
Free, then latest period and deterministic ID.

It joins the complete `analysis_usage_reservations` relation for that
entitlement and independently computes:

- `settled_analyses` where reservation status is `settled`;
- `reserved_analyses` where reservation status is `reserved`.

The repository owner-filters that view and verifies:

`overview.used_analyses === settled_analyses + reserved_analyses`

before building the strict `BillingSnapshot`. Remaining and limit must also
pass the Task 3 invariant:

`used + reserved + remaining === limit`

The activity page is used only for recent display rows and list pagination; it
never participates in entitlement arithmetic.

## Error mapping

`create_analysis_pipeline` errors map to `UsageLimitReachedError` only when:

- PostgreSQL code is exactly `P0001`; and
- message is exactly `usage_limit_reached`.

The reset detail is parsed through `Date.parse()` and normalized with
`toISOString()`. Invalid or missing detail becomes `null`, never an invalid
timestamp or arbitrary database text. Other database errors remain the
controlled `AnalysisRepositoryError`.

## Call-site integration

`createNoopUsageLedger()` was replaced by `createUsageLedger()`.
`settle(jobId)` and `release(jobId)` delegate to
`transitionReservation(jobId, status)`, which calls the existing idempotent
`transition_analysis_usage` RPC.

Production wiring:

- workflow execution uses its existing admin repository for ledger changes;
- YouTube start actions use the cookie-backed repository for owner creation
  and a separately constructed admin repository only for ledger transition;
- retry actions preserve the owner cookie repository for retry authorization
  and use a separate admin ledger repository;
- start failure still releases;
- complete and usable partial results settle;
- total failure releases;
- retry remains the existing zero-quantity technical retry and does not create
  a second reservation.

No service key, admin client, internal Price ID, or raw Stripe object crosses a
client boundary.

## Verification

Passed:

- focused repository/migration/ledger tests: 27/27;
- billing repository plus analysis pipeline: 102/102;
- full unit/integration suite: 122 files, 1034 tests;
- `npm run typecheck`;
- `npm run lint`;
- focused Prettier check for all scoped TypeScript files;
- `git diff --check`;
- production build with documented non-secret placeholder public environment:
  compilation, TypeScript, and 24/24 generated pages passed.

The repository-wide `npm run format:check` still reports the three pre-existing
approved reference/plan files from earlier DEN-20 tasks. They were not changed
because the approved prototype is immutable. All Task 4 TypeScript files pass
the focused formatting check.

Browser desktop/mobile/reduced-motion verification is not applicable to Task 4
because it adds no route, component, CSS, or rendered behavior.

## Self-review

- Re-read the Task 4 brief, Task 3 report, DEN-20 plan/design, ADR, Task 2
  migrations, Supabase RLS guidance, and Postgres privilege/index guidance.
- Confirmed all owner reads use views and explicit owner filters.
- Confirmed all privileged writes use RPCs with service-role guards and
  least-privilege execute grants.
- Confirmed applied migrations are unchanged and the extension was generated
  through the Supabase CLI.
- Confirmed the complete usage split cannot be affected by activity filters,
  pagination, or a reserved-zero fallback.
- Confirmed malformed boundary data fails closed.
- Confirmed production call sites keep owner and admin clients separate.
- Confirmed partial-result charging matches the accepted DEN-20 rule.
- Confirmed no environment files, credentials, dependencies, UI files, or
  unrelated product behavior were added.

## Remaining concern

`npx supabase db reset` could not execute because Docker Desktop/the Docker
daemon is unavailable in this environment. Therefore the new migration,
advisors, migration list, and live SQL/RLS/RPC query checks require the
controller's staged Supabase validation before merge. Static migration
contracts pass, and the SQL received a manual security/idempotency review, but
this report does not claim live database execution.

## Fix round 1

Status: DONE_WITH_CONCERNS

Commit: `fix(den-20): harden billing usage boundaries`

### Findings addressed

1. Workflow start and run attachment now have separate error boundaries.
   `workflow.start()` failure still persists `workflow_start_failed` and
   releases the reservation. Once a durable run exists, attachment failure
   returns that run ID without marking the job failed or releasing usage. The
   workflow can continue from its durable `jobId` input and later settle the
   preserved reservation.
2. Webhook claims now use a bounded five-minute processing lease. A fresh
   `processing` row is a duplicate. A `failed` row is retryable immediately.
   A `processing` row is reclaimable only when `updated_at` is at least five
   minutes old. The single conditional update increments attempts and refreshes
   `updated_at`, so concurrent stale reclaimers serialize and only one retains
   the lease predicate.
3. Every owner-specific parsed boundary validates its returned `user_id`
   against the requested owner before mapping: overview, complete usage
   summary, recent activity, payment summaries, customer, usage pages, and
   invoice pages.
4. Privileged webhook projection construction moved to
   `supabase-projection-repository.ts`. That module starts with
   `import 'server-only'` and accepts the distinct branded
   `SupabaseBillingAdminClient`. The generally importable owner repository no
   longer exports a projection factory and its client type no longer exposes
   `rpc()`.
5. Exact-count pagination fails closed unless Supabase returns a non-negative
   safe integer consistent with the current offset and visible rows. Usage and
   invoice pages never substitute fetched/lookahead row length for a missing
   exact count.

### RED evidence

The first focused run failed exactly at the reviewed boundaries:

- attach-after-start rejected with `AnalysisWorkflowStartError` and entered the
  release path instead of returning the existing run;
- the migration lease contract found the unconditional
  `processing_status in ('failed', 'processing')` claim;
- a later usage page with `count: null` resolved with an inflated fallback
  total instead of rejecting;
- the owner module still exported
  `createSupabaseBillingProjectionRepository`;
- the new server-only projection module did not yet exist.

After replacing an initially incomplete cross-owner fixture with a fully valid
snapshot fixture, two additional intended RED failures proved that cross-owner
recent activity and payment rows were accepted into an otherwise valid
snapshot.

### GREEN evidence

- Focused start, workflow, owner repository, projection repository, and
  migration suites: 5 files, 33 tests passed.
- Full unit/integration suite: 123 files, 1043 tests passed.
- Strict TypeScript: passed.
- ESLint: passed.
- Focused Prettier check: passed.
- `git diff --check`: passed.
- Production build with non-secret placeholder public environment: compiled,
  typechecked, and generated 24/24 pages.

### Fix-round self-review

- Confirmed no path after a returned workflow run calls `ledger.release()`.
- Confirmed start failure behavior and complete/partial settlement behavior
  remain unchanged.
- Confirmed fresh processing claims cannot satisfy the reclaim update, failed
  claims can, and stale processing claims require an explicit bounded timeout.
- Confirmed the lease update increments attempts and the existing
  `updated_at` trigger renews the lease atomically.
- Confirmed owner validation happens before every mapping operation.
- Confirmed owner code cannot construct privileged projection repositories and
  the admin brand is not part of the owner client contract.
- Confirmed both usage and invoice pagination reject absent exact counts.
- Did not address the two recorded Minor findings, as directed.

### Remaining concern

The existing Docker limitation remains: the controller must stage-run the
amended, not-yet-applied migration and database advisors. No additional
migration was created.

## Fix round 2

Status: DONE_WITH_CONCERNS

Commit: `fix(den-20): restrict billing view privileges`

### Runtime finding addressed

The controller successfully applied
`20260730015211_den_20_billing_repository_boundaries.sql` to staging and found
that Supabase default view privileges left `authenticated` with all table-like
privileges on the three new views. Security-invoker behavior and underlying RLS
still constrained rows, but the ACL did not meet the explicit least-privilege
contract and simple views may be updatable.

The staged migration is now immutable. Its SHA-256 is locked in the contract
suite as:

`40522551b0158c68c0a8166f1e58b6a9cc27bb8922d73c250702c48653c8a1c2`

### Follow-up migration

Generated through the Supabase CLI:

`20260730022802_den_20_billing_view_privilege_hardening.sql`

For each of:

- `billing_usage_summary`;
- `billing_customer_overview`;
- `billing_payment_summary`;

the migration first revokes ALL from `PUBLIC`, `anon`, `authenticated`, and
`service_role`, then grants only SELECT to `authenticated` and `service_role`.
Authenticated owner reads require SELECT. Service-role SELECT is retained for
server-side operational inspection while no mutation privilege remains. The
ordering makes the final ACL deterministic despite Supabase default
privileges.

The follow-up migration contains exactly three SELECT grants and no non-SELECT
grant.

### RED evidence

The CLI-generated migration was intentionally empty when the strengthened
contract suite first ran.

`npm test -- src/lib/billing/database-contract.test.ts`

failed four intended tests:

- missing revoke/grant sequence for `billing_usage_summary`;
- missing revoke/grant sequence for `billing_customer_overview`;
- missing revoke/grant sequence for `billing_payment_summary`;
- zero SELECT grants instead of exactly three.

The applied Task 4 migration hash/order assertion passed during RED, proving the
test targeted only the new empty migration.

### GREEN evidence

- Focused migration and owner/projection repository suites: 3 files, 28 tests
  passed.
- Full unit/integration suite: 123 files, 1048 tests passed.
- Strict TypeScript: passed.
- ESLint: passed.
- Focused Prettier check: passed.
- `git diff --check`: passed.
- Production build with non-secret placeholder public environment: compiled,
  typechecked, and generated 24/24 pages.

### Fix-round self-review

- Confirmed the staged `20260730015211` migration was not edited.
- Confirmed the new filename was generated by the Supabase CLI and sorts after
  the applied Task 4 migration.
- Confirmed every revoke includes all four roles and appears before its
  corresponding grant.
- Confirmed authenticated and service_role finish with SELECT only.
- Confirmed no other schema, RLS, function, repository, or UI behavior changed.
- Did not apply the new migration to staging.

### Remaining concern

The controller must apply the follow-up migration, inspect
`information_schema.role_table_grants`, and then run the owner-RLS summary and
concurrent webhook-claim checks. This agent intentionally did not perform those
staging mutations.

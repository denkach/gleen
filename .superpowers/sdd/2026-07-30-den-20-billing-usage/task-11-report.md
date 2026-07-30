# DEN-20 Task 11 Report

## Outcome

Task 11 adds deterministic Playwright behavior, visual, keyboard,
mobile-sheet, overflow, and reduced-motion coverage for all six DEN-20 billing
screens. No live Stripe or Supabase service, secret, Customer ID, internal
Price ID, card field, or Stripe iframe is used by the fixture boundary.

The behavior suite found and fixed:

- annual subscription links used `period=year` while Checkout accepts the
  closed `interval=year` contract;
- the approved mobile billing navigation and More sheet were missing;
- the mobile page-entry transform displaced fixed billing navigation below the
  device viewport;
- intrinsic mobile metric sizing clipped usage/reset content;
- the mobile usage/invoice toolbars clipped filters;
- Portal payment method and expiry copy collided on one line.

## RED / GREEN Evidence

### Behavior RED

Command:

```bash
PLAYWRIGHT_PORT=3060 npx playwright test tests/e2e/billing.spec.ts --project=chromium
```

Result: 8 failed, 3 passed. Failures were the intended missing behaviors:

- annual query key mismatch;
- missing usage and invoice pagination/action fixture boundaries;
- disabled Checkout fixture boundary;
- missing Portal fresh-session boundary;
- wrong keyboard expectation after the period switch;
- missing mobile More sheet.

The deliberate invalid-fixture 404 initially emitted a browser console error;
that assertion was moved to Playwright request context so browser diagnostics
remain strict.

### Focused GREEN

- Portal concurrency/error rerun: 1 passed.
- Pixel 7 subscription navigation layering rerun: 1 passed.
- Usage desktop/mobile pair after metric sizing fix: 2 passed.
- Checkout desktop/mobile pair: 2 passed.
- Portal desktop/mobile pair after payment-copy fix: 2 passed.
- Invoice desktop: 1 passed.
- Invoice mobile after toolbar and paint-stability fixes: 1 passed.
- Limit desktop: 1 passed.
- Limit mobile: 1 passed.
- Usage mobile after shared toolbar fix: 1 passed.

### Final Chromium GREEN

Command:

```bash
PLAYWRIGHT_PORT=3060 npx playwright test tests/e2e/billing.spec.ts tests/e2e/billing.visual.spec.ts --project=chromium --workers=1 --timeout=30000
```

Result: 23 passed in 26.1 seconds:

- 11 behavior tests;
- 12 visual tests.

Execution was externally bounded to 180 seconds. Visual runs use one worker,
font readiness, network idle, a nonzero visible billing root, two animation
frames after font readiness, disabled animations, hidden caret, scroll reset,
strict console/page-error collection, and explicit Next error-overlay checks.

### Final mobile-chrome GREEN

Command:

```bash
PLAYWRIGHT_PORT=3061 npx playwright test tests/e2e/billing.spec.ts --project=mobile-chrome --workers=1 --timeout=30000
```

Result: 3 passed in 7.6 seconds:

- bottom-sheet focus containment, Escape, and trigger restoration;
- all six screens without horizontal document overflow at 320 px;
- computed reduced-motion behavior with truthful visible state.

Execution was externally bounded to 120 seconds.

## Behavior Coverage

- All six fixture routes return 200 only behind the existing preview guard.
- Invalid screen/state combinations return 404.
- Existing production-guard unit tests assert the fixture returns `notFound()`
  when preview mode is disabled.
- All six unauthenticated production billing routes redirect to
  `/session-expired` before owned content is exposed.
- Monthly and yearly subscription presentation uses monthly equivalents while
  annual summary totals retain yearly units.
- Subscription Checkout links contain only plan slug and closed interval.
- Usage search, event type, date range, pagination preservation, and CSV
  boundary payload are asserted.
- CSV fixture content spreadsheet-protects a formula-leading cell.
- Checkout action payload contains only `{ plan, interval }`; no identity,
  email, Customer ID, internal Price ID, card, CVC, or expiry field appears.
- Static Checkout fixture contains no Stripe iframe.
- Portal actions create a fresh URL per intent, suppress concurrent duplicate
  clicks, recover from an error, and clear `aria-busy`.
- Invoice search, status, year, pagination, and HTTPS-only actions are
  asserted.
- Limit recovery links, disabled extra-credit control, and unauthenticated
  production redirect are asserted.
- Desktop keyboard order begins at the skip link and reaches the expected plan
  actions.

## Baseline Matrix

| Screen | State | Desktop | Pixel 7 |
| --- | --- | --- | --- |
| Subscription | active | `1440x900` | `412x839` |
| Usage | empty-usage | `1440x900` | `412x839` |
| Checkout | active | `1440x900` | `412x839` |
| Portal | past-due | `1440x900` | `412x839` |
| Invoices | failed-invoice | `1440x900` | `412x839` |
| Limit reached | limit-reached | `1440x900` | `412x839` |

All 12 PNG dimensions were independently audited with `sips`. Exact stable
names use the `den-20-{geometry}-{device}-{screen}-{state}-chromium.png`
scheme. No unrelated baseline was updated.

The first missing-baseline run intentionally did not use
`--update-snapshots`. Its actuals exposed that `fullPage: true` violated exact
device geometry and stitched fixed navigation over content. Those images were
rejected. Baselines were then regenerated incrementally, one screen or screen
pair at a time, only after review.

## Image Inspection

Each desktop and Pixel 7 state was visually inspected. Accepted images show:

- the canonical plan, state, prices, units, dates, status labels, shell
  navigation, and responsive screen state;
- no Next error overlay, blank frame, hidden Stripe iframe, masked billing
  content, or contradictory catalog value;
- no clipped metric values;
- complete mobile usage and invoice filter controls;
- Portal card expiry on its own line;
- fixed mobile Plan / Usage / More navigation;
- correct past-due, failed-invoice, empty-usage, and locked-limit states.

Only nondeterministic `nextjs-portal` elements without a dialog are hidden.
Billing content, prices, dates, icons, controls, and navigation are never
masked.

## Accessibility, Mobile, and Motion

- Billing mobile navigation replaces the workspace bottom nav on billing
  screens at the approved mobile breakpoint.
- The More sheet uses `role="dialog"`, `aria-modal`, `aria-expanded`,
  `aria-controls`, safe-area padding, background pointer interception, Tab /
  Shift+Tab containment, Escape dismissal, body scroll locking, and trigger
  focus restoration.
- Controls retain visible focus styles and semantic links/buttons.
- The 320 px sweep covers all six screens.
- Mobile metric grids use shrink-safe columns and wrap long status values.
- Mobile toolbars use a complete two-column layout rather than clipped
  horizontal controls.
- `prefers-reduced-motion: reduce` yields `animation-name: none`, effectively
  zero animation/transition durations, and `scroll-behavior: auto` while the
  limit state remains visible and accurate.

## Browser Gut Check

After the first live server start, the required browser check verified:

- Subscription fixture loaded with meaningful content;
- no framework error overlay;
- console diagnostics were `[]`;
- expected interactive navigation, period controls, plans, and billing action
  rendered;
- navigation to the Usage fixture rendered the Usage ledger heading;
- the browser session was closed.

The initial server attempt was not counted as RED because the sandbox blocked
the port bind with `EPERM`; the exact command was rerun with approved local
server permission.

## Static and Unit Verification

- Changed-file Prettier: pass.
- Full ESLint: pass.
- Full TypeScript check: pass.
- Focused billing and fixture Vitest: 9 files, 71 tests passed.
- `git diff --check`: pass.
- `next-env.d.ts`: restored before commit.

Repository-wide `npm run format:check` remains blocked by three pre-existing,
untouched files:

- `design/prototypes/billing/gleen-billing-pages-v3.html`;
- `docs/superpowers/plans/2026-07-30-den-20-billing-usage.md`;
- `docs/superpowers/specs/2026-07-30-den-20-billing-usage-design.md`.

The immutable approved prototype must not be reformatted in Task 11. All files
changed by Task 11 pass Prettier.

## Flake Controls and Self-review

- Final proof uses one Playwright worker.
- Screenshot capture waits for network idle, fonts, visible/nonzero billing
  root, and two paint frames.
- Console and uncaught errors fail every test automatically.
- Screenshot capture asserts no Next/Vite/Webpack error overlay.
- Screenshot generation runs were time-bounded and split incrementally after
  an orchestration delay; no live server listener remained afterward.
- The production action boundary remains authenticated and server-authoritative.
  Test-only actions are confined to the already preview-guarded billing
  fixture.
- React review found no new data-fetch waterfalls, third-party client bundle,
  unsafe server/client serialization, or missing interaction cleanup.

Remaining concern: global Prettier remains red only for the three untouched
reference/spec files listed above.

## Review Fix Round 1

The first review round strengthens five acceptance boundaries:

- Authenticated acceptance now targets all six real `/app/subscription`
  production routes. A server-only Supabase-compatible boundary is enabled
  only when UI preview mode is active, a non-public
  `PLAYWRIGHT_AUTH_FIXTURE_TOKEN` exists, and an exact HttpOnly cookie matches.
  Production Vercel, local production, missing-token, and mismatched-cookie
  cases always retain the real client. Mixed owner and foreign rows exercise
  the unchanged repository `.eq('user_id', ownerId)` filters; the browser
  requires owner identity/usage and rejects the foreign marker.
- The existing preview-only app-shell fixture now injects a deterministic
  `usage_limit_reached` action into the real `NewAnalysisForm`. Acceptance
  submits the form, observes its closed client redirect, and loads the real
  production limit route through the authenticated owner-data boundary.
- Mobile billing navigation now uses the approved plan, chart, and more
  `BillingIcon` glyphs, prototype active styling, route-derived active state,
  and `aria-current="page"`. The existing focus-contained More sheet remains
  the interaction boundary and uses the approved numbered destinations.
- Checkout visual fixtures now render a non-interactive, visual-only Stripe
  Elements stand-in with approved email, card, expiry, CVC, country, VAT,
  receipt/save, secure-copy, and promotion geometry. It contains no iframe,
  raw card value, secret, customer identifier, or live Stripe dependency.
- CSV acceptance reads the downloaded bytes and asserts the UTF-8 BOM,
  RFC4180-quoted formula-neutralized cell, and absence of an unescaped
  formula-leading record.

Before browser reruns, the server boundary gate tests passed 4 of 4 and full
TypeScript checking passed. A further repository integration assertion was
added to prove that mixed-owner source rows return only owner rows. Playwright
startup was then deferred to the controller after repeated local webServer
orchestration stalls produced no reporter output; those attempts are not
claimed as GREEN. The affected mobile and Checkout baselines must be
regenerated and visually inspected during the final controller verification.

## Controller Verification and Review Fix Round 2

Controller verification completed the deferred browser work and fixed issues
that the strengthened acceptance test exposed:

- all six authenticated production routes now render owner-scoped content
  without fallback states; Checkout is verified as a server-rendered HTTP
  response so the auth assertion cannot hydrate Stripe.js or start a production
  Checkout action;
- the authenticated E2E boundary is unavailable on every Vercel environment,
  local production, missing explicit fixture mode, missing token, or mismatched
  cookie; Playwright creates a cryptographically random token at runtime and
  shares it with the worker and local web server only;
- the Invoices page now imports its pure route-query parser from a server-safe
  billing module instead of calling a Client Component export from the server;
- the mobile More trigger remains disabled until hydration through
  `useSyncExternalStore`, eliminating a verified intermittent dead-click race;
- all mobile navigation and sheet CSS is scoped under `.billing-experience`,
  restoring the stylesheet isolation contract;
- the Checkout visual fixture baseline was accepted only after inspection of
  expected, actual, and diff images. The only changed PNG is desktop Checkout;
  the other 11 exact baselines passed unchanged.

Fresh verification:

- focused boundary, invoice, stylesheet, and fixture tests: pass;
- full ESLint: pass with no warnings;
- full TypeScript check: pass;
- full Vitest: 144 files, 1,220 tests passed;
- Chromium behavior plus visual: 23 tests passed;
- mobile-chrome behavior: 3 tests passed;
- changed-file Prettier: pass;
- `git diff --check`: pass.

The first attempted parallel Chromium/mobile run was rejected before tests
because Next.js permits only one development-server lock per worktree. It is
not counted as test evidence. The mobile suite was rerun sequentially and
passed 3 of 3.

Repository-wide `npm run format:check` still reports only the same three
pre-existing untouched prototype/spec/plan files documented above. They remain
outside the Task 11 review-fix diff.

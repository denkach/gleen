# DEN-29 Account Pages Refinement Design

## Outcome

The authenticated Settings page and recoverable Subscription error states match the approved `gleen-account-pages-cb-v1` prototype without changing account ownership, billing entitlements, plan data, locale persistence, or application navigation.

## Sources of truth

- Linear issue `DEN-29`.
- `docs/product.md`, especially Languages, Subscription and billing, Required failure states, and Definition of done.
- `docs/design-system.md` and the existing authenticated App Shell.
- The unchanged files under `design/prototypes/gleen-account-pages-cb-v1/`:
  - `gleen-account-pages-cb-v1.html`
  - `gleen-account-pages-cb-v1/desktop-settings.png`
  - `gleen-account-pages-cb-v1/mobile-settings.png`
  - `gleen-account-pages-cb-v1/desktop-subscription.png`
  - `gleen-account-pages-cb-v1/mobile-subscription.png`

The production UI must match these references rather than reinterpret them. Existing shared tokens and shell primitives remain authoritative where the prototype contains hard-coded demonstration data.

## Architecture

The implementation stays within the existing Settings and Billing boundaries.

- `LanguagePreferences` remains the client owner of the two independent language forms. The existing `setInterfaceLocale` and `setOutputLocale` server actions remain separate and unchanged unless a test demonstrates a contract defect.
- Settings receives a page-specific composition and token-backed styles in the existing App Shell stylesheet. Small decorative icons are rendered through existing icon primitives or a focused settings icon component; they do not introduce a dependency.
- Subscription presentation remains server-owned. A payment-method-only Stripe failure continues to produce a valid `SubscriptionPresentation` with an unavailable payment method while preserving Supabase-owned plan and usage data.
- A focused client component owns only the full subscription snapshot recovery card. It manages `ready`, `retrying`, and `failed-again` behavior without owning billing data or reconstructing server state.
- A focused authenticated server action retries the existing Supabase-owned subscription snapshot read and returns only a controlled success/error result. On success the client calls `router.refresh()`, allowing the normal server page to rebuild the authoritative presentation. On failure it restores the ready controls and announces the localized repeated-failure message. Duplicate activation is prevented while the action is pending.
- Support is a real `mailto:gleen_support@gmail.com` destination. The address is defined outside the visual error component and supplied as a prop so billing UI does not own contact configuration.

## Settings experience

The page uses the approved hierarchy: account eyebrow, editorial Settings heading, concise lead, a primary settings surface with two rows, and an explanatory note surface.

Each language row contains:

- a restrained line icon;
- a localized title and description;
- a native select containing exactly the five approved locale choices in canonical order;
- an explicit localized save button;
- a stable-height, polite status region for success and an assertive status for failure.

Interface and generated-content locale values load, change, and save independently. Saving interface locale refreshes translated server content after persistence. Saving output locale does not refresh the interface. Neither action changes the other select.

The pending state disables only the form being submitted and preserves the normal button label. There is no visible “Saving language…” copy. Success and error feedback appears in the reserved status region without shifting the row. Selecting a new value clears the previous success state for that row.

The note explains that language changes apply only to future generated materials, do not alter previous analyses, and belong to the current account.

## Subscription recovery experience

When the complete subscription snapshot is unavailable, the page retains its normal eyebrow, title, and lead and shows the approved structured recovery card:

- restrained warning symbol;
- localized title and explanation that application access is unaffected;
- primary retry action;
- secondary `mailto:gleen_support@gmail.com` support action;
- security reassurance that does not claim unverified certifications;
- localized last-attempt metadata based on the client attempt time.

The first server-rendered state does not invent a failure timestamp. The metadata shows a localized “not retried yet” value until the user starts a retry. When retry starts, the current client time is captured. While pending, the retry button is disabled, its label changes to localized retrying copy, and a restrained spinner is exposed as decorative only. Repeated clicks and keyboard activation cannot create concurrent requests.

If the retry action fails, the component returns to an enabled retry state and announces a localized repeated-failure message. If the retry action succeeds, a route refresh lets the normal subscription presentation replace the error card. Raw exceptions, Stripe identifiers, user identifiers, and secrets never render or cross the server-action boundary.

When only Stripe payment data is unavailable, the normal plan and usage surface remains visible. Payment method copy stays truthful and unavailable; the full snapshot recovery card is not used.

## Responsive and motion behavior

- Desktop follows the approved wide account-page composition inside the existing fixed sidebar and sticky top bar.
- Tablet collapses Settings to a single content column before labels or actions become cramped.
- Mobile uses the existing App Shell top bar and bottom navigation. Settings rows stack in reading order, actions become full width, and the recovery card separates its symbol from centered copy and actions.
- No viewport may gain horizontal overflow. Controls retain touch-friendly sizes and long localized strings wrap within their columns.
- Keyboard order follows document order. Focus remains on the initiating save control after a form result. Retry focus remains on the retry action after another failure; recovered navigation follows normal page focus behavior.
- Under `prefers-reduced-motion: reduce`, the spinner, pulse, and non-essential transitions are disabled. Status changes remain available through text and semantics.

## Localization and accessibility

All new visible and accessible copy is authored for Ukrainian, Russian, English, Spanish, and German in the existing message catalogs. Plan names, account data, prices, limits, currencies, and locale choices remain data-driven.

The design uses semantic headings, native selects, native form submission, links for navigation and email, visible focus, `aria-live` status regions, and `role="alert"` only for actionable failures. Decorative symbols are hidden from assistive technology. Color is never the only status indicator.

## Testing

TDD covers each observable behavior before production changes:

- Settings component tests verify independent values and submissions, unchanged pending labels, localized success/failure, stable status regions, keyboard order, and disabled load-error behavior.
- Settings page tests verify persisted values and fallback handling.
- Subscription component tests verify full-error structure, working support destination, single-flight retry, retry rejection, last-attempt metadata, and preservation of normal presentation for payment-method-only failure.
- Message-catalog tests verify complete five-locale shape and non-empty new strings.
- Browser tests verify desktop and mobile layouts, no overflow, keyboard operation, focus behavior, and reduced motion.
- Approved visual snapshots cover Settings and the full Subscription recovery state at desktop and mobile dimensions.
- Final verification runs formatting, linting, strict type checking, unit and integration tests, the production build, and affected authenticated browser flows.

## Scope boundaries

This issue does not change plan names, prices, currencies, limits, entitlement rules, checkout, webhooks, invoice policy, supported languages, unrelated authenticated pages, or Stripe live-mode configuration. It adds no production dependency and does not implement a contact page.

## Assumptions and risks

- The support mailbox `gleen_support@gmail.com` is approved for user-facing contact. Email-client availability is controlled by the user’s device.
- Full retry recovery uses the existing route as the source of truth; it does not add client-side billing caches.
- Long German, Ukrainian, and Russian copy can increase row height, but the outer layout must remain aligned and must not enforce clipping.
- The prototype directory currently exists only as user-owned untracked files in the main checkout. It will be copied unchanged into the isolated DEN-29 branch before implementation and committed without modifying the originals.

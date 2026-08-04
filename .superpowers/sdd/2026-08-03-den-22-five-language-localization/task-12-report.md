# DEN-22 Task 12 verification report

## Scope

- Issue: DEN-22 — complete five-language localization.
- Branch: `den-22-complete-five-language-localization`.
- Starting commit: `f217451`.
- Interface locales: `uk`, `ru`, `en`, `es`, `de`.
- Routes remain unprefixed; interface and generated-content locales remain independent.

## Plan, assumptions, dependencies, and risks

- Add focused `@localization` Playwright journeys for guest persistence,
  authenticated fixtures, output-locale independence, keyboard access,
  German/Spanish responsive expansion, and reduced motion.
- Preserve the approved dark Prism design and existing billing/processing
  behavior. Any implementation change is limited to a localization-caused
  failure reproduced by the new suite.
- Browser fixtures depend only on the existing local Playwright environment
  values in `playwright.config.ts`; no real credentials or `.env` files are
  used.
- The authenticated settings route is the highest-risk boundary because it
  joins locale resolution, onboarding preferences, and the local authenticated
  billing fixture.

## Baseline

- `npm test` — PASS: 168 files, 1,550 tests.

## RED / GREEN evidence

### Browser startup RED

- `PLAYWRIGHT_PORT=3076 npx playwright test tests/e2e/localization.spec.ts --project=chromium`
  could not bind the local server inside the sandbox: `listen EPERM` on
  `127.0.0.1:3076`. The required escalated retry reached Next.js but stopped
  before collecting a test because an RSC prop contained
  `exampleTabs: function exampleTabs` (digest `680688337`).
- The interrupted run left a stale listener on port 3076 (PID 7044). A later
  check showed the listener was gone. Local `reuseExistingServer` also caused
  an interrupted pre-fix server on port 3079 to be reused; subsequent browser
  work uses a fresh port or `CI=1` so a new server is guaranteed.

### RSC localization boundary RED / GREEN

- RED: `npx vitest run src/app/ui/page.test.tsx` — 1 file failed, all 5 locale
  cases failed because the `/ui` client prop received a function instead of a
  serializable localized tab-label map.
- GREEN: `npx vitest run src/app/ui/page.test.tsx src/app/ui/ui-preview.test.tsx`
  — 2 files passed, 7 tests passed after server-side materialization.
- A fresh `/sign-in` reproduction then proved a second instance of the same
  root cause: structural `LocaleSwitcherCopy` typing did not remove runtime
  `common` and `uiPreview` domains from the full shared catalog.
- RED: `npx vitest run src/app/page.test.tsx` — 5 new locale cases failed;
  received keys were `common`, `localeSwitcher`, and `uiPreview`, while the
  client boundary requires only `localeSwitcher`.
- GREEN: `npx vitest run src/app/page.test.tsx src/components/auth/auth-shell.test.tsx src/app/app/layout.test.tsx src/app/ui/page.test.tsx src/app/ui/ui-preview.test.tsx`
  — 5 files passed, 21 tests passed. The locale-switcher materializer copies
  only the exact string fields and is used at landing, auth, app layout, and
  localized app/history/result/billing fixture boundaries.

### Portalled locale submission RED / GREEN

- Fresh-browser RED: `CI=1 PLAYWRIGHT_PORT=3082 npx playwright test tests/e2e/localization.spec.ts --project=chromium --grep "guest locale" --timeout=30000 --global-timeout=120000`
  — 1 test failed on all 3 attempts. The trace proves Playwright clicked the
  visible `Deutsch` menu item, but the portalled Radix item closed without
  emitting a POST/server-action request; the URL stayed intact while the UI
  and `<html lang>` remained English.
- Unit RED: `npx vitest run src/components/i18n/locale-switcher.test.tsx` — 1
  test failed and 1 passed because the locale option made 0 explicit
  `requestSubmit` calls.
- Unit GREEN: the same command — 1 file passed, 2 tests passed after explicitly
  submitting the associated form from the portalled menu item and synchronizing
  the preserved root `<html lang>` after the successful server action.
- Fresh-browser follow-up on port 3083 proved the POST, `gleen_locale=de`
  response cookie, German RSC refresh, preserved URL, and `de-DE` document
  language all work. The German heading was present in the DOM but inaccessible
  because the still-open modal menu marked the auth card `aria-hidden` while
  the save was pending.
- Modal-menu RED: `npx vitest run src/components/i18n/locale-switcher.test.tsx`
  — 1 test failed and 2 passed; a deliberately pending locale action left the
  menu in `data-state="open"` with disabled items.
- Modal-menu GREEN: the same command — 1 file passed, 3 tests passed after
  controlling the menu state and closing it before explicit form submission.
- Fresh-browser GREEN: `CI=1 PLAYWRIGHT_PORT=3084 npx playwright test tests/e2e/localization.spec.ts --project=chromium --grep "guest locale" --timeout=30000 --global-timeout=120000`
  — 1 test passed in 5.2 seconds, covering the preserved route/query, German
  document language and accessible auth copy, and guest-cookie persistence
  after reload.

### Full localization-suite assertion RED

- `CI=1 PLAYWRIGHT_PORT=3085 npx playwright test tests/e2e/localization.spec.ts --project=chromium`
  — 3 passed and 8 failed in 4.3 minutes. The three functional locale journeys
  passed. Trace and accessibility snapshots showed the remaining failures were
  assertions that did not match the approved UI mechanisms:
  - keyboard focus uses the shared dropdown's highlighted-state inset
    `box-shadow`, while the test checked only `outline`;
  - the localized hero's two visual lines are separated by `<br>`, so raw
    `textContent` concatenates them while the accessibility tree correctly
    exposes the expected heading with a space;
  - Radix names the menu from its trigger via `aria-labelledby` (`Language:
    English`), which takes precedence over the content's `aria-label`.
- The assertions now verify the focused/highlighted option's visible computed
  `box-shadow`, locate the hero by its exact semantic accessible name, and
  locate the single open locale menu by role. Approved markup, copy, and focus
  styling are unchanged.

### Authenticated settings fixture RED / GREEN

- Fresh-browser follow-up on port 3086 stopped after deterministic repeats: 3
  passed, 7 failed, and 1 did not run. All six responsive matrices reached
  localized landing, auth, intake, History, result, and billing views; the
  authenticated settings request then failed because the token-gated fixture
  rejected the exact `profiles` lookup used by request-locale resolution.
- Unit RED: `npx vitest run src/lib/billing/authenticated-e2e-boundary.test.ts`
  — 1 failed and 8 passed because `readInterfaceLocale` rejected `profiles`.
- Unit GREEN: the same command — 1 file passed, 9 tests passed after adding
  only `profiles` to the fixture's explicit table catalog with no seeded
  profile. The owner-filtered lookup returns `null`, allowing the locale cookie
  and default onboarding state to remain authoritative; an unrelated profile
  table is still rejected.

### Review round: authenticated profile persistence RED / GREEN

- Review found that the functional test named “authenticated fixture” switched
  to Spanish before installing the authenticated fixture cookie. It therefore
  proved only guest-cookie persistence; the cookie was added later only for the
  responsive settings visits. The read-only `profiles` fixture also lacked the
  exact `.upsert(...).select(...).single()` chain used by authenticated locale
  persistence.
- Strict unit RED:
  `npx vitest run src/lib/billing/authenticated-e2e-boundary.test.ts` — 2 failed
  and 9 passed. The real onboarding storage chain failed with
  `upsert is not a function`, and invalid writes could not produce the required
  narrow fixture rejection.
- Unit GREEN: the same command — 1 file and all 11 tests passed. The local,
  token-gated fixture now persists only the exact
  `{ user_id: fixtureOwner, interface_locale: supportedLocale }` row with exact
  `{ onConflict: 'user_id' }` options. The profile survives distinct fixture
  client instances; wrong table, owner, field, locale, or conflict key is
  rejected. Unknown tables remain rejected and no general fake database was
  introduced.
- The browser journey now installs authentication before the locale action,
  deletes `gleen_locale` after the action while verifying the auth cookie
  remains, then opens a new page at authenticated settings, reloads it, and
  continues through History, result, and billing. Spanish can therefore be
  restored only from the fixture profile, not from the guest-cookie fallback.
  Responsive authenticated settings visits explicitly write their requested
  locale before deleting the guest cookie and reloading, keeping the
  module-persistent fixture deterministic across the serialized matrix and
  retries.
- The keyboard journey now asserts exactly five menu items and their exact five
  native-name labels before exercising each selection.
- Final review-round GREEN: the combined Chromium and mobile-chrome
  localization rerun passed 22/22 tests in 1.4 minutes. The subsequent full
  gate passed 212/212 in 4.4 minutes, with only the known color-environment and
  non-failing LCP development warnings.

### Whole-branch review: History RSC boundary RED / GREEN

- Final branch review found that both production `/app/history` returns passed
  the complete function-valued `HistoryMessages` catalog from the async Server
  Component into the client `HistoryWorkspace`. Dynamic formatters for sort,
  filters, empty states, thumbnails, actions, load-more announcements, and
  toasts therefore crossed React Flight in both the successful repository and
  safe load-error branches.
- Strict boundary RED:
  `npx vitest run src/app/app/history/page-boundary.test.tsx` — 2/2 tests failed.
  Both captured production branches contained a top-level `copy` object with
  functions instead of a serializable catalog source.
- GREEN: production now passes only exact
  `{ kind: 'catalog', locale }`. The client resolves
  `historyMessages[locale]` locally with no fallback. A discriminated
  `{ kind: 'injected', locale, copy }` source remains available only for direct
  workspace tests that exercise real dynamic formatters. The fixture workspace
  also uses the catalog source, so no nested server-to-client copy prop contains
  functions.
- Boundary and integrated GREEN:
  `npx vitest run src/app/app/history/page-boundary.test.tsx src/app/app/history/page.test.tsx src/components/history/history-workspace.test.tsx src/components/app-shell/fixture-history.test.tsx`
  — 4 files and 62 tests passed. Both production returns have no top-level
  `copy` or `locale`; their catalog source and all non-action client props pass
  `structuredClone`. The six intentional server-action references remain the
  only function-valued boundary props.
- Full History inventory GREEN: all 15 History catalog, query, database,
  repository, action, presentation, style, component, fixture, page, and new
  boundary test files passed, totaling 197 tests.
- The authenticated profile localization journey now visits the real
  `/app/history`, requires a successful response and localized `Historial`
  heading, and explicitly rejects the React Flight function-prop error text
  before continuing to the deterministic fixture routes. Its existing
  `@localization` tag collects in both desktop Chromium and mobile-chrome.
- Final whole-branch GREEN: the combined desktop/mobile localization suite
  passed 22/22 in 1.4 minutes. The subsequent full browser gate passed 212/212
  in 4.4 minutes, with only the known color-environment and non-failing LCP
  development warnings.

### Current 3086 test-fixture findings

- Keyboard trace showed the third iteration sent two arrow keys only a few
  milliseconds apart; Radix applied the first focus move to `Русский` after the
  second key had already been sent. The test now waits for each intermediate
  focused option before sending the next keyboard command.
- Hydration diagnostics showed Playwright's default screenshot caret hiding
  injected `style="caret-color: transparent"` into inputs before React finished
  hydration. Evidence screenshots now use `caret: "initial"`, avoiding that
  test-only DOM mutation.
- At the approved `max-width: 620px` result layout, the accessibility tree
  exposes localized bottom-navigation buttons while desktop/tablet expose
  tabs. The responsive assertion now selects the actual control role at the
  active viewport breakpoint.

### Mobile app-shell selector RED

- The fresh mobile localization run passed 4 tests before two functional
  journeys failed on all retries and interrupted the remaining matrix work.
  Both failures waited for the desktop-only `.app-topbar` locale switcher.
- The mobile accessibility tree proves the approved compact locale control is
  present as the visible `Language: English` button in `.mobile-topbar`.
- The suite now uses one role/name helper keyed by the current native language
  name. Accessibility visibility selects the approved desktop or compact
  mobile control without coupling journeys to shell CSS; route and locale
  assertions are unchanged.
- The next fresh mobile run passed 10 of 11 tests in 1.2 minutes. Its only
  failure was the Spanish functional journey's duplicate desktop `tab`
  assertion. Both the journey and responsive matrix now use the same
  breakpoint-aware result-navigation helper: approved bottom-navigation button
  at 620px and below, tab otherwise. The result URL assertion remains exact.
- A second fresh mobile run again passed 10 of 11 tests. The final failure was
  the Spanish journey expecting the desktop-only `Suscripción` sidebar link at
  the approved mobile billing layout. Its accessibility tree instead exposes
  the localized `Navegación móvil de facturación` region with the current
  `Plan` link and `Uso` link. The test now verifies that visible mobile region,
  `aria-current="page"`, and the fixture-safe Spanish destinations; desktop and
  tablet retain the production `/app/subscription` destination assertion.

### Production billing RSC boundary RED / GREEN

- The first broad `CI=1 PLAYWRIGHT_PORT=3078 npm run test:e2e` run was
  interrupted with 10 tests passed and 74 not run. Unlike the client-local
  billing fixture, each production `/app/subscription*` server page passed the
  complete `billingMessages[locale]` object into a client screen. Next.js
  correctly rejected formatter functions such as `expires`, `cyclePercent`,
  `remaining`, `planChange`, `choose`, checkout/order formatters, usage
  formatters, and invoice formatters at the RSC serialization boundary.
- Strict page-level RED:
  `npx vitest run src/app/app/subscription/billing-copy-boundary.test.tsx` — 1
  file failed, 6/6 route contracts failed. Every captured production client
  element still had a `copy` prop containing functions and lacked a
  serializable catalog source.
- The root fix introduces a required discriminated `BillingCopySource`:
  production pages pass the exact structured-cloneable
  `{ kind: 'catalog', locale }`, while direct component tests may explicitly
  use `{ kind: 'injected', locale, copy }`. Subscription, usage, checkout,
  portal, invoice, and limit-reached screens resolve the catalog on their side
  of the client boundary; there is no optional or silent English fallback.
- `BillingPage` no longer receives the full catalog. Its client mobile
  navigation receives only `locale` and selects the exact navigation strings
  locally, so the server-to-client navigation prop is primitive and
  serializable.
- Strict page-level GREEN: the same command — 1 file passed, all 6 production
  route contracts passed, including exact JSON and `structuredClone` checks on
  the catalog source and absence of the legacy `copy`/`locale` props.
- Integrated GREEN: 11 production-page, fixture, and component files passed,
  107 tests passed.
- Full billing GREEN: all 27 billing page/component/domain/repository/style
  test files passed, 357 tests passed.

### Broad Chromium localization-contract drift RED / targeted GREEN

- The parent agent's fresh broad Chromium rerun after the billing RSC fix
  completed with 73 passed and 12 failed. Retry-two `error-context.md` files
  made every failure deterministic; none exposed a product-state, ownership,
  keyboard, responsive, or reduced-motion regression.
- Billing accounted for four failures. The authenticated checkout assertion
  searched the entire Next.js response, including serialized client catalog
  scripts, and therefore matched the legitimate app intake message “The video
  service is temporarily unavailable” even though checkout rendered its
  loading state with no billing error. The assertion now removes script
  contents before checking rendered server markup. Three portal assertions
  expected US-style `Aug 1, 2026`; the selected English contract is `en-GB`,
  and both the formatter and portal unit tests require `1 Aug 2026`.
- Intake accounted for seven failures. Four processing handoff assertions
  expected the pre-localization URL to contain only `analysis`; the fixture now
  intentionally preserves `intake=ready`, `locale=en`, and `analysis` so the
  interface locale survives the handoff. The duplicate dialog expected raw
  locale key `en` instead of the approved native name `English`. Two error
  assertions used superseded English fragments, and the first processing test
  still looked for former uppercase rail IDs instead of localized truthful
  state labels such as `Summary is queued` and `Flashcards not selected`.
- History accounted for one failure: the favorite rollback still expected the
  removed one-off string `Favorite could not be saved.` instead of the shared,
  localized action failure `We could not update History. Try again.`
- Only the three affected E2E specifications changed; production code did not.
  The original broad failures are the RED evidence. Targeted non-browser GREEN:
  12 formatter, billing presentation/portal, processing/intake, and History
  unit files passed, 143 tests passed. ESLint, strict type checking, and
  whitespace checks also passed after the assertion corrections.
- A browser GREEN claim remains deliberately pending. The parent agent owns the
  targeted Playwright reruns and the subsequent broad Chromium gate.

### Full cross-project gate: 204 passed / 8 failed

- The parent agent's next full Chromium plus mobile-chrome gate ran for 6.1
  minutes: 204 passed and 8 failed. Seven failures came from five stale
  assertions in `analyze-processing.spec.ts`; the complete-handoff and
  reduced-motion failures repeated in both projects. One deterministic visual
  snapshot remained for review.
- The processing rail test still searched for former uppercase rail IDs. The
  localized component now exposes truthful complete phrases in all four visual
  rails: `Summary is queued`, `Flashcards not selected`, `Timestamps are
  queued`, and `Export is queued`. This is the same catalog-backed contract
  already proved by the processing component tests and the corrected intake
  journey.
- Three URL assertions expected localization to discard fixture context. The
  production-like processing URL intentionally preserves `journey` and
  `locale` before adding `analysis`, and result navigation carries `journey`
  and `locale` through to `#overview`. The exit-wipe test also checked the
  transient processing URL only after waiting through the complete and exiting
  states, by which time navigation could truthfully have completed. It now
  verifies the preserved processing URL immediately after starting, then the
  preserved result destination after the exit state. Complete and reduced
  journeys use their respective semantic query values in both desktop and
  mobile projects.
- The 390×844 geometry test expected an exact 500px processing shell. The
  approved narrow CSS contract has always been `height: auto; min-height:
  500px`; localized rail-state phrases correctly expand the shell to 607.5px.
  The E2E assertion now checks the actual invariant (at least 500px), while
  retaining horizontal-overflow, stacked-column, rail-containment, padding,
  radius, and gap checks and adding explicit vertical panel containment.
  Fixed 300px desktop and 420px tablet contracts remain exact.
- The Pixel 7 `portal/past-due` visual produced the same actual PNG byte-for-byte
  on the initial run and both retries, with 8,987 changed pixels (reported ratio
  0.03). Direct expected/actual/diff inspection found two meaningful DEN-22
  changes: the compact locale-switcher globe is now present in the mobile
  header, and renewal copy changed from `Aug 1, 2025` to the selected `en-GB`
  form `1 Aug 2025`. The diff mask also contains thin glyph and edge
  antialiasing outlines across otherwise aligned text, cards, and navigation;
  the actual screenshot has no clipping or horizontal overflow. The parent
  agent visually approved these intentional changes, regenerated only this
  Pixel 7 portal snapshot, and its targeted update run passed 1/1.
- Only non-visual stale assertions in `tests/e2e/analyze-processing.spec.ts`
  were changed locally. Billing production code, visual test code, and CSS
  remain untouched; the parent-owned visual change is limited to the approved
  Pixel 7 portal snapshot.
- The parent targeted processing rerun then passed 6/7. The sole 390×844
  failure was test synchronization, not layout: the `>=500px` poll succeeded
  while the declared 0.75-second `height` transition was still moving toward
  the previously observed 607.5px final auto height, so the following panel
  containment sample compared final content with a transient shell. The test
  now registers a `transitionend` listener for the shell's `height` property
  before dispatching Analyze, then retains the `>=500px` and vertical
  containment assertions after that specific transition completes. No fixed
  sleep or arbitrary final height was introduced; targeted browser
  confirmation remains pending with the parent.
- That listener-first implementation produced a new targeted RED: 0/1, with
  all three attempts timing out inside the unresolved pre-click
  `locator.evaluate`. The pending protocol command prevented Playwright from
  dispatching the click that would start the transition. The test now clicks
  first, observes `data-analysis-state="submitting"`, then queries the shell's
  Web Animations API for an active `CSSTransition` whose
  `transitionProperty` is `height` and awaits its `finished` promise. An absent
  or already-finished transition returns immediately; cancellation is handled
  safely. The final `>=500px` and containment checks remain unchanged, with no
  arbitrary sleep or final-height hardcode.
- The next targeted rerun again finished 0/1, now without a timeout: shell
  height had settled, but vertical containment was still false. The panel owns
  separate opacity and transform transitions (`0.6s 0.28s` and `0.7s 0.28s`),
  so it can remain translated and intentionally clipped for roughly 0.23s
  after the shell's 0.75-second height transition finishes. Final geometry now
  waits for all active `CSSTransition` animations returned by
  `getAnimations()` on both the shell and processing panel after the observed
  `submitting` state. Already-finished or absent transitions require no wait,
  and canceled transitions are handled safely. The same height and containment
  contracts remain in place without sleeps or hardcoded localized height.
- The following full rerun completed in 4.4 minutes with 211/212 passing. Its
  sole failure was the newly added `contentInsideShell` invariant at 1440×900,
  not an original desktop contract. Vertical containment was introduced only
  to replace the stale exact 500px assertion for the narrow stacked
  `height:auto` layout; desktop and tablet use an absolute/inset animated panel
  and retain their original exact 300px/420px heights, two-column alignment,
  padding, radius, gap, overflow, and rail-containment checks. The final
  assertion is therefore scoped to the stacked/mobile branch alongside its
  rail-below-status invariant, without weakening any pre-existing
  desktop/tablet assertion.
- Final GREEN: the parent reran all four Chromium geometry viewports after that
  scope correction; all 4 passed in 10.5 seconds. The subsequent clean
  Chromium plus mobile-chrome gate passed all 212 tests in 4.3 minutes. Its
  only output beyond passing tests was the existing `NO_COLOR`/`FORCE_COLOR`
  warning and non-failing LCP suggestions.

## Browser evidence

- Targeted Chromium suite:
  `PLAYWRIGHT_PORT=3076 npx playwright test tests/e2e/localization.spec.ts --project=chromium`
  — PASS, 11/11 tests in 29.2 seconds.
- Targeted mobile suite:
  `PLAYWRIGHT_PORT=3077 npx playwright test tests/e2e/localization.spec.ts --project=mobile-chrome`
  — PASS, 11/11 tests in 54.4 seconds.
- The responsive tests generated 42 full-page evidence screenshots: seven
  routes for each German/Spanish and desktop/tablet/mobile combination. Every
  artifact was opened and inspected directly.

| Locale | Viewport | Routes inspected | Overflow |
| --- | --- | --- | --- |
| German (`de-DE`) | 1440×900 desktop | landing, auth, intake, History, result, billing, settings | PASS on all 7 |
| German (`de-DE`) | 1024×768 tablet | landing, auth, intake, History, result, billing, settings | PASS on all 7 |
| German (`de-DE`) | 390×844 mobile | landing, auth, intake, History, result, billing, settings | PASS on all 7 |
| Spanish (`es-ES`) | 1440×900 desktop | landing, auth, intake, History, result, billing, settings | PASS on all 7 |
| Spanish (`es-ES`) | 1024×768 tablet | landing, auth, intake, History, result, billing, settings | PASS on all 7 |
| Spanish (`es-ES`) | 390×844 mobile | landing, auth, intake, History, result, billing, settings | PASS on all 7 |

- Desktop inspection confirms the approved sidebar/topbar, two-column result
  workspace, wide History table, and plan/billing layout remain intact with
  expanded German and Spanish labels.
- Tablet inspection confirms the compressed sidebar and cards wrap without
  clipping. Result tabs, History controls, billing cards, and settings fields
  stay within the 1024px viewport.
- Mobile inspection confirms the compact header and fixed bottom navigation,
  card-based History list, result bottom artifact navigation, and billing
  `Plan`/`Uso` navigation. German and Spanish headings, labels, and long action
  copy wrap within 390px without horizontal scroll.
- Result fixture content intentionally remains English while its controls and
  metadata labels are German or Spanish, visual evidence that interface and
  generated-content languages remain independent.
- Keyboard journey: PASS for `Українська`, `Русский`, `English`, `Español`, and
  `Deutsch`; every item receives Radix highlighted focus with a visible inset
  focus treatment before Enter selects it.
- Native-name/no-flag checks: PASS across the keyboard journey and every one
  of the 42 responsive route visits.
- Reduced-motion journey: PASS. The existing landing page reports the
  `reduce-motion` state, the custom cursor is absent, menu animation and
  transition durations are at most 0.001 seconds, and the locale trigger has
  no animation after switching to German.
- Approved visual snapshot confirmation:
  `CI=1 PLAYWRIGHT_PORT=3070 npx playwright test tests/e2e/billing.visual.spec.ts --project=chromium --grep "den-20-412x839-pixel7-portal-past-due"`
  — PASS, 1/1 test after regenerating only the reviewed Pixel 7 portal/past-due
  snapshot.
- Final processing geometry:
  `CI=1 PLAYWRIGHT_PORT=3099 npx playwright test tests/e2e/analyze-processing.spec.ts --project=chromium --grep "matches processing geometry without overflow"`
  — PASS, 4/4 viewports in 10.5 seconds.
- Final full browser gate:
  `CI=1 PLAYWRIGHT_PORT=3100 npm run test:e2e` — PASS, 212/212 tests in 4.3
  minutes across Chromium and mobile-chrome. Output contained only the existing
  `NO_COLOR`/`FORCE_COLOR` warning and non-failing LCP suggestions.
- Authenticated-profile review rerun:
  `CI=1 PLAYWRIGHT_PORT=3101 npx playwright test tests/e2e/localization.spec.ts --project=chromium --project=mobile-chrome`
  — PASS, 22/22 tests in 1.4 minutes.
- Post-review full browser gate:
  `CI=1 PLAYWRIGHT_PORT=3103 npm run test:e2e` — PASS, 212/212 tests in 4.4
  minutes across Chromium and mobile-chrome. Output contained only the known
  `NO_COLOR`/`FORCE_COLOR` warning and non-failing LCP development suggestions.
- History RSC whole-branch localization rerun:
  `CI=1 PLAYWRIGHT_PORT=3105 npx playwright test tests/e2e/localization.spec.ts --project=chromium --project=mobile-chrome`
  — PASS, 22/22 tests in 1.4 minutes.
- History RSC post-fix full browser gate:
  `CI=1 PLAYWRIGHT_PORT=3106 npm run test:e2e` — PASS, 212/212 tests in 4.4
  minutes across Chromium and mobile-chrome. Output contained only the known
  `NO_COLOR`/`FORCE_COLOR` warning and non-failing LCP development suggestions.
- The 42 full-page captures are evidence for the automated semantic locale and
  overflow checks, not pixel-baseline approvals. Some auth and desktop/tablet
  billing captures freeze the approved finite entrance animation before its
  final frame, so text can appear blurred or dimmed. The stable Pixel 7 billing
  snapshot was separately inspected and approved, and the full visual gate
  passed; no runtime UI or motion change is warranted for capture timing.

## Repository gates

- `npm run format` — PASS; only generated `next-env.d.ts` changed and was then
  restored.
- `npm run format:check` — PASS, all matched files use Prettier style.
- `npm run lint` — PASS.
- `npm run typecheck` — PASS under strict TypeScript settings.
- `npm test` — PASS with exit code 0. Vitest collection contains 169 test files
  and 1,562 tests. The existing jsdom `Window.scrollTo()` notices remain
  non-failing.
- `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder npm run build`
  — PASS. Next.js 16.2.10 compiled, type-checked, collected page data, and
  generated 30/30 static pages. Values were explicit non-secret placeholders
  for public build-time validation only.
- Targeted billing verification after the mobile navigation correction:
  `npx vitest run src/components/billing/subscription-screen.test.tsx 'src/app/billing-fixture/[screen]/page.test.tsx'`
  — PASS, 2 files and 24 tests.
- Targeted processing verification after the 204/8 full gate:
  `npx vitest run src/app/app-shell-fixture/page.test.tsx src/components/app-shell/analyze-processing-fixture.test.tsx src/components/app-shell/analyze-processing-visual.test.tsx src/components/app-shell/inline-analysis-processing.test.tsx`
  — PASS, 4 files and 46 tests. These cover localized rail-state copy, the
  narrow `height:auto`/`min-height:500px` CSS contract, preserved processing
  queries and result navigation, and reduced-motion immediate navigation.
- `npx playwright test tests/e2e/localization.spec.ts --project=mobile-chrome --list`
  — PASS, all 11 intended tests collect.
- Review-round targeted integration:
  `npx vitest run src/lib/billing/authenticated-e2e-boundary.test.ts src/lib/i18n/actions.test.ts src/lib/i18n/request-locale.test.ts src/lib/onboarding/repository.test.ts`
  — PASS, 4 files and 23 tests. Strict type checking also passes, and
  `npx playwright test tests/e2e/localization.spec.ts --project=chromium --list`
  still collects exactly 11 tests without starting a server.
- Review-round browser GREEN: the combined Chromium/mobile localization suite
  passed 22/22, then the full gate passed 212/212. This confirms authenticated
  profile-backed restoration without `gleen_locale`, exact five-item keyboard
  coverage, deterministic responsive profile setup, and no cross-suite
  regression.
- History whole-branch review verification: the focused production boundary
  and workspace suite passes 62/62, and the complete 15-file History inventory
  passes 197/197. The revised desktop/mobile localization suite passes 22/22,
  and the subsequent full browser gate passes 212/212.
- Fresh whole-branch review quality gates: ESLint, strict type checking,
  repository formatting, explicit report formatting, and both whitespace diff
  checks pass. Dual-project Playwright collection lists 22/22 localization
  tests without starting a server, including the authenticated production
  History smoke in both Chromium and mobile-chrome.
- The next full Chromium plus mobile-chrome gate confirmed the earlier
  billing/History/intake corrections while reaching 204 passed and 8 failed.
  The approved snapshot then passed 1/1, and the following full rerun confirmed
  the corrected processing behavior at 211/212. Its only failure was the new
  desktop application of a mobile-only containment invariant, now scoped to
  the stacked branch. The final all-viewport geometry rerun passed 4/4, and the
  subsequent full Chromium plus mobile-chrome gate passed 212/212.

## Scope and secret review

- `git diff origin/main --check` — PASS with no whitespace errors.
- `git diff --check` — PASS for the uncommitted Task 12 delta.
- `git status --short` contains only the focused Task 12 test/config changes
  and the localization-caused RSC, locale-switcher, and authenticated-fixture
  fixes documented above. The report lives under the intentionally ignored
  `.superpowers/sdd` directory and was force-added to the Task 12 commit; its
  review-round edits are now tracked normally.
- `next-env.d.ts` was restored and is absent from the final status.
- No `.env` file, dependency manifest, migration, credential, provider key, or
  secret value changed. A scan of added lines found no private-key material or
  populated Supabase, Stripe, OpenRouter, YouTube, or Supadata secret values.
- No plan, price, currency, usage-limit, or generated-content literal was added
  by Task 12. Billing domain behavior is unchanged; its client copy-source
  boundary is now serializable. The token-gated local fixture permits the exact
  owner-filtered `profiles` read and exact interface-locale upsert already used
  by request resolution and locale persistence; all broader profile writes are
  rejected.
- The complete `origin/main` diff is the cumulative 226-file DEN-22
  localization implementation from Tasks 1–12. Its touched namespaces match
  the issue plan: locale infrastructure and catalogs, localized route/component
  injection, formatting and settings, responsive CSS, email copy, tests, and
  the approved DEN-22 plan/spec. No unrelated product feature was identified.

## Changed files

- Verification: `tests/e2e/localization.spec.ts`, localization tags in the five
  existing auth/intake/History/billing/result suites, and the focused
  `mobile-chrome` grep in `playwright.config.ts`.
- Broad Chromium assertion alignment: `tests/e2e/billing.spec.ts`,
  `tests/e2e/history.spec.ts`, and `tests/e2e/intake.spec.ts`, limited to
  localized copy/date/state and preserved-query expectations demonstrated by
  the failure artifacts.
- Full-gate processing alignment: `tests/e2e/analyze-processing.spec.ts`, plus
  the parent-approved regenerated Pixel 7 portal/past-due snapshot.
- Serializable localization boundaries: `src/lib/i18n/locale-switcher-copy.ts`,
  `src/lib/i18n/ui-preview-copy.ts`, their page/component tests, and the
  landing, auth, app layout, UI preview, and localized fixture page call sites.
- Locale-switch interaction: `src/components/i18n/locale-switcher.tsx` and its
  tests, covering explicit submission from the Radix portal, menu closure, and
  synchronized document language.
- Authenticated fixture: `src/lib/billing/authenticated-e2e-boundary.ts` and its
  test, adding the request-locale `profiles` lookup and exact owner-scoped
  interface-locale upsert to the explicit fixture catalog while rejecting all
  broader writes.
- Production billing RSC boundary: the six `/app/subscription*` pages,
  `src/components/billing/billing-copy-source.ts`, the six affected client
  screens and tests, `BillingPage`, `BillingMobileNavigation`, the billing
  fixture screen, existing limit-reached page coverage, and the new six-route
  boundary test.
- Production History RSC boundary: `src/app/app/history/page.tsx`,
  `src/components/history/history-copy-source.ts`, `HistoryWorkspace`, its
  existing behavior tests, the fixture call site, the new two-branch page
  boundary test, and the authenticated `/app/history` localization smoke.
- Evidence: this Task 12 report.

## Remaining risks

- The final full gate passes 212/212 and confirms the approved visual update,
  corrected processing behavior, and stacked-only containment scope across all
  four geometry viewports. The post-review full gate also passes 212/212 after
  the authenticated-profile persistence correction, and the final
  post-History-boundary gate again passes 212/212.
- Full-page evidence capture can land mid-way through finite entrance motion;
  those files document semantic and overflow automation, while the separately
  reviewed stable billing snapshot is the pixel-level visual evidence. No
  approved runtime motion was changed here.
- The production build uses validated placeholder public environment values
  and therefore does not exercise live Supabase, Stripe, or provider services.
- The Task 12 report remains tracked despite its parent directory's ignore rule.

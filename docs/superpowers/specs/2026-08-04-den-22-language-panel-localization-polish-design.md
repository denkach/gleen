# DEN-22 Language Panel and Localization Polish Design

## Context

DEN-22 delivered complete interface localization for Ukrainian, Russian,
English, Spanish, and German. Product review identified four follow-up issues:

1. the locale trigger is vertically misaligned with adjacent header controls;
2. the visible saving message adds unwanted layout and visual noise;
3. the interface waits too long before reflecting a language selection;
4. portions of the translated copy are literal or inconsistent, including
   translated plan names and the Russian `Погрузиться глубже` heading.

The approved replacement interaction is
`design/prototypes/gleen-language-panel-animated-v1/gleen-language-panel.html`,
including its desktop and mobile references and motion behavior. This work
remains within DEN-22 and does not redesign surrounding landing, auth, or
application screens.

## Goals

- Replace every current locale dropdown with the approved animated language
  panel.
- Make the selected language visible immediately instead of waiting for remote
  profile persistence.
- Remove the visible in-progress saving message and the layout shift it causes.
- Preserve durable authenticated preference synchronization.
- Editorially review all five interface catalogs for natural, consistent copy.
- Keep the canonical plan names `Free`, `Prism`, and `Spectrum` unchanged in
  every locale.

## Non-goals

- Changing supported locales or generated-content language behavior.
- Redesigning the landing header, auth shell, application top bars, pricing
  cards, or settings language page.
- Changing prices, plan limits, currencies, entitlements, or Stripe products.
- Shipping every translation catalog to the client for client-only rendering.
- Adding a new production dependency.

## Entry points

The shared panel replaces the current dropdown in all existing contexts:

- landing header;
- authentication pages;
- authenticated application desktop top bar;
- authenticated application mobile top bar.

The existing full text trigger remains on landing, auth, and desktop app
layouts. The existing globe-only trigger remains in the mobile application.
All triggers open the same shared panel behavior and copy contract.

## Panel composition

### Desktop

- A 390 px panel is aligned to the end of the active locale trigger.
- The panel has the prototype's elevated dark surface, restrained shadow,
  18 px radius, and two-pixel spectral edge.
- A subtle fixed scrim dims and blurs the underlying page.
- The header contains a localized title, localized description, and close
  button.
- Five radio-style language rows appear in the approved order:
  `Українська`, `Русский`, `English`, `Español`, `Deutsch`.
- Each row shows the native name and a stable English identification label.
- Only the active row exposes the localized selected pill and selected radio
  treatment.
- The footer shows the platform-appropriate `⌘ K` or `Ctrl K` shortcut and a
  localized quick-switch label.

### Tablet and mobile

- At the prototype breakpoint, the panel becomes a bottom sheet with 12 px
  viewport gutters and bottom offset.
- It uses the approved 24 px radius, centered drag indicator, scroll-contained
  language list, and viewport-safe maximum height.
- At narrow mobile widths the selected pill is hidden, while the radio state
  remains visible and accessible.
- Opening the sheet locks page scrolling; closing it restores the previous
  state.

### Design-system adaptation

The prototype's appearance and geometry are authoritative. Implementation maps
its colors, borders, radii, shadow, focus treatment, and easing to existing
shared Prism tokens wherever an equivalent token exists. No unrelated visual
values or generic SaaS card treatment are introduced.

## Interaction and accessibility

The panel is an accessible modal dialog containing a radio group.

- Opening moves focus to the selected language, or the first language when no
  selection exists.
- Closing returns focus to the trigger that opened it.
- Escape, the close button, and the scrim close the panel.
- Arrow Up/Down wraps between languages; Home/End move to the first/last row;
  Enter and Space select the focused row.
- Tab and Shift+Tab stay within the open modal.
- `⌘ K` on macOS and `Ctrl K` elsewhere toggle the visible switcher. When both
  desktop and mobile app triggers exist in the DOM, only the currently visible
  trigger handles the shortcut.
- Accessible names exclude visually hidden `Selected` text from unchecked
  options.
- Error feedback remains visible and is announced. There is no visible pending
  or saving message.

## Motion

The implementation preserves the prototype motion:

- scrim fade: 220 ms;
- panel opacity: 190 ms;
- panel spring transform: 260 ms;
- spectral edge growth: 580 ms after a 90 ms delay;
- row entrance stagger: 70, 105, 140, 175, and 210 ms;
- hover/focus radio and selected-pill micro-interactions: 170–220 ms;
- chevron rotation: 220 ms;
- successful selection waits 210 ms before closing so the radio transition is
  perceivable;
- the localized success toast follows the prototype and dismisses after
  2200 ms.

Under `prefers-reduced-motion: reduce`, transitions and animation delays become
effectively immediate. Functional focus movement, selection, persistence, and
announcements remain unchanged.

## Fast locale selection and persistence

The current delay is caused by a sequential server path: authenticated-user
verification, profile upsert, response-cookie delivery, and then a full route
refresh. Selection should not wait for that chain.

The new flow is local-first:

1. Validate the selected value against the statically known five locales.
2. Immediately update the trigger/radio state and document language.
3. Write the same one-year `gleen_locale` cookie in the browser.
4. Start `router.refresh()` so server-rendered interface copy uses that cookie.
5. Submit the existing authenticated server action concurrently to synchronize
   the profile preference.
6. On success, keep the optimistic state and show the localized success toast.
7. On failure, keep the local per-device selection, show a localized profile
   synchronization error, and allow the user to retry by selecting the language
   again.

Request locale resolution gives a valid explicit locale cookie precedence over
the stored profile. This makes the latest selection authoritative on the
current device while the profile remains the fallback for a new device with no
locale cookie. Header-language fallback remains last.

The server action continues to validate all input and never trusts an arbitrary
client locale. Interface and generated-content preferences remain separate.

## Copy contract and editorial audit

The shared locale-switcher copy gains localized strings for:

- panel title and description;
- close button;
- selected state;
- quick switch;
- success toast;
- profile synchronization error.

Every existing Ukrainian, Russian, English, Spanish, and German UI catalog is
reviewed as product copy rather than mechanically translated text. The audit
covers headings, descriptions, actions, empty/error states, formatted dynamic
messages, plural forms, and email copy. Placeholders and functions retain their
existing type-safe shapes.

Product invariants:

- `Gleen`, `Free`, `Prism`, `Spectrum`, `Notion`, `Obsidian`, `NotebookLM`,
  `Markdown`, and `Stripe` are not translated.
- Russian marketing copy uses `Погрузитесь глубже`.
- Plan labels and plan CTAs compose the canonical names rather than storing
  translated plan names in locale catalogs.
- Prices, limits, currencies, features, and purchase availability remain
  data-driven.
- Interface-language copy never changes generated-content language.

## Component boundaries

- `LocaleSwitcher` owns optimistic selection, persistence state, trigger state,
  and integration with the shared panel.
- A focused panel component owns dialog structure, keyboard interaction, focus
  behavior, responsive presentation hooks, and language rows.
- A small locale-cookie helper owns browser cookie serialization so the exact
  options can be unit tested independently.
- Server locale actions remain responsible for validation and authenticated
  profile synchronization.
- Locale catalogs own human-facing copy; canonical product names come from
  product/pricing data rather than translated presentation strings.

## Error handling

- Unsupported locale values are rejected before local or remote persistence.
- A failed profile synchronization does not undo a valid local selection.
- Errors are visible, localized, and announced without moving the trigger.
- A failed route refresh leaves the optimistically selected trigger and cookie
  intact; standard Next.js route error behavior handles the page failure.
- The success toast is not used as the sole source of selected-state feedback;
  radio state and trigger text update immediately.

## Testing and verification

### Unit and component tests

- Verify the trigger remains vertically centered because status content is not
  part of normal layout flow.
- Verify no visible pending/saving text is rendered.
- Verify immediate trigger, radio, document-language, and browser-cookie
  updates before the server action resolves.
- Verify profile success and failure behavior.
- Verify dialog roles, radio semantics, focus return, focus trap, keyboard
  navigation, shortcut handling, scrim close, and visible-trigger arbitration.
- Verify all five localized panel-copy contracts.
- Verify `Free`, `Prism`, and `Spectrum` remain exact across all five marketing
  locales and that Russian uses `Погрузитесь глубже`.

### Browser verification

- Compare open desktop and mobile panels with the supplied reference images.
- Verify landing, auth, desktop app, and mobile app entry points.
- Verify immediate locale change and persistence for guest and authenticated
  sessions, including reload and a new page.
- Verify keyboard-only operation and focus restoration.
- Verify 320 px mobile geometry, no horizontal overflow, scroll lock, and long
  translated strings.
- Verify reduced-motion removes stagger and transforms while preserving all
  functionality.
- Run formatting, linting, strict type checking, unit/integration tests, the
  production build, and the affected Playwright localization suite.

## Risks and mitigations

- **Optimistic local state can differ from the cloud profile.** The cookie is
  deliberately authoritative on the current device, an explicit sync error is
  shown, and a later selection retries synchronization.
- **Two app switchers can register the global shortcut.** Shortcut handling is
  limited to the visible trigger, with regression coverage at responsive
  breakpoints.
- **Long translations can exceed prototype geometry.** Panel copy is reviewed
  in every locale at desktop and mobile widths, with contained scrolling rather
  than width growth.
- **Expressive motion can be excessive inside the app.** Timings are copied from
  the approved prototype, limited to the modal interaction, and eliminated for
  reduced motion.

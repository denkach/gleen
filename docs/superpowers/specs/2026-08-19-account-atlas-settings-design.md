# DEN-119 Account Atlas Settings Design

## Purpose

Gleen will expand Settings from a single language/preferences surface into Account Atlas: a quiet overview of the account with six truthful destinations—Profile, Preferences, Language, Integrations, Security, and Data.

The product owner selected the Account Atlas direction and explicitly removed Notifications. Desktop uses a restrained 3×2 overview grid. Mobile uses a vertical list. Each destination exposes real state and has its own URL.

## Dependency and source of truth

DEN-119 must start from the final DEN-29 account-page implementation. DEN-29 established the approved account shell, page geometry, responsive behavior, language controls, and billing-error presentation. If DEN-29 is not yet on `main`, merge it first or base DEN-119 on its reviewed commit before implementation.

Sources of truth, in order:

1. This approved Account Atlas design.
2. The final DEN-29 implementation and its approved account-page references.
3. `docs/design-system.md` and shared design tokens.
4. Existing product behavior and server-owned data contracts.

The standalone brainstorm mockup established information architecture and visual direction. It is not production code and must not replace existing components or data boundaries verbatim.

## Scope

- Add an Account Atlas overview at `/app/settings`.
- Add or complete six settings destinations.
- Surface a truthful compact status for each destination on the overview.
- Preserve independent interface and generated-content languages.
- Store the default Compact, Balanced, or Deep summary mode defined by DEN-118.
- Provide localized loading, success, empty, unavailable, and failure states.
- Support desktop, tablet, mobile, keyboard, 200% zoom, and reduced motion.

Notifications settings, billing behavior, plan configuration, new export integrations, and new authentication providers are not part of DEN-119.

## Routes and navigation

| Route                        | Destination            |
| ---------------------------- | ---------------------- |
| `/app/settings`              | Account Atlas overview |
| `/app/settings/profile`      | Profile                |
| `/app/settings/preferences`  | Preferences            |
| `/app/settings/language`     | Language               |
| `/app/settings/integrations` | Integrations           |
| `/app/settings/security`     | Security               |
| `/app/settings/data`         | Data and deletion      |

Every route is server-authorized inside the existing authenticated application shell. Browser Back/Forward works normally. Desktop retains the application sidebar; destination pages add a compact settings sub-navigation or an explicit Back to Settings action following available width. Mobile retains the existing bottom application navigation and uses a clear page title and back affordance.

## Account Atlas overview

### Desktop

- A small account eyebrow, editorial Settings title, and one-line explanation establish hierarchy.
- Six cards form two balanced rows of three.
- Cards remain dark neutral surfaces with one restrained semantic edge or icon accent.
- The entire card is a link with hover, focus, and pressed states.
- Each card contains a title, short description, and current-state summary.
- No large gradients, glass panels, decorative metrics, or nested cards.

### Mobile

- The same six destinations become a vertical list.
- Each row has a minimum 44 px touch target, icon, title, short current state, and navigation affordance.
- The list does not horizontally scroll and does not duplicate the desktop card grid.
- Safe-area padding prevents overlap with bottom navigation.

### Truthful status summaries

Overview loaders resolve independent status summaries. One unavailable domain must not block the other five cards. Examples:

- Profile: display name and verified/unverified email state.
- Preferences: `Balanced summary · 18 cards`.
- Language: `Русский · English output`.
- Integrations: `No connections` or a real connected destination count.
- Security: primary sign-in method; session counts only when the auth provider can provide them truthfully.
- Data: export availability and history item count only when already available without an expensive scan.

Unavailable summaries use localized neutral copy rather than fabricated zero values.

## Destination behavior

### Profile

- Edit the account display name.
- Show the authenticated email and verification state; email is read-only unless a complete verified email-change flow is implemented.
- Show avatar/initials. Upload controls appear only with an approved private storage path, validation, and deletion policy; otherwise the initials avatar remains truthful and no dead upload button is shown.
- Validate on the server and preserve entered values on failure.

### Preferences

- Store the default summary mode from DEN-118: Compact, Balanced, or Deep.
- Store the default flashcard count using the existing supported values.
- Explain that defaults affect new analyses only.
- Saving one preference must not overwrite another value read concurrently.
- New Analysis continues to permit per-analysis overrides.

DEN-119 may render the preference control before DEN-118 only behind a compatibility adapter; it must not emit a value the current intake pipeline cannot parse. The preferred delivery order is DEN-118 before the Preferences implementation.

### Language

- Preserve the DEN-29 presentation and fast language switching.
- Interface and generated-content locales load and save independently.
- Do not show a blocking “language is saving” notice.
- Feedback is localized and does not cause layout shift.
- Existing results are never rewritten when the output-language default changes.

### Integrations

- Present Notion, Obsidian, and NotebookLM according to actual capabilities owned by DEN-21.
- A real OAuth integration may expose Connect, Reconnect, and Disconnect.
- File/manual handoff destinations describe the handoff and never claim account synchronization.
- If a capability is not implemented, show an explicit localized unavailable or planned state without an active dead button.
- Tokens and provider diagnostics never reach visual components.

DEN-119 owns the settings presentation and status composition, not new integration protocols.

### Security

- Show sign-in methods derived from authenticated identities.
- Offer password setup/change only through the existing verified recovery flow.
- Show and revoke sessions only if Supabase exposes the required account-scoped session data safely; otherwise show the current-session state and a truthful global sign-out action.
- Destructive security actions require recent authentication when supported.
- Raw auth errors and identity identifiers are never displayed.

### Data

- Export account-owned Gleen data through an authenticated server boundary.
- Allow clearing analysis history separately from deleting the account.
- Account deletion requires explicit typed or equivalent high-friction confirmation, server-side owner verification, and clear irreversible-action copy.
- Deletion order and partial failure handling must be documented before enabling the action; a UI button cannot precede a safe backend operation.
- Generated archives and deletion logs must not expose secrets, provider tokens, or other users’ data.

## Data and component boundaries

Visual components consume typed view models and actions. They do not query Supabase, auth identities, integration providers, or storage directly.

Suggested boundaries:

- `SettingsOverview` renders six destination summaries.
- `SettingsDestinationCard` provides shared link semantics and responsive presentation.
- Domain loaders independently compose Profile, Preferences, Language, Integrations, Security, and Data view models.
- Domain actions validate input and update only owned columns/resources.
- Shared feedback primitives render localized pending, success, and error states without moving surrounding layout.

Server-only secrets and privileged deletion/export operations remain outside client components. Billing, authentication, generated-content, integration, and account-data concerns remain separate modules even though Account Atlas links to each domain.

## Save and error model

- Each destination owns its pending state; saving Profile never blocks Language.
- Controls disable only for their active submission and prevent duplicate concurrent submits.
- Optimistic updates are allowed only when rollback is deterministic. Language may retain its existing fast behavior.
- Failures preserve user input and expose a localized retry path.
- Screen-reader status announcements are polite and concise.
- Storage/service outages keep navigation and unaffected destinations available.
- No raw exception, email token, Supabase identifier, or integration credential is rendered.

## Scoped controls and interaction polish

Settings controls follow the approved DEN-29 account-page references while the
overview follows the Account Atlas composition. Primary save actions use the
light Prism face with a restrained spectral edge on hover; secondary and back
actions remain dark with a crisp tokenized border. Every actionable card,
button, select, and link has explicit hover, pressed, visible-focus, disabled,
and pending states. Pressed movement is limited to one pixel and all
non-essential movement is removed under `prefers-reduced-motion: reduce`.

These styles remain scoped to Settings. The implementation reuses semantic
tokens and primitives but does not restyle unrelated authenticated pages.

## Accessibility and responsive behavior

- Semantic heading hierarchy and landmarks.
- Whole-card links have one accessible name and no nested interactive controls.
- Visible focus follows shared tokens.
- Minimum 44×44 px mobile targets.
- Dialog focus trapping, Escape, inert background, and focus restoration for destructive confirmations.
- No hover-only information.
- No horizontal overflow from 320 px upward and at 200% browser zoom.
- Non-essential transitions are removed under `prefers-reduced-motion: reduce`.
- Long localized strings wrap without changing card heights unpredictably; the desktop grid aligns by row, not hard-coded text height.

## Localization

All overview labels, descriptions, statuses, form labels, validation, confirmations, and recovery copy are available in Ukrainian, Russian, English, Spanish, and German. Native language names remain unchanged. UI components receive catalog copy and do not embed English fallback strings.

## Testing

### Unit and integration

- Route authorization and destination view-model composition.
- Each card’s truthful ready, empty, and unavailable status.
- Independent saves and protection against stale full-profile overwrites.
- Profile validation and read-only email behavior.
- Preference compatibility with DEN-118.
- Independent language persistence.
- Integration capability mapping without false connection claims.
- Security capability degradation when session enumeration is unavailable.
- Export, history-clear, and account-deletion authorization and confirmation.
- Five-locale key parity.

### Browser and visual regression

- Account Atlas at desktop, tablet portrait/landscape, and mobile.
- Open every destination and exercise Back/Forward.
- Keyboard navigation and visible focus through all cards and controls.
- Save success and failure without layout shift.
- Integrations unavailable/disconnected/connected states where supported.
- Destructive confirmation focus behavior.
- 320 px, 390 px, 768 px, 1440 px, 1920 px, and 200% zoom checks.
- Reduced-motion behavior.
- Golden screenshots are approved before replacement and derive from the final production fixture, not hard-coded production data.

### Completion gates

Formatting, linting, strict type checking, full unit/integration tests, production build, and affected Playwright flows must pass. Final browser verification covers desktop and mobile and compares the production implementation with the approved Account Atlas direction and the DEN-29 shell.

## Delivery order and risks

1. Ensure DEN-29 is present on the implementation base.
2. Land DEN-118 mode compatibility before Preferences emits Compact or Deep.
3. Build the overview and route shell with truthful read-only summaries.
4. Implement each destination behind its existing domain boundary.
5. Enable irreversible Data actions only after backend tests prove authorization and failure handling.

The largest risk is presenting planned capabilities as complete. Integrations, avatar upload, session management, and deletion controls are capability-gated: the UI exposes only operations backed by a verified server implementation. This preserves the richer design without introducing dead or misleading controls.

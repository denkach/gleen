# DEN-22 Five-Language Localization Design

## Outcome

Gleen provides a complete Ukrainian, Russian, English, Spanish, and German
interface across the public site, authentication and onboarding, the
authenticated application, history, result workspaces, billing, and settings.
Users can change the interface language without leaving their current route.
The language used for generated knowledge artifacts remains an independent
preference.

The implementation follows the existing dark-only Prism design and does not
redesign approved screens. Longer German and Spanish copy must fit the existing
responsive layouts on desktop, tablet, and mobile. Language controls use native
language names and never flags.

## Scope

DEN-22 includes:

- a server-first localization foundation for five supported locales;
- complete interface copy for marketing, authentication, onboarding, app
  shell, intake and processing, history, result workspaces, billing, invoices,
  usage, settings, validation, empty states, and recovery states;
- persistent interface-language selection without locale-prefixed URLs;
- an independent generated-content language preference;
- locale-aware dates, numbers, currencies, relative time, and plural forms;
- localized validation and application error presentation;
- typed transactional-email copy and rendering foundations.

DEN-22 does not include:

- a new transactional-email delivery provider or sending workflow;
- translation of user input or already generated artifacts;
- machine translation at request time;
- locale-prefixed routes such as `/de/app`;
- changes to billing prices, currencies, entitlements, or generated-content
  behavior;
- visual redesign of approved screens.

## Chosen approach

Gleen will use a small, first-party, strictly typed localization layer based on
TypeScript and the platform `Intl` APIs. It adds no production dependency.
Domain-specific catalogs keep the implementation modular, while one canonical
English shape gives every locale the same compile-time contract.

This approach is preferred over `next-intl` because Gleen does not use
locale-prefixed routing and already has typed five-language result copy. It is
preferred over screen-local dictionaries because a shared contract can detect
missing translations and prevent formatting or persistence logic from being
duplicated throughout the application.

## Locale model

The supported product locales are:

| Product locale | BCP 47 formatting locale | Display name |
| -------------- | ------------------------ | ------------ |
| `uk`           | `uk-UA`                  | Українська   |
| `ru`           | `ru-RU`                  | Русский      |
| `en`           | `en-GB`                  | English      |
| `es`           | `es-ES`                  | Español      |
| `de`           | `de-DE`                  | Deutsch      |

The existing `profiles.interface_locale` and `profiles.output_locale` columns
remain the persistent authenticated-user source of truth. Their existing
database constraints already cover the five locales, so no schema migration is
expected.

`interface_locale` controls application chrome and interface copy only.
`output_locale` controls newly generated artifacts only. No interface-language
operation may write, default, infer, or silently synchronize `output_locale`.

## Locale resolution and persistence

Routes remain unchanged. A request resolves its interface locale in this
order:

1. the authenticated user's valid `profiles.interface_locale`;
2. a valid Gleen locale cookie;
3. the first supported locale in `Accept-Language`;
4. English.

The authenticated profile is authoritative. Explicit language selection in
onboarding or settings writes the profile and cookie in the same server action,
so subsequent signed-in and signed-out rendering agrees. A pre-existing profile
value still wins if an older or missing cookie disagrees. Signed-out users
persist their choice in the cookie only.

The language switcher submits a validated server action with the selected
locale and the current internal pathname. The action sets the locale cookie,
updates only `profiles.interface_locale` when a user is authenticated, and
refreshes or safely redirects to the same internal route. It rejects unsupported
locale values and external or malformed return targets. Changing the language
must preserve pathname, query parameters, and application state represented in
the URL.

Server rendering and client hydration receive the same resolved locale and
catalog data. The application must not render English first and replace it on
the client.

## Localization modules

The localization foundation has focused responsibilities:

- **Locale definition:** supported locale schema, default locale, BCP 47
  mapping, native display names, and parsing helpers.
- **Request resolver:** authenticated profile, cookie, `Accept-Language`, and
  default precedence without importing client code.
- **Catalogs:** domain dictionaries for marketing, auth, onboarding, shell,
  intake, processing, history, results, billing, settings, validation, shared
  controls, and email copy.
- **Translator:** a typed lookup contract for server and client consumers.
- **Formatters:** locale-aware wrappers around `Intl.DateTimeFormat`,
  `Intl.NumberFormat`, `Intl.RelativeTimeFormat`, and `Intl.PluralRules`.
- **Persistence action:** validated interface-locale updates that never touch
  generated-content preferences.
- **Client boundary:** the smallest locale and catalog namespace required by a
  client subtree, avoiding shipment of unrelated dictionaries.

English defines the canonical catalog shape. The other four catalogs must
satisfy the same recursive shape and value signatures. Catalog values may be
strings or typed message functions for interpolation and pluralization; visual
components do not contain language branches.

The existing five-locale result-workspace dictionaries migrate into the shared
result namespace or use a temporary typed adapter during migration. There must
be one authoritative translation for each message rather than duplicate result
catalogs.

## Missing translations

Missing or invalid messages fail visibly in development and tests. The
translator throws an error containing the locale and message key instead of
quietly displaying English. Compile-time catalog-shape checks catch static
omissions; runtime checks cover dynamically selected namespaces and keys.

Production may fall back to the canonical English message to keep a recovery
path usable, while emitting a structured diagnostic containing only the locale
and message key. It must not expose stack traces or internal data in the UI.

## Formatting and pluralization

All dates, times, relative times, counts, decimal values, and monetary amounts
shown in localized surfaces use shared formatters. Components pass semantic
values, not preformatted English strings.

Currency remains server-owned billing data. Localization changes presentation
only and never selects or converts the currency. Formatters require an explicit
currency code when formatting money and must not hard-code USD in visual
components.

Count-aware messages use `Intl.PluralRules` and locale-specific message forms.
The design supports the `one`, `few`, `many`, and `other` categories needed by
Ukrainian and Russian as well as the categories used by English, Spanish, and
German. Interpolation escapes or renders values as React data rather than
injecting translated HTML.

## Interface behavior

Language selectors display English, Українська, Русский, Español, and Deutsch
as text. They use the existing Prism controls, visible focus states, keyboard
navigation, and accessible selected-state announcements. No national flags are
used because language and country are independent.

The public site, authentication screens, and onboarding can change the cookie
locale before a profile exists. After authentication, onboarding and settings
write the chosen interface language to the profile. The separate
generated-content selector writes only `output_locale` and clearly identifies
that it affects future generated material rather than interface copy.

Loading, empty, success, validation, limit, payment, offline, and unexpected
error states are localized alongside their primary screens. Accessible names,
status announcements, field descriptions, dialog labels, navigation labels,
and document metadata are part of the interface and therefore part of the
catalog scope.

Localization introduces no new expressive application motion. Existing motion
continues to respect `prefers-reduced-motion`.

## Validation and error handling

Application and server actions return stable machine-readable error codes with
structured parameters when the client is expected to present an error. The UI
maps those codes to localized messages. It does not display server-authored
English as normal product copy.

Unknown codes use one localized generic recovery message and retain the
structured code for diagnostics. Provider-owned text that cannot safely be
translated by Gleen, such as a detailed Stripe response, is presented only
where required and is preceded by localized context and recovery guidance.

Unsupported stored locales are treated as invalid input and fall through the
documented resolver. Locale persistence failures keep the previous locale,
show a localized recoverable error, and never update `output_locale`.

## Transactional-email foundation

DEN-22 creates server-only typed email copy for subject, preview text,
headings, body messages, actions, and plain-text equivalents. Rendering accepts
an explicit validated locale and typed template data. It shares locale
definitions and formatting helpers with the web application but does not import
browser components.

No delivery provider, queue, webhook, or new email-trigger behavior is added.
Future email work can use this contract without redefining locale selection or
translation structure.

## Migration sequence

Implementation proceeds by bounded domains while retaining one coherent locale
contract:

1. locale definitions, catalog typing, resolution, persistence, formatters,
   and missing-key behavior;
2. public site, authentication, and onboarding;
3. authenticated shell, intake, processing, and history;
4. result workspaces and exports UI copy;
5. billing, invoices, usage, and settings;
6. validation/error mapping and transactional-email foundations;
7. cross-locale responsive, accessibility, and reduced-motion verification.

Temporary adapters are allowed only while a domain is being migrated in the
same DEN-22 branch. The completed branch must not leave two localization
systems or knowingly user-visible hard-coded English copy in an in-scope
surface.

## Verification

Automated verification covers:

- exact catalog-key and value-signature parity for all five locales;
- visible development failure for a missing message;
- locale resolver precedence and unsupported-value handling;
- guest cookie persistence and authenticated profile persistence;
- route and query preservation after an interface-language change;
- proof that changing `interface_locale` does not change `output_locale`;
- formatting and plural categories across all five locales;
- localized validation and generic-error mapping;
- server-only email rendering in each locale;
- regression coverage for existing result-workspace translations.

Browser verification covers representative end-to-end paths through landing,
authentication/onboarding, intake, processing, history, results, billing, and
settings. Each locale is exercised. German and Spanish are used as expansion
stress cases. Checks include desktop, tablet, mobile, keyboard navigation,
focus visibility, responsive overflow, document language, accessible names,
and `prefers-reduced-motion`.

Before completion, the branch must pass formatting, linting, strict type
checking, unit and integration tests, the production build, and the affected
Playwright suites.

## Risks and controls

- **Large migration surface:** migrate and test one domain namespace at a time,
  with catalog parity enforced from the foundation onward.
- **Translation quality:** use consistent product terminology in each catalog
  and make copy review possible by keeping domains focused and readable.
- **Layout expansion:** exercise German and Spanish at all required breakpoints
  and fix layout behavior without shortening away meaning.
- **Interface/output coupling:** keep separate actions and regression-test that
  each update touches only its own profile column.
- **Hydration mismatch or language flash:** resolve locale on the server and
  provide the same locale to client boundaries.
- **Hidden English in secondary states:** include errors, accessibility text,
  metadata, empty states, and recovery paths in the migration inventory and
  browser walkthrough.

## Acceptance mapping

- Changing interface language preserves the current route through the
  validated same-route persistence action.
- Interface language never silently changes generated-content language because
  profile fields, actions, and tests remain separate.
- German and Spanish expansion is covered by responsive browser verification.
- Language selection uses native text labels and no flags.
- Missing translations fail visibly in development through compile-time shape
  checks and runtime translator errors.
- Complete five-language coverage includes every UI domain named in this
  specification and the transactional-email copy foundation.

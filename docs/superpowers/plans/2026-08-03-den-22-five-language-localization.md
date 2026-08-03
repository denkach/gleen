# DEN-22 Five-Language Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete Ukrainian, Russian, English, Spanish, and German Gleen interface with route-preserving persistence and an independent generated-content language preference.

**Architecture:** Add a first-party, server-first i18n layer with typed domain catalogs and shared `Intl` formatters. Resolve locale from profile, cookie, `Accept-Language`, then English; pass domain copy explicitly into client components and keep `interface_locale` and `output_locale` behind separate actions.

**Tech Stack:** TypeScript 5.9 strict mode, Next.js 16 App Router, React 19, Tailwind/CSS variables, Zod 4, Supabase SSR, Vitest/Testing Library, Playwright, platform `Intl` APIs.

## Global Constraints

- Support exactly `uk`, `ru`, `en`, `es`, and `de`; use `uk-UA`, `ru-RU`, `en-GB`, `es-ES`, and `de-DE` for formatting.
- Keep existing unprefixed routes; changing interface language preserves pathname and query parameters.
- Never write or infer `output_locale` while changing `interface_locale`.
- Use native language names as text and never flags.
- Missing messages throw visibly in development and tests; production may use an English recovery fallback with a structured diagnostic.
- Do not add a production dependency.
- Do not hard-code plans, prices, usage limits, languages, or currencies in visual components.
- Preserve the approved dark-only Prism visuals, keyboard navigation, desktop/tablet/mobile behavior, and `prefers-reduced-motion` behavior.
- Transactional-email work is copy/rendering foundation only; do not add delivery, queues, providers, or triggers.
- Keep generated artifacts, billing, authentication, processing, and localization responsibilities separate.

---

## File structure

New localization foundation:

- `src/lib/i18n/locales.ts` — locale schema, BCP 47 mapping, native names, and `Accept-Language` parsing.
- `src/lib/i18n/catalog.ts` — typed catalog definition, locale selection, interpolation contract, and development missing-message failure.
- `src/lib/i18n/format.ts` — date, number, currency, relative-time, and plural helpers.
- `src/lib/i18n/request-locale.ts` — cached server request resolution from profile/cookie/header/default.
- `src/lib/i18n/actions.ts` — interface-locale persistence only.
- `src/lib/i18n/messages/*.ts` — one focused five-locale catalog per product domain.
- `src/components/i18n/locale-switcher.tsx` — accessible route-preserving language control.
- `src/components/settings/language-preferences.tsx` — independent interface/output preference controls.
- `src/lib/settings/actions.ts` — output-locale persistence only.
- `src/lib/email/transactional-copy.ts` — typed, server-only localized email copy rendering.
- `tests/e2e/localization.spec.ts` — cross-locale route, layout, keyboard, and reduced-motion coverage.

Existing domain components keep their visual structure. They receive a typed
domain `copy` object and semantic formatted data instead of resolving locale or
containing language branches themselves.

---

### Task 1: Locale primitives, typed catalogs, and formatters

**Files:**

- Create: `src/lib/i18n/locales.ts`
- Create: `src/lib/i18n/locales.test.ts`
- Create: `src/lib/i18n/catalog.ts`
- Create: `src/lib/i18n/catalog.test.ts`
- Create: `src/lib/i18n/format.ts`
- Create: `src/lib/i18n/format.test.ts`
- Modify: `src/lib/onboarding/preferences.ts`
- Modify: `src/lib/onboarding/preferences.test.ts`

**Interfaces:**

- Produces: `Locale`, `supportedLocales`, `localeSchema`, `defaultLocale`,
  `toBcp47(locale)`, `parseAcceptLanguage(header)`, `defineMessages(catalog)`,
  `selectMessages(catalog, locale, namespace, reporter)`, `formatDate`,
  `formatNumber`, `formatCurrency`, `formatRelativeTime`, and `selectPlural`.
- `selectMessages` accepts a catalog containing all five locales and returns the selected locale with the same widened recursive message shape.

- [ ] **Step 1: Write failing locale and catalog tests**

```ts
expect(supportedLocales).toEqual(['uk', 'ru', 'en', 'es', 'de']);
expect(toBcp47('uk')).toBe('uk-UA');
expect(parseAcceptLanguage('fr-CA, de-DE;q=0.9, en;q=0.8')).toBe('de');
expect(parseAcceptLanguage('fr-CA')).toBeNull();

const messages = defineMessages({
  en: { save: 'Save', count: (value: number) => `${value} items` },
  uk: { save: 'Зберегти', count: (value: number) => `${value} елементів` },
  ru: { save: 'Сохранить', count: (value: number) => `${value} элементов` },
  es: { save: 'Guardar', count: (value: number) => `${value} elementos` },
  de: { save: 'Speichern', count: (value: number) => `${value} Elemente` },
});
expect(selectMessages(messages, 'de', 'test').save).toBe('Speichern');
```

- [ ] **Step 2: Run the tests and verify they fail because the i18n modules do not exist**

Run: `npx vitest run src/lib/i18n/locales.test.ts src/lib/i18n/catalog.test.ts src/lib/i18n/format.test.ts`

Expected: FAIL with unresolved `@/lib/i18n/*` imports.

- [ ] **Step 3: Implement locale definitions and catalog typing**

```ts
export const supportedLocales = ['uk', 'ru', 'en', 'es', 'de'] as const;
export const localeSchema = z.enum(supportedLocales);
export type Locale = z.infer<typeof localeSchema>;
export const defaultLocale: Locale = 'en';

export const localeMetadata = {
  uk: { bcp47: 'uk-UA', nativeName: 'Українська' },
  ru: { bcp47: 'ru-RU', nativeName: 'Русский' },
  en: { bcp47: 'en-GB', nativeName: 'English' },
  es: { bcp47: 'es-ES', nativeName: 'Español' },
  de: { bcp47: 'de-DE', nativeName: 'Deutsch' },
} as const satisfies Record<Locale, { bcp47: string; nativeName: string }>;
```

Move the canonical locale tuple out of onboarding and re-export it there only
for compatibility during this task. `defineMessages` must widen English string
literals to `string` while preserving function argument signatures, making an
omitted key or wrong interpolation signature a TypeScript error in any locale.
`selectMessages` must throw `Missing translation: <namespace> (<locale>)` in
development/test if a runtime catalog entry is absent. In production it calls
the injected reporter with
`{ event: 'missing_translation', namespace, locale }` and returns the canonical
English namespace; tests must cover both modes without logging message contents
or application data.

- [ ] **Step 4: Implement shared `Intl` formatters and plural selection**

```ts
formatCurrency({ amountMinor: 1900, currency: 'usd', locale: 'de' });
// "19,00 $" (environment spacing normalized only in assertions)

selectPlural('uk', 2, {
  one: '{count} аналіз',
  few: '{count} аналізи',
  many: '{count} аналізів',
  other: '{count} аналізу',
});
// "2 аналізи"
```

Require an explicit currency code. Accept `Date | string | number` only after
validating the date. Return a localized fallback supplied by the caller for an
invalid date rather than leaking `Invalid Date`.

- [ ] **Step 5: Run focused tests and type checking**

Run: `npx vitest run src/lib/i18n/locales.test.ts src/lib/i18n/catalog.test.ts src/lib/i18n/format.test.ts src/lib/onboarding/preferences.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the foundation**

```bash
git add src/lib/i18n src/lib/onboarding/preferences.ts src/lib/onboarding/preferences.test.ts
git commit -m "feat(den-22): add typed locale foundation"
```

---

### Task 2: Server locale resolution, persistence, and switcher

**Files:**

- Create: `src/lib/i18n/request-locale.ts`
- Create: `src/lib/i18n/request-locale.test.ts`
- Create: `src/lib/i18n/actions.ts`
- Create: `src/lib/i18n/actions.test.ts`
- Create: `src/lib/i18n/messages/shared.ts`
- Create: `src/components/i18n/locale-switcher.tsx`
- Create: `src/components/i18n/locale-switcher.test.tsx`
- Modify: `src/lib/onboarding/supabase-storage.ts`
- Modify: `src/lib/onboarding/repository.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/layout.test.tsx`
- Modify: `src/styles/auth-reference.css`
- Modify: `src/styles/app-shell-reference.css`
- Modify: `src/styles/landing-reference.css`

**Interfaces:**

- Consumes: `Locale`, `localeSchema`, `parseAcceptLanguage`, `defineMessages`, and `selectMessages` from Task 1.
- Produces: `resolveInterfaceLocale(input): Locale`, cached
  `getRequestLocale(): Promise<Locale>`, internal
  `persistInterfaceLocale(locale): Promise<LocalePersistenceResult>`,
  `setInterfaceLocale(previous, formData): Promise<LocaleActionState>`, and
  `<LocaleSwitcher locale copy variant />`.
- `LocaleActionState.code` is `invalid_locale | profile_update_failed`; it never contains presentation copy.

- [ ] **Step 1: Write failing resolver and persistence tests**

```ts
expect(
  resolveInterfaceLocale({ profile: 'ru', cookie: 'de', header: 'es' }),
).toBe('ru');
expect(
  resolveInterfaceLocale({ profile: null, cookie: 'de', header: 'es' }),
).toBe('de');
expect(
  resolveInterfaceLocale({ profile: null, cookie: null, header: 'es-ES' }),
).toBe('es');
expect(
  resolveInterfaceLocale({ profile: null, cookie: 'xx', header: 'fr' }),
).toBe('en');
```

Mock authenticated persistence and assert the profile update is exactly
`{ interface_locale: 'de' }`, the locale cookie is `de`, and no call contains
`output_locale`. Mock a storage error and assert that neither cookie nor output
locale changes.

- [ ] **Step 2: Run focused tests to establish the red state**

Run: `npx vitest run src/lib/i18n/request-locale.test.ts src/lib/i18n/actions.test.ts src/components/i18n/locale-switcher.test.tsx`

Expected: FAIL because resolver, action, and component are absent.

- [ ] **Step 3: Implement request resolution and focused profile storage**

Use React `cache` around request resolution. Read profile locale through a
focused `readInterfaceLocale(userId)` method and do not load onboarding output
preferences into the public layout. Read `gleen_locale` from `cookies()` and
`accept-language` from `headers()`. Root layout sets `<html lang={toBcp47(locale)}>`.

The persistence action validates `formData.get('locale')` and delegates to
`persistInterfaceLocale`. For an authenticated user, the helper updates the
profile first and sets a SameSite=Lax, path `/`, one-year cookie only after the
update succeeds. For a guest, it sets only the cookie. The helper is also the
single entry point used by onboarding step 1. Return data; do not redirect.

- [ ] **Step 4: Implement the accessible route-preserving switcher**

Use the existing dropdown primitive and native language names. On action
success call `router.refresh()`; do not call `push` or `replace`, so pathname,
query, and hash remain unchanged. Mark the selected item with
`aria-current="true"`, retain the approved `.language-btn` appearance, and add
only token-backed menu styles.

- [ ] **Step 5: Verify behavior**

Run: `npx vitest run src/lib/i18n/request-locale.test.ts src/lib/i18n/actions.test.ts src/components/i18n/locale-switcher.test.tsx src/app/layout.test.tsx`

Expected: PASS, including profile > cookie > header > English precedence and
zero `output_locale` writes.

- [ ] **Step 6: Commit locale persistence**

```bash
git add src/lib/i18n src/components/i18n src/lib/onboarding src/app/layout.tsx src/app/layout.test.tsx src/styles
git commit -m "feat(den-22): persist interface locale"
```

---

### Task 3: Localize the complete marketing surface

**Files:**

- Create: `src/lib/i18n/messages/marketing.ts`
- Create: `src/lib/i18n/messages/marketing.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/landing-hero.test.tsx`
- Modify: `src/data/marketing.ts`
- Modify: `src/data/marketing.test.ts`
- Modify: `src/components/marketing/landing-analysis-form.tsx`
- Modify: `src/components/marketing/landing-analysis-form.test.tsx`
- Modify: `src/components/marketing/reference-facets.tsx`
- Modify: `src/components/marketing/reference-header.tsx`
- Modify: `src/components/marketing/reference-pricing-footer.tsx`

**Interfaces:**

- Consumes: `getRequestLocale`, `LocaleSwitcher`, and catalog helpers.
- Produces: `MarketingMessages` containing metadata, header, hero, intake CTA,
  workflow, four artifact facets, pricing headings/cards, footer groups, legal
  warning, accessible labels, and form validation/recovery copy.

- [ ] **Step 1: Add failing five-locale marketing tests**

Assert catalog parity and representative copy:

```ts
expect(marketingMessages.uk.hero.title).toBe(
  'Дивіться менше. Розумійте більше.',
);
expect(marketingMessages.ru.header.signIn).toBe('Войти');
expect(marketingMessages.es.header.pricing).toBe('Precios');
expect(marketingMessages.de.hero.submit).toBe('Video umwandeln');
```

Render `HomePage` with German selected and assert localized navigation, hero,
workflow, all four facet headings, pricing heading, footer, form label, and
document metadata input. Assert no horizontal overflow fixture is introduced.

- [ ] **Step 2: Run marketing tests and verify the expected failures**

Run: `npx vitest run src/lib/i18n/messages/marketing.test.ts src/app/page.test.tsx src/app/landing-hero.test.tsx src/data/marketing.test.ts src/components/marketing/landing-analysis-form.test.tsx`

Expected: FAIL on absent German/Spanish copy and hard-coded English UI.

- [ ] **Step 3: Add complete five-language marketing catalogs**

Preserve the current content model (`navigation`, `workflow`, `facets`, and
pricing cards), but make it locale-selected data. Keep plan prices and feature
data outside visual components; translate labels/descriptions only. Include all
screen-reader labels and the landing intake error/retry states.

- [ ] **Step 4: Inject marketing copy without changing approved markup**

Resolve locale on the server in `src/app/page.tsx`, replace the inert EN button
with `LocaleSwitcher`, and pass domain copy to client behaviors. Convert static
metadata to `generateMetadata()` using the selected locale. Keep all existing
Prism geometry, classes, anchors, and motion behavior.

- [ ] **Step 5: Run the focused regression suite**

Run: `npx vitest run src/lib/i18n/messages/marketing.test.ts src/app/page.test.tsx src/app/landing-hero.test.tsx src/data/marketing.test.ts src/components/marketing`

Expected: PASS.

- [ ] **Step 6: Commit marketing localization**

```bash
git add src/lib/i18n/messages/marketing.ts src/lib/i18n/messages/marketing.test.ts src/app/page.tsx src/app/page.test.tsx src/app/landing-hero.test.tsx src/data/marketing.ts src/data/marketing.test.ts src/components/marketing
git commit -m "feat(den-22): localize marketing experience"
```

---

### Task 4: Localize authentication, validation, and onboarding

**Files:**

- Create: `src/lib/i18n/messages/auth.ts`
- Create: `src/lib/i18n/messages/auth.test.ts`
- Create: `src/lib/i18n/messages/onboarding.ts`
- Create: `src/lib/i18n/messages/onboarding.test.ts`
- Modify: `src/app/(auth)/forgot-password/page.tsx`
- Modify: `src/app/(auth)/reset-password/page.tsx`
- Modify: `src/app/(auth)/session-expired/page.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/(auth)/sign-up/page.tsx`
- Modify: `src/app/(auth)/verify-email/page.tsx`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/components/auth/access-form.tsx`
- Modify: `src/components/auth/auth-routes.test.tsx`
- Modify: `src/components/auth/auth-shell.tsx`
- Modify: `src/components/auth/auth-shell.test.tsx`
- Modify: `src/components/auth/password-fields.tsx`
- Modify: `src/components/auth/recovery-forms.tsx`
- Modify: `src/components/onboarding/onboarding-flow.tsx`
- Modify: `src/components/onboarding/onboarding-flow.test.tsx`
- Modify: `src/lib/auth/actions.ts`
- Modify: `src/lib/auth/auth.test.ts`
- Modify: `src/lib/auth/schemas.ts`
- Modify: `src/lib/onboarding/actions.ts`
- Modify: `src/lib/onboarding/actions.test.ts`

**Interfaces:**

- Consumes: request locale, switcher, locale names, catalog helpers.
- Produces: `AuthErrorCode`, `authErrorMessage(copy, code)`,
  `OnboardingErrorCode`, and fully localized auth/onboarding component copy.
- Auth and onboarding action states expose stable codes and typed parameters,
  not user-facing English messages.

- [ ] **Step 1: Write failing error-code and localized-render tests**

Assert `signInWithPassword` maps provider code `invalid_credentials` to the same
machine code without a `message`. Assert invalid email returns
`email_invalid`, weak password returns the precise password code, and the form
renders the German message from `authMessages.de.errors`.

Render onboarding in Ukrainian and assert step text, progress announcement,
separate interface/output descriptions, preset cards, Back/Skip/Continue, and
save failures are Ukrainian. Assert selecting interface German does not change
the hidden `outputLocale` value.

- [ ] **Step 2: Run the auth/onboarding tests to verify they fail**

Run: `npx vitest run src/lib/i18n/messages/auth.test.ts src/lib/i18n/messages/onboarding.test.ts src/lib/auth/auth.test.ts src/lib/onboarding/actions.test.ts src/components/auth src/components/onboarding`

Expected: FAIL on hard-coded English and action `message` fields.

- [ ] **Step 3: Implement stable validation/error codes**

Define exact auth validation codes:

```ts
type AuthErrorCode =
  | 'email_required'
  | 'email_too_long'
  | 'email_invalid'
  | 'password_too_short'
  | 'password_too_long'
  | 'password_letter_required'
  | 'password_number_required'
  | 'password_confirmation_mismatch'
  | 'invalid_credentials'
  | 'user_already_exists'
  | 'email_not_confirmed'
  | 'over_email_send_rate_limit'
  | 'weak_password'
  | 'auth_error';
```

Return success codes (`magic_link_sent`, `verification_required`,
`reset_sent`, `password_updated`) and localize them in the component. Preserve
provider diagnostics server-side without displaying raw provider English.

- [ ] **Step 4: Add complete five-language auth and onboarding catalogs**

Cover metadata, visual-panel copy, form labels/modes/pending states, terms,
verification/recovery/session screens, password requirements, all error codes,
onboarding progress, locale steps, output-language explanation, summary and
flashcard presets, actions, and save failures.

- [ ] **Step 5: Wire locale through pages and components**

Replace the inert auth EN button with `LocaleSwitcher`. Use localized
`generateMetadata`. Pass `copy` into all client forms. When onboarding step 1
saves `interfaceLocale`, use the Task 2 persistence boundary to update the
cookie as well as the existing profile update; step 2 continues to update only
`outputLocale`.

- [ ] **Step 6: Verify auth and onboarding**

Run: `npx vitest run src/lib/auth src/lib/onboarding src/components/auth src/components/onboarding src/app/'(auth)' src/app/onboarding`

Expected: PASS.

- [ ] **Step 7: Commit auth and onboarding localization**

```bash
git add src/lib/i18n/messages/auth.ts src/lib/i18n/messages/auth.test.ts src/lib/i18n/messages/onboarding.ts src/lib/i18n/messages/onboarding.test.ts src/lib/auth src/lib/onboarding src/components/auth src/components/onboarding src/app/'(auth)' src/app/onboarding
git commit -m "feat(den-22): localize auth and onboarding"
```

---

### Task 5: Localize the app shell, intake, and processing states

**Files:**

- Create: `src/lib/i18n/messages/app.ts`
- Create: `src/lib/i18n/messages/app.test.ts`
- Modify: `src/lib/app-shell.ts`
- Modify: `src/lib/app-shell.test.ts`
- Modify: `src/app/app/layout.tsx`
- Modify: `src/app/app/layout.test.tsx`
- Modify: `src/app/app/loading.tsx`
- Modify: `src/app/app/loading.test.tsx`
- Modify: `src/app/app/page.tsx`
- Modify: `src/app/app/page.test.tsx`
- Modify: `src/components/app-shell/app-shell.tsx`
- Modify: `src/components/app-shell/app-shell.test.tsx`
- Modify: `src/components/app-shell/new-analysis-home.tsx`
- Modify: `src/components/app-shell/new-analysis-home.test.tsx`
- Modify: `src/components/app-shell/new-analysis-form.tsx`
- Modify: `src/components/app-shell/new-analysis-form.test.tsx`
- Modify: `src/components/app-shell/intake-readiness.tsx`
- Modify: `src/components/app-shell/intake-readiness.test.tsx`
- Modify: `src/components/app-shell/inline-analysis-processing.tsx`
- Modify: `src/components/app-shell/inline-analysis-processing.test.tsx`
- Modify: `src/components/app-shell/analysis-processing-screen.tsx`
- Modify: `src/components/app-shell/analysis-processing-screen.test.tsx`
- Modify: `src/components/app-shell/analyze-processing-visual.tsx`
- Modify: `src/components/app-shell/analyze-processing-visual.test.tsx`
- Modify: `src/lib/youtube-intake/action-state.ts`
- Modify: `src/lib/youtube-intake/action-factory.ts`
- Modify: `src/lib/youtube-intake/action-factory.test.ts`

**Interfaces:**

- Produces: `AppMessages`; navigation data contains stable IDs rather than
  English discriminants. `IntakeActionState.code` is a stable intake error code
  and contains no presentation message.

- [ ] **Step 1: Add failing German shell and Ukrainian intake tests**

Render the shell with German copy and assert navigation, title, workspace/help,
usage-unavailable, support, language, notification, skip link, and mobile labels.
Render each intake and processing state with Ukrainian copy, including advanced
options, duplicate/reanalysis, usage-limit, unavailable transcript, provider
outage, retry, stage names, artifact rail names, and screen-reader status.

- [ ] **Step 2: Run focused tests and verify the red state**

Run: `npx vitest run src/lib/i18n/messages/app.test.ts src/lib/app-shell.test.ts src/components/app-shell src/lib/youtube-intake/action-factory.test.ts src/app/app/layout.test.tsx src/app/app/page.test.tsx`

Expected: FAIL on hard-coded English labels and intake messages.

- [ ] **Step 3: Stabilize app and intake semantics**

Change navigation identity from English labels to
`new | history | subscription | settings`; keep href/icon/match as data. Map
intake service failures to codes such as `invalid_url`, `video_unavailable`,
`transcript_unavailable`, `provider_outage`, `duplicate`,
`usage_limit_reached`, and `unexpected`, retaining parameters only where copy
needs them.

- [ ] **Step 4: Add five-language app catalog and inject copy**

Cover shell chrome, usage count plural forms, New Analysis headings/form/options,
all artifact names, output locale/preset controls, duplicate dialog, processing
stages, handoff/recovery/error states, and accessible labels. Pass `copy` into
client components; do not read locale inside visual components. Replace the
disabled globe control with the working `LocaleSwitcher`.

- [ ] **Step 5: Use shared formatting for usage**

Pass numeric usage data from layout and create the localized label with
`selectPlural`; remove `${remaining} analyses left` and `Usage available with
billing` from server data construction.

- [ ] **Step 6: Run the app/intake suite**

Run: `npx vitest run src/lib/app-shell.test.ts src/lib/youtube-intake src/components/app-shell src/app/app/layout.test.tsx src/app/app/loading.test.tsx src/app/app/page.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit app localization**

```bash
git add src/lib/i18n/messages/app.ts src/lib/i18n/messages/app.test.ts src/lib/app-shell.ts src/lib/app-shell.test.ts src/lib/youtube-intake src/components/app-shell src/app/app
git commit -m "feat(den-22): localize app intake and processing"
```

---

### Task 6: Localize History and locale-aware presentation

**Files:**

- Create: `src/lib/i18n/messages/history.ts`
- Create: `src/lib/i18n/messages/history.test.ts`
- Modify: `src/app/app/history/page.tsx`
- Modify: `src/app/app/history/page.test.tsx`
- Modify: `src/components/history/history-filters.tsx`
- Modify: `src/components/history/history-filters.test.tsx`
- Modify: `src/components/history/history-item-actions.tsx`
- Modify: `src/components/history/history-item-actions.test.tsx`
- Modify: `src/components/history/history-list.tsx`
- Modify: `src/components/history/history-list.test.tsx`
- Modify: `src/components/history/history-toolbar.tsx`
- Modify: `src/components/history/history-toolbar.test.tsx`
- Modify: `src/components/history/history-workspace.tsx`
- Modify: `src/components/history/history-workspace.test.tsx`
- Modify: `src/lib/history/actions.ts`
- Modify: `src/lib/history/actions.test.ts`
- Modify: `src/lib/history/presentation.ts`
- Modify: `src/lib/history/presentation.test.ts`
- Modify: `src/lib/history/supabase-repository.ts`
- Modify: `src/lib/history/supabase-repository.test.ts`

**Interfaces:**

- Consumes: `Locale`, shared date/relative-time formatters.
- Produces: `HistoryMessages`; `HistoryActionResult` contains code/data only;
  `toHistoryItem(row, { locale, copy })` localizes statuses and preset labels.

- [ ] **Step 1: Write failing catalog, action, and presentation tests**

Assert all status, sort, filter, date-range, view, empty/error, favorite,
rename/delete/duplicate, export-unavailable, load-more, and toast copy exists in
five locales. Assert a German row uses `Detailliert`, localized date ordering,
and localized status. Assert action failure `{ code: 'conflict' }` has no
English `message`.

- [ ] **Step 2: Run History tests and verify failures**

Run: `npx vitest run src/lib/i18n/messages/history.test.ts src/lib/history src/components/history src/app/app/history/page.test.tsx`

Expected: FAIL on English presentation constants and action messages.

- [ ] **Step 3: Move presentation labels to the catalog**

Keep database/query keys (`complete`, `partial`, `recent`, `title-asc`) stable.
Pass the selected BCP 47 locale to repository presentation and map those keys to
copy only at presentation/UI boundaries. Do not translate query values, source
language codes, video titles, channel names, or generated titles.

- [ ] **Step 4: Inject History copy and code-based errors**

Pass one typed `copy` object through workspace, toolbar, filters, list, and item
actions. Replace every action `message` with a code lookup, including optimistic
toast and dialog recovery paths. Preserve existing URL serialization exactly.

- [ ] **Step 5: Verify History**

Run: `npx vitest run src/lib/history src/components/history src/app/app/history/page.test.tsx`

Expected: PASS, including unchanged query URLs.

- [ ] **Step 6: Commit History localization**

```bash
git add src/lib/i18n/messages/history.ts src/lib/i18n/messages/history.test.ts src/lib/history src/components/history src/app/app/history
git commit -m "feat(den-22): localize history workspace"
```

---

### Task 7: Integrate result workspaces into the shared localization system

**Files:**

- Create: `src/lib/i18n/messages/results.ts`
- Create: `src/lib/i18n/messages/results.test.ts`
- Delete: `src/lib/result-workspace/copy.ts`
- Delete: `src/lib/result-workspace/copy.test.ts`
- Modify: `src/app/app/video/[id]/page.tsx`
- Modify: `src/app/app/video/[id]/page.test.tsx`
- Modify: `src/app/share/[token]/page.tsx`
- Modify: `src/app/share/[token]/page.test.tsx`
- Modify: `src/app/share/[token]/not-found.tsx`
- Modify: `src/app/app-shell-fixture/app/video/[id]/fixture-result-workspace.tsx`
- Modify: `src/app/app-shell-fixture/app/video/[id]/page.tsx`
- Modify: `src/components/result-workspace/autosave-status.tsx`
- Modify: `src/components/result-workspace/chapter-rail.tsx`
- Modify: `src/components/result-workspace/chapter-rail.test.tsx`
- Modify: `src/components/result-workspace/chapter-sheet.tsx`
- Modify: `src/components/result-workspace/export-tab.tsx`
- Modify: `src/components/result-workspace/export-tab.test.tsx`
- Modify: `src/components/result-workspace/flashcards-tab.tsx`
- Modify: `src/components/result-workspace/mobile-mini-player.tsx`
- Modify: `src/components/result-workspace/mobile-result-navigation.tsx`
- Modify: `src/components/result-workspace/overview-tab-view-model.ts`
- Modify: `src/components/result-workspace/overview-tab.tsx`
- Modify: `src/components/result-workspace/overview-tab.test.tsx`
- Modify: `src/components/result-workspace/player-controls.tsx`
- Modify: `src/components/result-workspace/player-controls.test.tsx`
- Modify: `src/components/result-workspace/result-header.tsx`
- Modify: `src/components/result-workspace/result-navigation.tsx`
- Modify: `src/components/result-workspace/result-share-dialog.tsx`
- Modify: `src/components/result-workspace/result-workspace.tsx`
- Modify: `src/components/result-workspace/result-workspace.test.tsx`
- Modify: `src/components/result-workspace/source-panel.tsx`
- Modify: `src/components/result-workspace/source-panel.test.tsx`
- Modify: `src/components/result-workspace/summary-tab.tsx`
- Modify: `src/components/result-workspace/timestamps-tab.tsx`
- Modify: `src/components/result-workspace/transcript-tab.tsx`
- Modify: `src/components/result-workspace/transcript-tab.test.tsx`

**Interfaces:**

- Produces: `ResultMessages`, `resultMessages`, `formatResultMessage`, and
  plural helpers under `src/lib/i18n/messages/results.ts`.
- Removes the standalone localization source from `src/lib/result-workspace`.

- [ ] **Step 1: Add failing shared-catalog integration tests**

Move the existing copy parity, interpolation, and Ukrainian/Russian plural
assertions to `results.test.ts`. Add page tests proving the authenticated result
uses request `interface_locale`, while public share uses cookie/header locale.
Assert generated summary/transcript text is unchanged when interface copy is
German.

- [ ] **Step 2: Run result tests and establish the red state**

Run: `npx vitest run src/lib/i18n/messages/results.test.ts src/components/result-workspace src/app/app/video/'[id]'/page.test.tsx src/app/share/'[token]'/page.test.tsx`

Expected: FAIL until imports and page resolution use the shared namespace.

- [ ] **Step 3: Move the existing five complete catalogs without rewriting copy**

Preserve every current `ResultCopy` key and translation. Replace its local
locale type and plural implementation with Task 1 primitives. Update all
imports to `@/lib/i18n/messages/results`; do not leave a re-export facade or a
second catalog.

- [ ] **Step 4: Resolve private and public result locale consistently**

Use cached `getRequestLocale()` instead of a result-page-specific onboarding
query and English catch fallback. Localize public metadata, notice, and
not-found state. Keep generated artifact models and edit/share actions
unchanged.

- [ ] **Step 5: Verify result regression coverage**

Run: `npx vitest run src/lib/i18n/messages/results.test.ts src/components/result-workspace src/lib/result-workspace src/app/app/video/'[id]'/page.test.tsx src/app/share/'[token]'/page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit result integration**

```bash
git add src/lib/i18n/messages/results.ts src/lib/i18n/messages/results.test.ts src/lib/result-workspace src/components/result-workspace src/app/app/video src/app/share src/app/app-shell-fixture/app/video
git commit -m "refactor(den-22): unify result localization"
```

---

### Task 8: Localize billing, invoices, usage, checkout, and portal

**Files:**

- Create: `src/lib/i18n/messages/billing.ts`
- Create: `src/lib/i18n/messages/billing.test.ts`
- Modify: `src/lib/billing/presentation.ts`
- Modify: `src/lib/billing/presentation.test.ts`
- Modify: `src/components/billing/billing-mobile-navigation.tsx`
- Modify: `src/components/billing/billing-page.tsx`
- Modify: `src/components/billing/checkout-experience.tsx`
- Modify: `src/components/billing/checkout-experience.test.tsx`
- Modify: `src/components/billing/checkout-screen.tsx`
- Modify: `src/components/billing/checkout-screen.test.tsx`
- Modify: `src/components/billing/invoices-screen.tsx`
- Modify: `src/components/billing/invoices-screen.test.tsx`
- Modify: `src/components/billing/limit-reached-screen.tsx`
- Modify: `src/components/billing/limit-reached-screen.test.tsx`
- Modify: `src/components/billing/portal-screen.tsx`
- Modify: `src/components/billing/portal-screen.test.tsx`
- Modify: `src/components/billing/subscription-screen.tsx`
- Modify: `src/components/billing/subscription-screen.test.tsx`
- Modify: `src/components/billing/usage-screen.tsx`
- Modify: `src/components/billing/usage-screen.test.tsx`
- Modify: `src/app/app/subscription/page.tsx`
- Modify: `src/app/app/subscription/checkout/page.tsx`
- Modify: `src/app/app/subscription/invoices/page.tsx`
- Modify: `src/app/app/subscription/invoices/page.test.tsx`
- Modify: `src/app/app/subscription/limit-reached/page.tsx`
- Modify: `src/app/app/subscription/limit-reached/page.test.tsx`
- Modify: `src/app/app/subscription/portal/page.tsx`
- Modify: `src/app/app/subscription/usage/page.tsx`

**Interfaces:**

- Consumes: `Locale`, formatting helpers, server request locale.
- Produces: `BillingMessages`; all billing presentation functions require
  `{ locale, copy }` and keep currency/amount/catalog data server-owned.

- [ ] **Step 1: Write failing locale and currency tests**

Assert German subscription, Spanish checkout, Ukrainian invoices, Russian
usage, and English portal screens contain localized headings, actions, status,
filter/search, empty/error, scheduled-change, payment, and mobile navigation
copy. Assert USD/EUR/JPY amounts keep their supplied currency and use locale
formatting; assert no presentation function defaults silently to `en-US`.

- [ ] **Step 2: Run billing tests and verify the failures**

Run: `npx vitest run src/lib/i18n/messages/billing.test.ts src/lib/billing/presentation.test.ts src/components/billing src/app/app/subscription`

Expected: FAIL on English constants and default locale formatting.

- [ ] **Step 3: Separate semantic billing data from localized copy**

Change entitlement, invoice, event, payment-method, interval, scheduled-change,
and action-reason presentation to retain stable keys and obtain labels from
`BillingMessages`. Replace local money/date formatters with Task 1 helpers.
Every page passes `locale: requestLocale` and the selected catalog; shared
formatters perform the BCP 47 mapping internally.
Never translate Stripe IDs, invoice numbers, plan catalog display names, or
currency codes unless they are explicitly catalog copy fields.

- [ ] **Step 4: Inject complete billing copy**

Pass `copy` through each billing screen and localized metadata. Cover every
state from the six approved billing screens plus checkout retry/confirm errors,
invoice CSV controls, usage ledger event labels, portal scheduling/proration,
and unavailable controls. Preserve the approved markup/classes and Stripe
Elements ownership of payment fields.

- [ ] **Step 5: Verify billing**

Run: `npx vitest run src/lib/billing src/components/billing src/app/app/subscription`

Expected: PASS with unchanged billing domain/action semantics.

- [ ] **Step 6: Commit billing localization**

```bash
git add src/lib/i18n/messages/billing.ts src/lib/i18n/messages/billing.test.ts src/lib/billing/presentation.ts src/lib/billing/presentation.test.ts src/components/billing src/app/app/subscription
git commit -m "feat(den-22): localize billing experience"
```

---

### Task 9: Build independent language settings

**Files:**

- Create: `src/lib/i18n/messages/settings.ts`
- Create: `src/lib/i18n/messages/settings.test.ts`
- Create: `src/lib/settings/actions.ts`
- Create: `src/lib/settings/actions.test.ts`
- Create: `src/components/settings/language-preferences.tsx`
- Create: `src/components/settings/language-preferences.test.tsx`
- Modify: `src/app/app/settings/profile/page.tsx`
- Create: `src/app/app/settings/profile/page.test.tsx`
- Modify: `src/styles/app-shell-reference.css`

**Interfaces:**

- Consumes: `setInterfaceLocale` from Task 2 and onboarding profile storage.
- Produces: `setOutputLocale(previous, formData): Promise<OutputLocaleActionState>`
  and `<LanguagePreferences interfaceLocale outputLocale copy />`.

- [ ] **Step 1: Write failing action-isolation tests**

Assert `setOutputLocale` validates exactly the five locales and updates exactly
`{ output_locale: 'es' }`. Assert `setInterfaceLocale` still updates exactly
`{ interface_locale: 'de' }`. Render settings, perform each action, and assert
the other selection does not change.

- [ ] **Step 2: Run settings tests and verify they fail**

Run: `npx vitest run src/lib/i18n/messages/settings.test.ts src/lib/settings/actions.test.ts src/components/settings/language-preferences.test.tsx src/app/app/settings/profile/page.test.tsx`

Expected: FAIL because settings still renders its current incomplete state.

- [ ] **Step 3: Implement separate settings action and UI**

Use two forms and two pending/error states. Interface copy explicitly says it
changes Gleen controls; output copy explicitly says it affects future generated
content. Reuse native locale names without flags. Successful interface updates
refresh the page; successful output updates update only the output selection.

- [ ] **Step 4: Verify settings and persistence isolation**

Run: `npx vitest run src/lib/i18n/actions.test.ts src/lib/settings src/components/settings src/app/app/settings/profile/page.test.tsx`

Expected: PASS with no cross-column writes.

- [ ] **Step 5: Commit settings**

```bash
git add src/lib/i18n/messages/settings.ts src/lib/i18n/messages/settings.test.ts src/lib/settings src/components/settings src/app/app/settings src/styles/app-shell-reference.css
git commit -m "feat(den-22): add independent language settings"
```

---

### Task 10: Add transactional-email localization foundation

**Files:**

- Create: `src/lib/i18n/messages/email.ts`
- Create: `src/lib/i18n/messages/email.test.ts`
- Create: `src/lib/email/transactional-copy.ts`
- Create: `src/lib/email/transactional-copy.test.ts`

**Interfaces:**

- Produces:

```ts
type TransactionalEmailInput =
  | { kind: 'magic_link'; locale: Locale; actionUrl: string }
  | { kind: 'verify_email'; locale: Locale; actionUrl: string }
  | { kind: 'password_reset'; locale: Locale; actionUrl: string }
  | { kind: 'analysis_ready'; locale: Locale; actionUrl: string; title: string }
  | {
      kind: 'payment_failed';
      locale: Locale;
      actionUrl: string;
      planName: string;
    }
  | {
      kind: 'subscription_changed';
      locale: Locale;
      actionUrl: string;
      planName: string;
      effectiveAt: string;
    };

type TransactionalEmailCopy = Readonly<{
  subject: string;
  preview: string;
  heading: string;
  paragraphs: readonly string[];
  actionLabel: string;
  plainText: string;
}>;
```

- [ ] **Step 1: Write failing rendering tests**

Render each discriminated input in every locale. Assert user/video/plan values
remain unchanged, dates use the selected locale, links appear in plain text,
and unsupported locale input is rejected before rendering.

- [ ] **Step 2: Run email tests and verify the red state**

Run: `npx vitest run src/lib/i18n/messages/email.test.ts src/lib/email/transactional-copy.test.ts`

Expected: FAIL because the email copy renderer does not exist.

- [ ] **Step 3: Implement server-only catalogs and pure rendering**

Add `import 'server-only'` to the renderer. Produce subject, preview, heading,
paragraphs, action label, and plain text only. Use shared formatters and typed
interpolation. Do not import Supabase, Resend, React Email, a queue, or any send
function.

- [ ] **Step 4: Verify and commit email foundation**

Run: `npx vitest run src/lib/i18n/messages/email.test.ts src/lib/email/transactional-copy.test.ts`

Expected: PASS.

```bash
git add src/lib/i18n/messages/email.ts src/lib/i18n/messages/email.test.ts src/lib/email
git commit -m "feat(den-22): add localized email copy foundation"
```

---

### Task 11: Audit secondary routes, metadata, accessibility, and fixtures

**Files:**

- Create: `src/lib/i18n/messages/shared.test.ts`
- Modify: `src/app/protected/page.tsx`
- Modify: `src/app/protected/page.test.tsx`
- Modify: `src/app/ui/ui-preview.tsx`
- Modify: `src/app/ui/ui-preview.test.tsx`
- Modify: `src/app/app-shell-fixture/page.tsx`
- Modify: `src/app/app-shell-fixture/page.test.tsx`
- Modify: `src/app/analyze-processing-fixture/page.tsx`
- Modify: `src/app/analyze-processing-fixture/page.test.tsx`
- Modify: `src/app/billing-fixture/[screen]/fixture-screen.tsx`
- Modify: `src/app/billing-fixture/[screen]/page.test.tsx`
- Modify: `src/components/app-shell/destination-state.tsx`
- Modify: `src/components/app-shell/destination-state.test.tsx`
- Modify: `src/components/billing/billing-mobile-navigation.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/layout.test.tsx`
- Create: `src/lib/i18n/hardcoded-copy.test.ts`

**Interfaces:**

- Consumes all completed catalogs.
- Produces a static audit that prevents known in-scope visual files from
  reintroducing raw English product copy while allowing generated/user/provider
  data and test fixture content through an explicit allowlist.

- [ ] **Step 1: Write failing coverage tests for secondary states**

Assert localized document `lang`, metadata title/description, shared skip/help/
unavailable/generic error labels, protected recovery, fixture navigation, UI
preview labels, loading states, and incomplete destination states. Scan production
TSX files in the in-scope route/component directories for the reviewed English
phrases removed by Tasks 3–9; report file and phrase on failure.

- [ ] **Step 2: Run the audit and review every failure**

Run: `npx vitest run src/lib/i18n/messages/shared.test.ts src/lib/i18n/hardcoded-copy.test.ts src/app/protected src/app/ui src/app/app-shell-fixture src/app/analyze-processing-fixture src/app/billing-fixture`

Expected: FAIL with a finite list of remaining user-visible English strings.

- [ ] **Step 3: Route every remaining in-scope string through its domain catalog**

Fixture data such as video titles may remain literal because it represents
content, but fixture controls/status/accessibility labels must use the same
production copy contracts. Keep developer-only diagnostic identifiers and
non-visible test data on the documented allowlist. Do not localize URLs,
database keys, CSS classes, product name `Gleen`, or generated artifact content.

- [ ] **Step 4: Verify the audit is clean**

Run: `npx vitest run src/lib/i18n/messages/shared.test.ts src/lib/i18n/hardcoded-copy.test.ts src/app src/components`

Expected: PASS.

- [ ] **Step 5: Commit the completeness audit**

```bash
git add src/lib/i18n src/app src/components
git commit -m "test(den-22): enforce complete localized UI copy"
```

---

### Task 12: End-to-end locale, responsive, keyboard, and reduced-motion verification

**Files:**

- Create: `tests/e2e/localization.spec.ts`
- Modify: `tests/e2e/auth.spec.ts`
- Modify: `tests/e2e/intake.spec.ts`
- Modify: `tests/e2e/history.spec.ts`
- Modify: `tests/e2e/billing.spec.ts`
- Modify: `tests/e2e/result-workspace.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `.superpowers/sdd/2026-08-03-den-22-localization/task-12-report.md`

**Interfaces:**

- Consumes the complete localized application.
- Produces browser evidence for every DEN-22 acceptance criterion and final
  repository-gate evidence.

- [ ] **Step 1: Add failing localization E2E journeys**

Cover these exact behaviors:

1. On `/sign-in?next=%2Fapp%2Fhistory%3Fstatus%3Dready`, choose Deutsch and
   assert the URL and query stay unchanged, `<html lang="de-DE">`, and auth copy
   becomes German after refresh.
2. Reload and assert the guest cookie persists German.
3. In the authenticated fixture, choose Español and assert localized shell,
   intake, History, result, and billing navigation while the route stays fixed.
4. Change interface locale to German while output locale is Ukrainian; reopen
   Advanced options and assert Ukrainian remains selected.
5. Exercise all five locale labels by keyboard with visible focus and no flags.
6. Visit landing, auth, intake, History, result, billing, and settings in German
   and Spanish at 1440×900, 1024×768, and 390×844; assert
   `scrollWidth <= innerWidth`.
7. Enable reduced motion and assert locale switching adds no animation and
   existing motion remains reduced.

Tag the new tests `@localization`. Update the `mobile-chrome` project grep to
`/durable|@localization/` so the existing durable mobile suite and the new
localization journeys both execute; do not broaden it to every desktop-only
test.

- [ ] **Step 2: Run the new Chromium suite and verify it fails before final fixes**

Run: `PLAYWRIGHT_PORT=3076 npx playwright test tests/e2e/localization.spec.ts --project=chromium`

Expected: FAIL only on incomplete wiring/layout issues revealed by the journey.

- [ ] **Step 3: Fix only localization-caused browser failures**

Adjust copy injection, token-backed responsive wrapping/min-width rules, focus
behavior, or deterministic fixtures. Do not redesign approved screens or alter
billing/processing domain behavior.

- [ ] **Step 4: Run desktop and mobile localization suites**

Run: `PLAYWRIGHT_PORT=3076 npx playwright test tests/e2e/localization.spec.ts tests/e2e/auth.spec.ts tests/e2e/intake.spec.ts tests/e2e/history.spec.ts tests/e2e/billing.spec.ts tests/e2e/result-workspace.spec.ts --project=chromium`

Expected: PASS.

Run: `PLAYWRIGHT_PORT=3077 npx playwright test tests/e2e/localization.spec.ts --project=mobile-chrome`

Expected: PASS.

- [ ] **Step 5: Run the complete repository gates**

Run: `npm run format`

Expected: Prettier completes without errors.

Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`

Expected: all commands PASS.

Run: `CI=1 PLAYWRIGHT_PORT=3078 npm run test:e2e`

Expected: all Playwright projects PASS.

- [ ] **Step 6: Perform browser evidence review**

Capture and inspect desktop, tablet, and mobile screenshots for German and
Spanish landing/auth/app/history/result/billing/settings. Record viewport,
locale, route, overflow result, keyboard result, and reduced-motion result in
the task report. Confirm native language names and absence of flags.

- [ ] **Step 7: Final scope and secret review**

Run: `git diff origin/main --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: only the intended DEN-22 report/plan changes before the final commit.

Review `git diff origin/main -- . ':!package-lock.json'` for unrelated behavior,
credentials, provider keys, translated generated content, and accidental plan/
price/currency constants in components.

- [ ] **Step 8: Commit verification evidence**

```bash
git add tests/e2e playwright.config.ts .superpowers/sdd/2026-08-03-den-22-localization/task-12-report.md
git commit -m "test(den-22): verify five-language localization"
```

---

## Completion criteria

- All five locales cover every in-scope interface namespace with identical
  typed keys and interpolation signatures.
- Changing interface language preserves route/query and persists for guests and
  authenticated users.
- Interface and output language actions are proven independent.
- Dates, numbers, money, relative time, and plural forms use shared locale-aware
  formatters.
- Development/test missing-message behavior is visible and deterministic.
- German and Spanish pass expansion checks at desktop, tablet, and mobile.
- Keyboard and reduced-motion checks pass.
- Email copy renders in five locales without adding delivery behavior.
- Formatting, linting, type checking, unit/integration tests, production build,
  and complete Playwright suite pass before DEN-22 is marked complete.

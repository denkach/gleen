# DEN-29 Account Pages Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the approved Settings and Subscription recovery designs while preserving independent locale persistence and authoritative billing behavior.

**Architecture:** Keep the existing Settings server actions and subscription presentation boundaries. Add a focused subscription-retry server action and client recovery card, keep support configuration outside visual billing components, and implement the approved responsive presentation through existing token-backed App Shell and billing styles.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, CSS variables/Tailwind design tokens, Vitest + Testing Library, Playwright.

## Global Constraints

- Match `design/prototypes/gleen-account-pages-cb-v1/` without reinterpreting the approved screens.
- Preserve dark-only “The Prism” design language and existing shared design tokens.
- Do not hard-code plans, prices, usage limits, languages, or currencies into visual components.
- Keep interface locale and generated-content locale independent.
- Do not display a visible “Saving language…” message.
- Keep valid plan and usage information visible when only Stripe payment data is unavailable.
- Use `mailto:gleen_support@gmail.com` as the truthful support destination.
- Support desktop, tablet, mobile, keyboard navigation, and `prefers-reduced-motion`.
- Do not add a production dependency or modify unrelated files.

---

### Task 1: Preserve approved prototype assets

**Files:**

- Create unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1.html`
- Create unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1/gleen-account-pages.html`
- Create unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1/desktop-settings.png`
- Create unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1/mobile-settings.png`
- Create unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1/desktop-subscription.png`
- Create unchanged: `design/prototypes/gleen-account-pages-cb-v1/gleen-account-pages-cb-v1/mobile-subscription.png`

**Interfaces:**

- Consumes: user-approved untracked prototype directory in the main checkout.
- Produces: immutable review reference committed on the DEN-29 branch.

- [ ] **Step 1: Copy the approved directory without transformation**

```bash
cp -R /Users/niga/Downloads/gleen/design/prototypes/gleen-account-pages-cb-v1 design/prototypes/
```

- [ ] **Step 2: Verify source and branch copies are byte-identical**

```bash
diff -qr /Users/niga/Downloads/gleen/design/prototypes/gleen-account-pages-cb-v1 design/prototypes/gleen-account-pages-cb-v1
```

Expected: exit code 0 and no output.

- [ ] **Step 3: Commit the immutable reference**

```bash
git add design/prototypes/gleen-account-pages-cb-v1
git commit -m "docs(den-29): preserve account page prototype"
```

### Task 2: Define complete localized account-page copy

**Files:**

- Modify: `src/lib/i18n/messages/settings.ts`
- Modify: `src/lib/i18n/messages/settings.test.ts`
- Modify: `src/lib/i18n/messages/billing.ts`
- Modify: `src/lib/i18n/messages/billing.test.ts`
- Create: `src/lib/support.ts`
- Create: `src/lib/support.test.ts`

**Interfaces:**

- Consumes: `Locale`, `defineMessages`, and existing message-catalog shape validation.
- Produces: `SettingsCopy.language.note`, `BillingMessages.subscription.error` recovery strings, and `supportEmailHref: "mailto:gleen_support@gmail.com"`.

- [ ] **Step 1: Write failing catalog and support-contract tests**

```ts
for (const locale of supportedLocales) {
  const settings = settingsMessages[locale].language;
  expect(settings.note.title).not.toHaveLength(0);
  expect(settings.note.description).not.toHaveLength(0);
  expect(settings.note.privacy).not.toHaveLength(0);

  const error = billingMessages[locale].subscription.error;
  expect(error.support).not.toHaveLength(0);
  expect(error.retrying).not.toHaveLength(0);
  expect(error.retryFailed).not.toHaveLength(0);
  expect(error.secure).not.toHaveLength(0);
  expect(error.notRetried).not.toHaveLength(0);
  expect(error.lastAttempt('14:32')).toContain('14:32');
}

expect(supportEmailHref).toBe('mailto:gleen_support@gmail.com');
```

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
npm test -- src/lib/i18n/messages/settings.test.ts src/lib/i18n/messages/billing.test.ts src/lib/support.test.ts
```

Expected: FAIL because the new message fields and support module do not exist.

- [ ] **Step 3: Add complete copy in all five locales and the support constant**

```ts
export const supportEmailAddress = 'gleen_support@gmail.com';
export const supportEmailHref = `mailto:${supportEmailAddress}`;
```

Add equivalent localized fields to every locale:

```ts
note: {
  title: 'Settings apply only to new materials',
  description: 'Previous analyses and documents remain unchanged.',
  privacy: 'Language preferences are stored only for your account.',
}
```

Add subscription recovery fields `support`, `retrying`, `retryFailed`, `secure`, `notRetried`, and `lastAttempt(time)` without exposing diagnostics. The client formats the time with the active locale before supplying it to the copy function.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
npm test -- src/lib/i18n/messages/settings.test.ts src/lib/i18n/messages/billing.test.ts src/lib/support.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit localized contracts**

```bash
git add src/lib/i18n/messages/settings.ts src/lib/i18n/messages/settings.test.ts src/lib/i18n/messages/billing.ts src/lib/i18n/messages/billing.test.ts src/lib/support.ts src/lib/support.test.ts
git commit -m "feat(den-29): add account recovery copy"
```

### Task 3: Implement the approved Settings composition

**Files:**

- Modify: `src/components/settings/language-preferences.tsx`
- Modify: `src/components/settings/language-preferences.test.tsx`
- Modify: `src/app/app/settings/profile/page.test.tsx`
- Modify: `src/styles/app-shell-reference.css`
- Modify: `src/styles/app-shell-reference.test.ts`

**Interfaces:**

- Consumes: existing `setInterfaceLocale`, `setOutputLocale`, `SettingsCopy`, `AppIcon`, and canonical `supportedLocales`.
- Produces: independent `PreferenceForm` rows inside `.settings-account-layout`, plus `.settings-note-card` and stable per-row status regions.

- [ ] **Step 1: Write failing behavior tests for the new composition**

```tsx
expect(
  screen.getByRole('heading', { name: 'Settings', level: 1 }),
).toBeVisible();
expect(
  screen.getByRole('heading', { name: 'Interface language', level: 2 }),
).toBeVisible();
expect(
  screen.getByRole('heading', { name: 'Generated-content language', level: 2 }),
).toBeVisible();
expect(screen.getByText('Settings apply only to new materials')).toBeVisible();

await user.click(
  screen.getByRole('button', { name: 'Save interface language' }),
);
expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
expect(
  screen.getByRole('button', { name: 'Save interface language' }),
).toBeDisabled();
```

Keep the existing independence and failure tests; add an assertion that each status region remains mounted and belongs only to its form.

- [ ] **Step 2: Run Settings tests and verify RED**

```bash
npm test -- src/components/settings/language-preferences.test.tsx src/app/app/settings/profile/page.test.tsx src/styles/app-shell-reference.test.ts
```

Expected: FAIL because the note, row composition, icon hooks, and unchanged pending label are absent.

- [ ] **Step 3: Refactor markup without changing persistence actions**

Use this stable structure:

```tsx
<div className="settings-account-layout">
  <article className="settings-language-card">
    <PreferenceForm icon="globe" {...interfaceProps} />
    <PreferenceForm icon="language" {...outputProps} />
  </article>
  <aside className="settings-note-card">
    <AppIcon name="check" />
    <h2>{copy.language.note.title}</h2>
    <p>{copy.language.note.description}</p>
    <div className="settings-note-card__privacy">
      <AppIcon name="lock" />
      <span>{copy.language.note.privacy}</span>
    </div>
  </aside>
</div>
```

Render `saveLabel` during pending, disable only the submitting form, and keep the existing `aria-live`/alert mapping.

- [ ] **Step 4: Implement token-backed desktop, tablet, mobile, and reduced-motion styles**

Replace the old generic `.settings-content` geometry with prototype-matching hooks. Desktop rows use a three-part grid; tablet moves the note below the card; mobile stacks icon/content/select/action and uses full-width buttons. Reserve status height, apply `min-width: 0`, allow translated copy to wrap, and avoid horizontal overflow.

- [ ] **Step 5: Run focused tests and verify GREEN**

```bash
npm test -- src/components/settings/language-preferences.test.tsx src/app/app/settings/profile/page.test.tsx src/styles/app-shell-reference.test.ts
```

Expected: all focused tests pass with no React warnings.

- [ ] **Step 6: Commit Settings refinement**

```bash
git add src/components/settings/language-preferences.tsx src/components/settings/language-preferences.test.tsx src/app/app/settings/profile/page.test.tsx src/styles/app-shell-reference.css src/styles/app-shell-reference.test.ts
git commit -m "feat(den-29): refine language settings page"
```

### Task 4: Add authoritative Subscription retry behavior

**Files:**

- Create: `src/lib/billing/subscription-recovery.ts`
- Create: `src/lib/billing/subscription-recovery.test.ts`
- Create: `src/components/billing/subscription-recovery-card.tsx`
- Create: `src/components/billing/subscription-recovery-card.test.tsx`
- Modify: `src/components/billing/subscription-screen.tsx`
- Modify: `src/components/billing/subscription-screen.test.tsx`

**Interfaces:**

- Consumes: `createServerSupabaseClient`, `createSupabaseBillingRepository`, `BillingMessages.subscription.error`, `supportEmailHref`, `router.refresh()`.
- Produces: `retrySubscriptionSnapshot(): Promise<SubscriptionRecoveryResult>` and `SubscriptionRecoveryCard`.

```ts
export type SubscriptionRecoveryResult =
  | Readonly<{ status: 'success' }>
  | Readonly<{
      status: 'error';
      code: 'session_expired' | 'snapshot_unavailable';
    }>;

export async function retrySubscriptionSnapshot(): Promise<SubscriptionRecoveryResult>;
```

- [ ] **Step 1: Write failing server-action tests**

```ts
await expect(retrySubscriptionSnapshot()).resolves.toEqual({
  status: 'success',
});
expect(getOwnedSnapshot).toHaveBeenCalledWith('user-1');

getOwnedSnapshot.mockRejectedValueOnce(new Error('private diagnostic'));
await expect(retrySubscriptionSnapshot()).resolves.toEqual({
  status: 'error',
  code: 'snapshot_unavailable',
});
```

Also cover a missing session returning `session_expired` without reading billing data.

- [ ] **Step 2: Run the server-action test and verify RED**

```bash
npm test -- src/lib/billing/subscription-recovery.test.ts
```

Expected: FAIL because the action module does not exist.

- [ ] **Step 3: Implement the minimal authenticated retry action**

The action authenticates, retries `repository.getOwnedSnapshot(user.id)`, returns controlled status only, and logs a route/event object without raw exception content.

- [ ] **Step 4: Run the server-action test and verify GREEN**

```bash
npm test -- src/lib/billing/subscription-recovery.test.ts
```

Expected: all action tests pass.

- [ ] **Step 5: Write failing recovery-card interaction tests**

```tsx
expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
  'href',
  'mailto:gleen_support@gmail.com',
);
expect(screen.getByText('Not retried yet')).toBeVisible();

await user.dblClick(screen.getByRole('button', { name: 'Try again' }));
expect(retryAction).toHaveBeenCalledTimes(1);
expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled();

resolveRetry({ status: 'error', code: 'snapshot_unavailable' });
await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
  'We still could not load billing details. Try again.',
);
expect(screen.getByText(/Last attempt:/)).toBeVisible();
```

Add a success case that calls `router.refresh()` once and a focus assertion after failure.

- [ ] **Step 6: Run recovery-card tests and verify RED**

```bash
npm test -- src/components/billing/subscription-recovery-card.test.tsx src/components/billing/subscription-screen.test.tsx
```

Expected: FAIL because the structured component and injection seam are absent.

- [ ] **Step 7: Implement the client card and integrate it into `SubscriptionScreen`**

`SubscriptionRecoveryCard` receives `locale`, localized error copy, `supportHref`, and an injectable `retryAction` defaulting to the production server action. It uses one pending guard, a captured `Date`, a stable status region, and refreshes only after success. `SubscriptionScreen` renders it only when `presentation === null`; non-null presentations, including unavailable payment method, stay unchanged.

- [ ] **Step 8: Run recovery and subscription tests and verify GREEN**

```bash
npm test -- src/lib/billing/subscription-recovery.test.ts src/components/billing/subscription-recovery-card.test.tsx src/components/billing/subscription-screen.test.tsx src/app/app/subscription/billing-copy-boundary.test.tsx
```

Expected: all focused tests pass and payment-method-only outage coverage remains green.

- [ ] **Step 9: Commit recovery behavior**

```bash
git add src/lib/billing/subscription-recovery.ts src/lib/billing/subscription-recovery.test.ts src/components/billing/subscription-recovery-card.tsx src/components/billing/subscription-recovery-card.test.tsx src/components/billing/subscription-screen.tsx src/components/billing/subscription-screen.test.tsx
git commit -m "feat(den-29): add subscription recovery flow"
```

### Task 5: Match Subscription recovery layout and motion

**Files:**

- Modify: `src/styles/billing-reference.css`
- Modify: `src/styles/billing-reference.test.ts`
- Modify: `src/app/billing-fixture/[screen]/fixture-screen.tsx`
- Modify: `src/app/billing-fixture/[screen]/page.test.tsx`

**Interfaces:**

- Consumes: `.billing-recovery-card` semantic hooks from Task 4 and the existing fixture `subscription/error` state.
- Produces: prototype-matching recovery geometry at desktop/mobile and deterministic fixture hydration.

- [ ] **Step 1: Write failing style and fixture contract tests**

```ts
expect(css).toContain('.billing-recovery-card');
expect(css).toContain('@media (prefers-reduced-motion: reduce)');
expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
  'href',
  'mailto:gleen_support@gmail.com',
);
```

- [ ] **Step 2: Run style and fixture tests and verify RED**

```bash
npm test -- src/styles/billing-reference.test.ts src/app/billing-fixture/[screen]/page.test.tsx
```

Expected: FAIL because the recovery-specific hooks are not styled or fixture-covered.

- [ ] **Step 3: Implement prototype-matching responsive CSS**

Desktop uses the approved symbol column and recovery content column. Mobile stacks the symbol above centered copy, uses full-width actions, and keeps metadata left-aligned. Use existing billing variables and shared tokens; spinner/pulse animation must be disabled in the existing reduced-motion query.

- [ ] **Step 4: Make the fixture deterministic**

Inject a controlled retry action and deterministic clock for visual/browser fixture routes so screenshots never depend on a real Supabase session or wall-clock time.

- [ ] **Step 5: Run focused tests and verify GREEN**

```bash
npm test -- src/styles/billing-reference.test.ts src/app/billing-fixture/[screen]/page.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit recovery presentation**

```bash
git add src/styles/billing-reference.css src/styles/billing-reference.test.ts src/app/billing-fixture/[screen]/fixture-screen.tsx src/app/billing-fixture/[screen]/page.test.tsx
git commit -m "style(den-29): match subscription recovery prototype"
```

### Task 6: Add browser, accessibility, and visual coverage

**Files:**

- Modify: `tests/e2e/localization.spec.ts`
- Modify: `tests/e2e/billing.spec.ts`
- Modify: `tests/e2e/billing.visual.spec.ts`
- Create or update: `tests/e2e/localization.spec.ts-snapshots/den-29-1600x1000-desktop-settings-ru-chromium.png`
- Create or update: `tests/e2e/localization.spec.ts-snapshots/den-29-390x1249-mobile-settings-ru-chromium.png`
- Create or update: `tests/e2e/billing.visual.spec.ts-snapshots/den-29-1440x900-desktop-subscription-error-chromium.png`
- Create or update: `tests/e2e/billing.visual.spec.ts-snapshots/den-29-412x839-pixel7-subscription-error-chromium.png`

**Interfaces:**

- Consumes: preview-gated fixture routes, authenticated shell fixture, production CSS, and deterministic retry action.
- Produces: browser evidence for the DEN-29 acceptance criteria.

- [ ] **Step 1: Write failing Playwright assertions**

```ts
await expect(
  page.getByRole('link', { name: 'Contact support' }),
).toHaveAttribute('href', 'mailto:gleen_support@gmail.com');
await page.getByRole('button', { name: 'Try again' }).dblclick();
await expect(page.getByRole('button', { name: 'Retrying…' })).toBeDisabled();
await expectNoHorizontalOverflow(page);
```

Add desktop/mobile Settings assertions, keyboard tab order, a reduced-motion media emulation, and five-locale long-copy checks.

- [ ] **Step 2: Run targeted browser tests and verify RED**

```bash
PLAYWRIGHT_PORT=3076 npx playwright test tests/e2e/billing.spec.ts tests/e2e/localization.spec.ts --project=chromium --grep "DEN-29"
```

Expected: FAIL until fixture hooks and browser coverage are complete.

- [ ] **Step 3: Complete fixture-visible behavior required by the browser tests**

Adjust only deterministic fixture wiring or accessible hooks demonstrated missing by the RED output. Do not add alternate production behavior.

- [ ] **Step 4: Run targeted browser tests and verify GREEN**

```bash
PLAYWRIGHT_PORT=3076 npx playwright test tests/e2e/billing.spec.ts tests/e2e/localization.spec.ts --project=chromium --grep "DEN-29"
```

Expected: all DEN-29 browser tests pass at desktop and mobile widths.

- [ ] **Step 5: Generate and inspect approved visual snapshots**

```bash
CI=1 PLAYWRIGHT_PORT=3077 npx playwright test tests/e2e/billing.visual.spec.ts --project=chromium --grep "subscription error" --update-snapshots
```

Inspect every new PNG against the prototype before accepting it. Capture the Russian Settings page at 1600×1000 and 390×1249 through the authenticated localization fixture already used by `localization.spec.ts`; do not add a production-only route.

- [ ] **Step 6: Commit browser evidence**

```bash
git add tests/e2e src/app/billing-fixture src/styles
git commit -m "test(den-29): verify account page refinements"
```

### Task 7: Full verification and delivery

**Files:**

- Modify only if verification demonstrates a DEN-29 defect.

**Interfaces:**

- Consumes: all DEN-29 commits.
- Produces: verified branch ready for GitHub, Vercel, and Linear completion.

- [ ] **Step 1: Run formatting and static checks**

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

- [ ] **Step 2: Run the complete unit/integration suite**

```bash
npm test
```

Expected: 177 test files and at least 1,633 tests pass, including all new DEN-29 tests.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

- [ ] **Step 4: Run affected Playwright suites**

```bash
PLAYWRIGHT_PORT=3078 npx playwright test tests/e2e/billing.spec.ts tests/e2e/billing.visual.spec.ts tests/e2e/localization.spec.ts --project=chromium
```

- [ ] **Step 5: Verify authenticated desktop and mobile flows in a browser**

Check Settings at 1440×900, 1024×768, and 390×844; check subscription snapshot error and payment-method-only error at the same breakpoints; repeat with reduced motion and keyboard-only operation.

- [ ] **Step 6: Review branch scope**

```bash
git status --short
git diff main...HEAD --stat
git diff main...HEAD --check
```

Confirm only DEN-29 files and the immutable prototype are included.

- [ ] **Step 7: Push, deploy, and update Linear after every verification is green**

```bash
git push -u origin denkach2211/den-29-refine-account-settings-and-subscription-error-states
```

Deploy the verified commit to Vercel Production, verify the canonical alias, comment with commit/deployment/test evidence on DEN-29, and mark it Done only after live desktop/mobile verification passes.

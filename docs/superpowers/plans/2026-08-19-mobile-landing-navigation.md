# DEN-26 Mobile Landing Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every mobile landing authentication entry point and the burger menu functional, accessible, localized, and regression-tested.

**Architecture:** Keep `HomePage` server-rendered and introduce one focused client `MobileMarketingMenu` that composes the existing Radix Dialog primitives. Keep URL continuation logic inside `LandingAnalysisForm`; expose invalid input visually and route Start Free links directly to sign-up without changing desktop layout or application navigation.

**Tech Stack:** Next.js App Router, React, TypeScript strict mode, Radix Dialog, Tailwind-era shared CSS tokens, Vitest/Testing Library, Playwright.

**Spec:** Linear DEN-26, `docs/product.md`, `docs/design-system.md`, and the approved behavior in the 2026-08-19 product conversation.

## Global Constraints

- Preserve the dark-only The Prism landing design and existing desktop composition.
- Use existing shared Dialog primitives; add no production dependency.
- Mobile menu supports touch, keyboard, focus trap/restoration, Escape, outside click, scroll lock, and `prefers-reduced-motion`.
- Minimum mobile touch target is 44×44 px and layouts must work at 320 px without horizontal overflow.
- Start Free routes to `/sign-up`; Sign in routes to `/sign-in`.
- A valid Transform video submission routes through `/sign-in?next=...`; invalid input renders a visible localized error.
- All new copy is present in Ukrainian, Russian, English, Spanish, and German.

---

### Task 1: Localized mobile-menu contract

**Files:**
- Modify: `src/lib/i18n/messages/marketing.ts`
- Modify: `src/lib/i18n/messages/marketing.test.ts`

**Interfaces:**
- Consumes: `defineMessages()` locale-shape enforcement.
- Produces: `MarketingMessages['header']` fields `menuTitle`, `menuDescription`, and `closeMenu` for `MobileMarketingMenu`.

- [ ] **Step 1: Write the failing catalog test**

Add representative assertions while the existing locale-parity test continues to require equal message paths:

```ts
expect(marketingMessages.en.header).toMatchObject({
  menuTitle: 'Menu',
  menuDescription: 'Navigate Gleen and access your account.',
  closeMenu: 'Close menu',
});
expect(marketingMessages.ru.header.closeMenu).toBe('Закрыть меню');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/lib/i18n/messages/marketing.test.ts`

Expected: FAIL because the three header fields do not exist.

- [ ] **Step 3: Add native copy to every locale**

Extend each `header` object with semantically equivalent native strings. Keep internal property names identical across all five catalogs.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run src/lib/i18n/messages/marketing.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the copy contract**

```bash
git add src/lib/i18n/messages/marketing.ts src/lib/i18n/messages/marketing.test.ts
git commit -m "feat(den-26): localize mobile landing menu"
```

---

### Task 2: Accessible mobile marketing menu

**Files:**
- Create: `src/components/marketing/mobile-marketing-menu.tsx`
- Create: `src/components/marketing/mobile-marketing-menu.test.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `readonly MarketingLink[]`, `MarketingMessages['header']`, `Dialog`, `DialogTrigger`, `DialogContent`, and `DialogClose`.
- Produces: `MobileMarketingMenu({ navigation, copy })` rendered in the header; its trigger has the existing localized `openMenu` accessible name.

- [ ] **Step 1: Write failing interaction tests**

Cover opening, navigation content, authentication links, closing after an in-page selection, Escape, and focus restoration:

```tsx
render(
  <MobileMarketingMenu
    navigation={[{ label: 'Pricing', href: '#pricing' }]}
    copy={marketingMessages.en.header}
  />,
);
const trigger = screen.getByRole('button', { name: 'Open menu' });
await user.click(trigger);
expect(screen.getByRole('dialog', { name: 'Menu' })).toBeVisible();
expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/sign-up');
await user.keyboard('{Escape}');
expect(trigger).toHaveFocus();
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `npm test -- --run src/components/marketing/mobile-marketing-menu.test.tsx`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the focused client component**

Use controlled open state so in-page links explicitly close the dialog. Compose existing primitives so Radix owns focus trapping, Escape, outside interaction, portal layering, and scroll locking:

```tsx
'use client';

export function MobileMarketingMenu({ navigation, copy }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="btn btn-icon btn-ghost mobile-only" aria-label={copy.openMenu}>
        <MenuIcon />
      </DialogTrigger>
      <DialogContent
        className="landing-mobile-menu"
        title={copy.menuTitle}
        description={copy.menuDescription}
        closeLabel={copy.closeMenu}
      >
        <nav aria-label={copy.navigationLabel}>
          {navigation.map((link) => (
            <DialogClose asChild key={link.href}>
              <a href={link.href}>{link.label}</a>
            </DialogClose>
          ))}
        </nav>
        <DialogClose asChild><a href="/sign-in">{copy.signIn}</a></DialogClose>
        <DialogClose asChild><a href="/sign-up">{copy.startFree}</a></DialogClose>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Replace the inert burger in `HomePage`**

Keep desktop navigation and locale switcher server-rendered. Replace only the current mobile-only `<button>` with:

```tsx
<MobileMarketingMenu navigation={content.navigation} copy={copy.header} />
```

Change the header Start Free link from `href="#product"` to `href="/sign-up"`.

- [ ] **Step 5: Run component and page tests**

Run: `npm test -- --run src/components/marketing/mobile-marketing-menu.test.tsx src/app/page.test.tsx`

Expected: PASS; the page test finds functional `/sign-up` and `/sign-in` links and no inert burger.

- [ ] **Step 6: Commit the interaction**

```bash
git add src/components/marketing/mobile-marketing-menu.tsx src/components/marketing/mobile-marketing-menu.test.tsx src/app/page.tsx
git commit -m "fix(den-26): activate mobile landing navigation"
```

---

### Task 3: Functional Start Free and visible Transform video validation

**Files:**
- Modify: `src/data/pricing.ts`
- Modify: `src/data/pricing.test.ts`
- Modify: `src/components/marketing/landing-analysis-form.tsx`
- Modify: `src/components/marketing/landing-analysis-form.test.tsx`
- Modify: `src/styles/landing-reference.css`

**Interfaces:**
- Consumes: existing `buildAnalysisContinuation(rawUrl)` and `MarketingPricingCard.ctaHref`.
- Produces: the Free plan CTA routes to `/sign-up`; `LandingAnalysisForm` exposes an inline `<p id="youtube-url-error">` linked through `aria-describedby`.

- [ ] **Step 1: Write failing CTA and error-visibility tests**

Replace the pricing expectation that every CTA equals `#product` with explicit truthful destinations:

```ts
expect(pricingPlans.find((plan) => plan.id === 'free')?.ctaHref).toBe('/sign-up');
```

Extend the form test:

```ts
const alert = screen.getByRole('alert');
expect(alert).toHaveClass('beam-form-error');
expect(alert).not.toHaveClass('sr-only');
expect(input).toHaveAttribute('aria-describedby', alert.id);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run src/data/pricing.test.ts src/components/marketing/landing-analysis-form.test.tsx`

Expected: FAIL because Free still points to `#product` and the error is screen-reader-only.

- [ ] **Step 3: Implement truthful destinations and visible feedback**

Set only the Free plan `ctaHref` to `/sign-up`; do not silently redefine paid checkout behavior in DEN-26. Change the error class to `beam-form-error` while retaining `role="alert"`, its stable ID, and input ARIA linkage.

Add scoped styling below the BeamInput rules:

```css
.landing-reference .beam-form-error {
  margin: 10px 8px 0;
  color: var(--artifact-summary);
  font-size: 13px;
  line-height: 1.45;
}
```

Ensure the message wraps at 320 px and does not shift the input/button alignment horizontally.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run src/data/pricing.test.ts src/components/marketing/landing-analysis-form.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit CTA and validation behavior**

```bash
git add src/data/pricing.ts src/data/pricing.test.ts src/components/marketing/landing-analysis-form.tsx src/components/marketing/landing-analysis-form.test.tsx src/styles/landing-reference.css
git commit -m "fix(den-26): expose mobile auth entry points"
```

---

### Task 4: Responsive menu styling and end-to-end regression coverage

**Files:**
- Modify: `src/styles/landing-reference.css`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `.landing-mobile-menu`, localized menu names, `/sign-up`, `/sign-in?next=...`.
- Produces: a 320–980 px menu matching The Prism design and browser coverage for every reported mobile failure.

- [ ] **Step 1: Write failing Playwright scenarios**

Add focused tests at 390×844 and 320×568:

```ts
await page.getByRole('button', { name: 'Open menu' }).click();
await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
await page.keyboard.press('Escape');
await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
```

Also verify:

- header Start Free reaches `/sign-up`;
- pricing Start Free reaches `/sign-up`;
- invalid Transform video displays a visible alert;
- valid Transform video preserves the normalized continuation;
- opening the menu locks background scroll;
- selecting Pricing closes the dialog and reaches `#pricing`;
- no horizontal overflow at 320 px;
- reduced motion removes non-essential menu transitions.

- [ ] **Step 2: Run the focused browser tests and verify RED**

Run: `npx playwright test tests/e2e/home.spec.ts tests/e2e/auth.spec.ts --project=mobile-chrome`

Expected: new menu/CTA assertions fail before final styling and integration.

- [ ] **Step 3: Add scoped responsive styles**

Style the overlay/content/navigation under `.landing-reference` or a unique portal-safe `.landing-mobile-menu` root. Use existing CSS variables, neutral surfaces, thin borders, one restrained spectral edge, 44 px links, safe-area padding, and the shared interface timing. Because dialog content is portaled, do not depend exclusively on `.landing-reference` ancestry.

Add a reduced-motion media rule that sets menu transition duration to `0.001ms` without removing state changes.

- [ ] **Step 4: Run focused component and browser tests**

Run: `npm test -- --run src/app/page.test.tsx src/components/marketing/mobile-marketing-menu.test.tsx src/components/marketing/landing-analysis-form.test.tsx src/data/pricing.test.ts`

Run: `npx playwright test tests/e2e/home.spec.ts tests/e2e/auth.spec.ts --project=mobile-chrome`

Expected: PASS.

- [ ] **Step 5: Run repository completion gates**

Run in order:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Expected: all commands exit 0. If the build rewrites `next-env.d.ts`, restore only that generated file after verifying its diff.

- [ ] **Step 6: Perform browser verification**

Verify 320×568, 390×844, 768×1024, 1440×900, and reduced-motion mode. Confirm focus order, Escape, outside click, scroll lock, visible validation, both Start Free links, valid continuation, desktop navigation unchanged, and no horizontal overflow.

- [ ] **Step 7: Commit final responsive coverage**

```bash
git add src/styles/landing-reference.css tests/e2e/home.spec.ts tests/e2e/auth.spec.ts
git commit -m "test(den-26): cover mobile landing authentication"
```

- [ ] **Step 8: Update Linear and publish only after verification**

Move DEN-26 to In Progress when implementation begins. After every completion gate and browser check passes, add a Linear comment with test evidence, push the focused branch, open or update its PR, deploy staging, verify the deployed mobile flow, and only then move DEN-26 to Done.

# Home Sign-in Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop landing-page `Sign in` action navigate to the existing `/sign-in` account-access page.

**Architecture:** Preserve the current landing-page header and authentication components. Change only the anchor destination and protect the behavior with a Playwright assertion in the existing authentication end-to-end suite.

**Tech Stack:** Next.js App Router, React, TypeScript strict mode, Playwright.

## Global Constraints

- Preserve the dark-only “The Prism” design and all existing styles.
- Do not change OAuth configuration, authentication server actions, mobile navigation, or other calls to action.
- Do not add dependencies.
- Keep the user’s unrelated `next-env.d.ts` modification untouched.

---

### Task 1: Route the landing-page sign-in action

**Files:**

- Modify: `src/app/page.tsx`
- Test: `tests/e2e/auth.spec.ts`

**Interfaces:**

- Consumes: existing Next.js `/sign-in` route and the landing-page link with accessible name `Sign in`
- Produces: a desktop header link whose `href` is `/sign-in`

- [x] **Step 1: Write the failing test**

Add this focused Playwright test to `tests/e2e/auth.spec.ts`:

```ts
test('opens account access from the landing-page sign-in action', async ({
  page,
}) => {
  await page.goto('/');

  const signIn = page.getByRole('link', { name: 'Sign in' });
  await expect(signIn).toHaveAttribute('href', '/sign-in');
  await signIn.click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole('heading', { name: 'Sign in to Gleen' }),
  ).toBeVisible();
});
```

- [x] **Step 2: Run the test and verify the regression**

Run:

```bash
PLAYWRIGHT_PORT=3018 npx playwright test tests/e2e/auth.spec.ts --project=chromium --grep "landing-page sign-in"
```

Expected: FAIL because the current link has `href="#product"`.

- [x] **Step 3: Implement the minimal fix**

In `src/app/page.tsx`, change only the link destination:

```tsx
<a className="btn btn-ghost btn-sm desktop-only" href="/sign-in">
  <span>Sign in</span>
</a>
```

- [x] **Step 4: Verify the focused behavior**

Rerun:

```bash
PLAYWRIGHT_PORT=3018 npx playwright test tests/e2e/auth.spec.ts --project=chromium --grep "landing-page sign-in"
```

Expected: PASS.

- [x] **Step 5: Run proportional regression checks**

Run:

```bash
npm run lint
npm run typecheck
PLAYWRIGHT_PORT=3018 npx playwright test tests/e2e/auth.spec.ts --project=chromium
```

Expected: lint and type checking exit successfully; the Chromium auth suite passes.

- [x] **Step 6: Verify in the browser and commit**

At desktop width, open `/`, click `Sign in`, and confirm `/sign-in` renders the `Sign in to Gleen` heading without console errors. Then commit only the two task files:

```bash
git add src/app/page.tsx tests/e2e/auth.spec.ts
git commit -m "fix(den-17): route home sign-in to account access"
```

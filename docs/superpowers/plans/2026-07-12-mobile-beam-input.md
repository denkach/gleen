# Mobile BeamInput Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the mobile link icon inside the input row and inset the mobile action button by 6px per side.

**Architecture:** Add only scoped declarations to the existing `max-width: 720px` landing-page media query. Extend the existing Playwright home-page regression test to assert computed icon and button geometry.

**Tech Stack:** Next.js, React, TypeScript, CSS, Playwright

## Global Constraints

- Do not modify `design/reference-v3/` or `design/screenshots/`.
- Do not change desktop or tablet geometry.
- Preserve button height, typography, colors, radius, hover, keyboard focus, and reduced-motion behavior.
- Add no dependencies.

---

### Task 1: Correct the mobile BeamInput geometry

**Files:**
- Modify: `tests/e2e/home.spec.ts`
- Modify: `src/styles/landing-reference.css`

**Interfaces:**
- Consumes: `.beam-form`, `.link-icon`, and `.btn` markup already rendered by `src/app/page.tsx`.
- Produces: mobile-only computed geometry at viewport widths up to 720px.

- [ ] **Step 1: Write the failing browser assertions**

Extend `aligns the BeamInput with its action on mobile` with:

```ts
const icon = form.locator('.link-icon');
await expect(icon).toHaveCSS('top', '31px');

const iconBox = await icon.boundingBox();
expect(iconBox).not.toBeNull();
expect(buttonBox?.x).toBe((inputBox?.x ?? 0) + 6);
expect(buttonBox?.width).toBe((inputBox?.width ?? 0) - 12);
```

- [ ] **Step 2: Verify the test fails for the current layout**

Run `npm run test:e2e -- --grep "aligns the BeamInput"`.

Expected: FAIL because `.link-icon` is centered against the complete form and the button has the input row's full width.

- [ ] **Step 3: Add the minimal mobile CSS**

Inside `@media (max-width: 720px)` add:

```css
.landing-reference .beam-form .link-icon {
  top: 31px;
}
.landing-reference .beam-form .btn {
  width: calc(100% - 12px);
  margin-inline: 6px;
}
```

- [ ] **Step 4: Verify the regression test and visual result**

Run:

```bash
npm run test:e2e -- --grep "aligns the BeamInput"
npx playwright screenshot --viewport-size="390,844" --wait-for-timeout=1200 http://127.0.0.1:3000/ /tmp/gleen-mobile-hero.png
```

Expected: PASS; the icon is centered inside the input row and the button is inset equally on both sides.

- [ ] **Step 5: Run repository verification**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:production
```

Expected: every command exits with status 0.

- [ ] **Step 6: Commit and publish**

```bash
git add src/styles/landing-reference.css tests/e2e/home.spec.ts docs/superpowers/plans/2026-07-12-mobile-beam-input.md
git commit -m "fix(DEN-13): refine mobile BeamInput"
git push
```

Expected: the current branch and draft pull request are updated.


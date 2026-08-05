# DEN-22 Localized Workflow Card Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep all four marketing workflow cards at the same stable visual height in Ukrainian, Russian, English, Spanish, and German.

**Architecture:** Preserve the existing translated copy and typography. Enforce a shared 200 px minimum block size on the workflow-card component and use an intrinsically sized, bottom-anchored grid whose implicit rows share one flexible track size. This propagates the tallest required card height across tablet and mobile rows without stretching the grid to fill the scene. Cards may grow above 200 px when localization or accessibility requires it; browser coverage proves equal, unclipped geometry across five locales and three responsive viewports.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Vitest, Playwright.

## Global Constraints

- Use a shared 200 px minimum; do not use a fixed height that can clip accessibility zoom.
- Treat 200 px as a minimum, not an exact outer height: all four cards must be
  equal within a locale/viewport and may grow together for unclipped localized
  copy or accessibility scaling.
- Keep the multi-row grid intrinsic and bottom-anchored; do not let fractional
  tracks consume the definite process-scene height.
- Keep current font sizes, padding, translated copy, spectral states, and motion unchanged.
- Do not add locale-specific selectors, font scaling, truncation, line clamps, or hidden overflow.
- Verify Ukrainian, Russian, English, Spanish, and German at desktop, tablet, and mobile sizes.
- Preserve dark-only The Prism styling, keyboard behavior, and reduced-motion behavior.
- Add no dependency and do not modify unrelated files.

---

### Task 1: Stable localized workflow-card geometry

**Files:**

- Modify: `src/styles/landing-reference.css:655-687`
- Modify: `src/styles/landing-reference.test.ts`
- Modify: `tests/e2e/localization.spec.ts`

**Interfaces:**

- Consumes: `.landing-reference .process-steps`, `.process-step`, the existing `panelLocales`, `viewports`, and `localeCookie` browser fixtures.
- Produces: a 200 px minimum workflow-card contract and browser evidence that every locale renders four equal-height, unclipped cards, including deterministic accessibility growth at tablet and mobile widths.

**Focused viewports:** `1440x900` desktop, `900x768` tablet (inside the
two-column breakpoint), and `390x844` mobile. Keep this set local to the
workflow-card scenario; the shared localization `viewports` fixture remains
unchanged for unrelated coverage.

- [ ] **Step 1: Add the failing CSS contract**

Append this test to `src/styles/landing-reference.test.ts`:

```ts
describe('localized workflow card geometry', () => {
  it('keeps every translated workflow card on the shared 200px rhythm', () => {
    expect(styles).toMatch(
      /\.landing-reference \.process-steps\s*\{[^}]*align-content:\s*end[^}]*align-items:\s*stretch/,
    );
    expect(styles).toMatch(
      /\.landing-reference \.process-step\s*\{[^}]*box-sizing:\s*border-box[^}]*min-height:\s*200px/,
    );
  });

  it('shares the tallest intrinsic card height across every responsive row', () => {
    const processScene = styles.match(
      /\.landing-reference \.process-scene\s*\{[^}]*\}/,
    )?.[0];
    const processSteps = styles.match(
      /\.landing-reference \.process-steps\s*\{[^}]*\}/,
    )?.[0];

    expect(processScene).toContain('display: flex');
    expect(processScene).toContain('align-items: flex-end');
    expect(processSteps).toContain('position: relative');
    expect(processSteps).toContain('width: 100%');
    expect(processSteps).toContain('grid-auto-rows: 1fr');
  });
});
```

- [ ] **Step 2: Add the failing five-language browser geometry test**

Add this scenario to `tests/e2e/localization.spec.ts` before the panel-overflow loop:

```ts
const workflowCardViewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

test('@localization workflow cards keep one height across all locales and viewports', async ({
  page,
}) => {
  for (const viewport of workflowCardViewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    for (const locale of panelLocales) {
      await page.context().addCookies([
        {
          name: localeCookie,
          value: locale.code,
          url: origin,
          sameSite: 'Lax',
        },
      ]);
      await page.goto('/#how');
      await expect(page.locator('html')).toHaveAttribute('lang', locale.bcp47);

      const metrics = await page.locator('.process-step').evaluateAll((cards) =>
        cards.map((card) => {
          const element = card as HTMLElement;
          return {
            height: element.offsetHeight,
            copyFits:
              element.scrollHeight <= element.clientHeight &&
              element.scrollWidth <= element.clientWidth,
          };
        }),
      );

      expect(metrics).toHaveLength(4);
      const heights = metrics.map(({ height }) => height);
      expect(heights).toEqual([heights[0], heights[0], heights[0], heights[0]]);
      expect(heights.every((height) => height >= 200)).toBe(true);
      expect(metrics.every(({ copyFits }) => copyFits)).toBe(true);
    }
  }
});
```

Add a second real-browser scenario at the tablet and mobile viewports. Inject
test-only enlarged paragraph typography into the first card, verify its
content-driven required height exceeds 200 px, and assert all four
`offsetHeight` values grow equally with no overflow.

- [ ] **Step 3: Run both tests and verify RED**

Run:

```bash
npm test -- --exclude='.worktrees/**' src/styles/landing-reference.test.ts
CI=1 PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/localization.spec.ts --project=chromium --grep "workflow cards"
```

Expected for the final-review regression: the Vitest contract fails because
the grid is not an intrinsic in-flow child with shared implicit row sizing; the
forced tablet browser scenario first reports `[372, 372, 200, 200]`, then
exposes scene clipping if fractional rows are added without making the grid
participate in layout.

- [ ] **Step 4: Implement the minimal shared CSS geometry**

Update only the existing declarations in `src/styles/landing-reference.css`:

```css
.landing-reference .process-scene {
  position: relative;
  display: flex;
  align-items: flex-end;
  min-height: 570px;
}

.landing-reference .process-steps {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 1fr;
  align-content: end;
  align-items: stretch;
  padding: 0 8% 80px;
  gap: 26px;
}

.landing-reference .process-step {
  position: relative;
  box-sizing: border-box;
  min-height: 200px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(17, 16, 24, 0.74);
  backdrop-filter: blur(12px);
}
```

Do not change the responsive grid columns. The 980 px breakpoint remains a two-column grid and the 720 px breakpoint remains a single-column stack.

- [ ] **Step 5: Run focused GREEN verification**

Run:

```bash
npm test -- --exclude='.worktrees/**' src/styles/landing-reference.test.ts src/lib/i18n/messages/marketing.test.ts src/data/marketing.test.ts
CI=1 PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/localization.spec.ts --project=chromium --grep "workflow cards"
```

Expected: all style/marketing tests pass; the browser scenario passes 15
locale/viewport combinations with four equal, 200 px-or-taller cards and no
clipped copy, and the forced-growth scenario passes at tablet and mobile sizes.

- [ ] **Step 6: Run repository verification**

Run:

```bash
npx prettier --write src/styles/landing-reference.css src/styles/landing-reference.test.ts tests/e2e/localization.spec.ts docs/superpowers/specs/2026-08-05-den-22-workflow-card-height-design.md docs/superpowers/plans/2026-08-05-den-22-workflow-card-height.md
npm run lint -- --ignore-pattern '.worktrees/**'
npm run typecheck
npm test -- --exclude='.worktrees/**'
git diff --check
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder npm run build
```

Expected: formatting, lint, strict type checking, all unit/integration tests, diff validation, and the 30-page production build pass. Preserve the pre-existing `next-env.d.ts` diff exactly if Next.js rewrites its generated route import.

- [ ] **Step 7: Visually inspect and commit**

Capture the workflow section in Ukrainian and English at 1440×900 and Ukrainian at 390×844. Confirm level card edges, unchanged typography and copy, no clipping, and restrained motion.

Stage only the three implementation/test paths, verify the staged list, and commit:

```bash
git add src/styles/landing-reference.css
git add src/styles/landing-reference.test.ts
git add tests/e2e/localization.spec.ts
git diff --cached --name-only
git commit -m "fix(den-22): stabilize localized workflow cards"
```

# DEN-19 History Toolbar Icon Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the complete Filters funnel and center the Filters, Sort, List, and Grid icon boxes without changing the approved History toolbar geometry.

**Architecture:** Keep the existing CSS-drawn pseudo-icons and fix their formatting context at the shared History stylesheet boundary. A focused CSS contract test protects the explicit icon boxes, while the existing History visual tests verify the rendered toolbar at approved desktop and mobile viewports.

**Tech Stack:** Next.js App Router, React, TypeScript strict mode, CSS variables, Vitest, Playwright.

## Global Constraints

- Preserve the existing toolbar structure, control dimensions, spacing, colors, states, and accessible labels.
- Do not add a dependency or replace the icons with inline SVG.
- Keep Grid disabled and List active.
- Apply the correction across desktop, tablet, and mobile breakpoints.
- Do not modify unrelated files or behavior.

---

### Task 1: Establish fixed and centered toolbar icon boxes

**Files:**

- Modify: `src/styles/history-reference.test.ts`
- Modify: `src/styles/history-reference.css`
- Test: `src/styles/history-reference.test.ts`
- Test: `tests/e2e/history.visual.spec.ts`

**Interfaces:**

- Consumes: existing selectors `.history-filters__trigger::before`, `.history-toolbar__sort::after`, and `.history-toolbar__view-button::before`.
- Produces: explicit pseudo-element boxes with `display: block` and `flex: 0 0 auto`; no public TypeScript interface changes.

- [ ] **Step 1: Write the failing CSS contract test**

Add this test to `src/styles/history-reference.test.ts`:

```ts
it('gives every toolbar pseudo-icon a fixed box for complete centered rendering', () => {
  for (const selector of [
    String.raw`\.history-filters__trigger::before`,
    String.raw`\.history-toolbar__sort::after`,
    String.raw`\.history-toolbar__view-button::before`,
  ]) {
    expect(css).toMatch(
      new RegExp(
        `${selector}\\s*{[^}]*display:\\s*block;[^}]*flex:\\s*0 0 auto;`,
      ),
    );
  }
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run:

```bash
npx vitest run src/styles/history-reference.test.ts
```

Expected: FAIL because the three pseudo-icon rules do not explicitly declare `display: block` and `flex: 0 0 auto`.

- [ ] **Step 3: Implement the minimal CSS correction**

Add the following declarations to each of the three existing pseudo-element rules in `src/styles/history-reference.css`:

```css
display: block;
flex: 0 0 auto;
```

Keep all existing widths, heights, borders, gradients, rotations, colors, and control geometry unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/styles/history-reference.test.ts src/components/history/history-toolbar.test.tsx src/components/history/history-filters.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Run static verification**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

Expected: every command exits with code 0.

- [ ] **Step 6: Verify approved History visuals**

Run:

```bash
PLAYWRIGHT_PORT=3143 npx playwright test tests/e2e/history.visual.spec.ts --project=chromium --project=mobile-chrome --workers=1
```

Expected: snapshots initially report the intentional icon-pixel difference. Inspect the actual screenshots against `design/reference-v3/` and `design/screenshots/`; update only the affected History snapshots, then rerun until all History visual tests pass.

- [ ] **Step 7: Verify the live fixture**

Start the fixture server with temporary public test configuration:

```bash
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3144 \
NEXT_PUBLIC_SUPABASE_URL=https://ci.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-publishable-key \
npm run dev -- --hostname 127.0.0.1 --port 3144
```

Open `/app-shell-fixture/history?visualCase=default` at 1680×900 and 430×932. Confirm:

- the Filters funnel has a complete outline;
- Filters, Sort, List, and Grid icon boxes are centered;
- no horizontal overflow is introduced;
- no Next.js error overlay is present.

Stop the server and restore an automatically modified `next-env.d.ts`, if present.

- [ ] **Step 8: Commit**

```bash
git add src/styles/history-reference.css src/styles/history-reference.test.ts tests/e2e/history.visual.spec.ts-snapshots
git commit -m "fix(den-19): align history toolbar icons"
```

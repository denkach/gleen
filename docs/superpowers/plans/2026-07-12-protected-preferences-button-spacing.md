# Protected Preferences Button Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 24px of vertical separation above the **Review preferences** link on the protected-session confirmation page.

**Architecture:** Give the link a page-specific class and style that class in the shared stylesheet with the existing `--space-6` token. Verify both sides of the contract—the page uses the class and the class maps to the approved token—without changing shared button behavior.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS variables, Vitest.

## Global Constraints

- Do not change the shared `.ui-button` styles.
- Do not change typography, color, size, hover, focus, layout, or approved reference screens.
- Use `var(--space-6)`, which equals 24px, instead of a one-off value.
- Preserve the same spacing across desktop and mobile.

---

### Task 1: Add protected-page button spacing

**Files:**

- Modify: `src/app/protected/page.tsx`
- Modify: `src/app/globals.css`
- Test: `src/styles/tokens.test.ts`

**Interfaces:**

- Consumes: the existing `.ui-button` class and `--space-6` spacing token.
- Produces: the page-specific `.protected-preferences-link` styling hook.

- [ ] **Step 1: Write the failing test**

Append this test inside the existing suite in `src/styles/tokens.test.ts`:

```ts
it('adds tokenized separation above the protected preferences link', () => {
  const page = readFileSync(
    new URL('../app/protected/page.tsx', import.meta.url),
    'utf8',
  );

  expect(page).toContain('ui-button protected-preferences-link');
  expect(css).toMatch(
    /\.protected-preferences-link\s*{[\s\S]*?margin-block-start:\s*var\(--space-6\)/,
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/styles/tokens.test.ts
```

Expected: FAIL because `protected-preferences-link` is absent from the page and stylesheet.

- [ ] **Step 3: Add the page-specific class**

Change the link in `src/app/protected/page.tsx` to:

```tsx
<Link className="ui-button protected-preferences-link" href="/onboarding">
  Review preferences
</Link>
```

- [ ] **Step 4: Add tokenized logical spacing**

Add after the base `.ui-button` rule in `src/app/globals.css`:

```css
.protected-preferences-link {
  margin-block-start: var(--space-6);
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
npm test -- src/styles/tokens.test.ts
```

Expected: all tests in `src/styles/tokens.test.ts` pass.

- [ ] **Step 6: Run repository verification**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: every command exits with code 0; the complete Vitest suite has zero failures and the Next.js production build succeeds.

- [ ] **Step 7: Verify the rendered page**

Open `http://localhost:3000/protected` in an authenticated browser at desktop and mobile widths. Confirm the computed `margin-block-start` of `.protected-preferences-link` is `24px`, the button remains keyboard-focusable, and no other `.ui-button` receives this margin.

- [ ] **Step 8: Commit the implementation**

```bash
git add src/app/protected/page.tsx src/app/globals.css src/styles/tokens.test.ts
git commit -m "fix(DEN-14): space protected preferences button"
```

# DEN-121 CI Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a green Playwright CI gate without changing approved Gleen product behavior or visual geometry.

**Architecture:** Regenerate only the six verified stale billing snapshots, let the language-panel screenshot inherit the repository's existing Ubuntu/macOS rasterization tolerance, and defer locale server synchronization until after the controlled modal has fully closed. The locale cookie, document language, and visible selection remain immediate; locale persistence uses a plain route-handler response after the Radix accessibility cleanup boundary instead of applying a React Server Component payload while the modal is closing.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Playwright Chromium.

**Spec:** Linear DEN-121; `docs/product.md`; `docs/design-system.md`; `docs/architecture.md`; `docs/roadmap.md`.

## Global Constraints

- Preserve the dark-only “The Prism” design language and approved screen geometry.
- Do not change plans, prices, limits, languages, or currencies.
- Keep exact desktop/mobile geometry assertions and reduced-motion coverage.
- Do not hide real console errors or hydration failures in the shared Playwright fixture.
- Update only snapshots whose rendered state was inspected and approved as the current implementation.

---

### Task 1: Make locale verification deterministic

**Files:**

- Modify: `tests/e2e/localization.spec.ts`
- Add: `src/app/api/interface-locale/route.ts`
- Add: `src/lib/i18n/browser-actions.ts`
- Modify: `src/components/i18n/language-panel.tsx`
- Modify: `src/components/i18n/locale-switcher.tsx`
- Modify: `src/components/i18n/locale-switcher.test.tsx`
- Test: `tests/e2e/localization.spec.ts`

**Interfaces:**

- Consumes: the shared Playwright `expect.toHaveScreenshot` CI tolerance from `playwright.config.ts` and the accessible language dialog lifecycle.
- Produces: localization tests that retain exact geometry assertions, tolerate only cross-platform font rasterization, and locale updates that never apply a server payload while the modal is closing.

- [x] **Step 1: Preserve the failing CI evidence**

Use GitHub Actions run `32367738397` as RED evidence: the desktop panel differs by 3,814 text-edge pixels on Ubuntu and localization reloads intermittently report Radix `aria-hidden` hydration mismatches.

- [x] **Step 2: Remove local screenshot tolerance overrides**

Delete `maxDiffPixelRatio: 0.001` and `threshold: 0.1` from both language-panel screenshot assertions so they inherit `playwright.config.ts`: strict local review and the documented `0.025` Ubuntu CI rasterization allowance.

- [x] **Step 3: Defer server synchronization until after modal close**

Keep the optimistic locale, document language, and cookie write immediate. Record the pending locale commit and invoke `setInterfaceLocale` only from the dialog's completed close lifecycle, after a macrotask gives Radix time to remove its accessibility markers. Cover the ordering with a unit test. In the settings flow, also assert that the dialog and Radix `aria-hidden` marker are gone before clearing the guest cookie and calling `page.reload()`.

- [x] **Step 4: Verify the targeted localization tests**

Run:

```bash
PLAYWRIGHT_PORT=3063 npx playwright test tests/e2e/localization.spec.ts --project=chromium --workers=1 --grep "Deutsch has no horizontal overflow at tablet|open panel matches approved desktop and mobile geometry"
```

Expected: both tests pass with no unexpected console or page errors.

### Task 2: Refresh the six stale billing baselines

**Files:**

- Modify: `tests/e2e/billing.visual.spec.ts-snapshots/den-20-412x839-pixel7-subscription-active-chromium.png`
- Modify: `tests/e2e/billing.visual.spec.ts-snapshots/den-20-412x839-pixel7-limit-reached-limit-reached-chromium.png`
- Modify: `tests/e2e/billing.visual.spec.ts-snapshots/den-20-412x839-pixel7-usage-empty-usage-chromium.png`
- Modify: `tests/e2e/billing.visual.spec.ts-snapshots/den-20-1440x900-desktop-invoices-failed-invoice-chromium.png`
- Modify: `tests/e2e/billing.visual.spec.ts-snapshots/den-20-412x839-pixel7-invoices-failed-invoice-chromium.png`
- Modify: `tests/e2e/billing.visual.spec.ts-snapshots/den-20-1440x900-desktop-limit-reached-limit-reached-chromium.png`
- Test: `tests/e2e/billing.visual.spec.ts`

**Interfaces:**

- Consumes: deterministic billing fixtures fixed at `2025-07-29T00:00:00.000Z` and current application-shell mobile navigation.
- Produces: approved baselines showing the current globe control and active mobile navigation state.

- [x] **Step 1: Keep the current failures as RED evidence**

The CI run preserves the two over-tolerance failures; the strict local full-suite run additionally identifies four under-CI-tolerance stale baselines.

- [x] **Step 2: Regenerate only the six stale snapshots found by CI and the strict local full-suite gate**

Run only the six identified tests with `--update-snapshots`; do not regenerate unrelated billing snapshots.

- [x] **Step 3: Inspect generated images**

Confirm the updated images preserve the approved dark UI, fixed fixture dates, readable content, globe control, and correct active mobile navigation state.

- [x] **Step 4: Verify the targeted billing tests**

Run the complete billing visual file without `--update-snapshots` and expect 12 passed, 0 failed.

### Task 3: Run repository gates and browser verification

**Files:**

- Verify final source, test, plan, and snapshot changes.

**Interfaces:**

- Consumes: Tasks 1–2.
- Produces: evidence suitable for marking DEN-121 complete and publishing the branch.

- [x] **Step 1: Run static and unit gates**

Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm audit --audit-level=moderate`, and `npm run build`.

- [x] **Step 2: Run the full Playwright suite**

Run one-worker Chromium and mobile projects through `npm run test:e2e`; expect no failed or flaky tests beyond the explicitly skipped cross-project baseline owner.

- [x] **Step 3: Verify browser behavior**

Check desktop and 390×844 mobile layouts, open/close the language panel, switch locale, and emulate `prefers-reduced-motion: reduce`; confirm no framework overlay, console error, horizontal overflow, or focus escape.

- [x] **Step 4: Review scope**

Confirm only DEN-121 implementation, test, generated Next.js contract, plan, and verified snapshot files changed.

- [ ] **Step 5: Commit after explicit authorization**

Commit with `test(den-121): stabilize Playwright CI` only after the user explicitly authorizes the commit.

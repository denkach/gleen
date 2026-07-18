# DEN-24 Spectral Rail Exit Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Spectral Rail a readable four-second production sequence and a visible completion-to-result handoff.

**Architecture:** Keep the server action as the source of truth and use a small client-only visual timeline around it. Add an `exiting` flag only after completion is visible, style that flag on the existing shell, and navigate after the exit animation completes.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, CSS, Vitest, Testing Library, Playwright.

## Global Constraints

- Normal motion: approximately 3 seconds processing, 400 milliseconds completion copy, and 600 milliseconds exit transition.
- Do not fabricate granular backend stages.
- Preserve the four fixed amber, purple, cyan, and lime Spectral Rails.
- Keep “Your artifacts are ready” and “Opening the result workspace”.
- Reduced motion navigates immediately when the result is available.
- Errors and unmounts cancel all visual timers.
- Add no dependencies.

---

### Task 1: Production visual timeline

**Files:**
- Modify: `src/components/app-shell/new-analysis-form.tsx`
- Test: `src/components/app-shell/new-analysis-form.test.tsx`

**Interfaces:**
- Consumes: `AnalysisVisualState` and the server action's `redirectTo` result.
- Produces: `isExiting: boolean` passed to `AnalyzeProcessingVisual`.

- [ ] **Step 1: Write the failing timeline test**

Update the existing navigation timing test so an action resolving at 250ms remains in `submitting` until 3000ms, displays `complete` until 3400ms, sets the visual's `data-analysis-exiting="true"` from 3400ms through 4000ms, and calls `router.push` only at 4000ms.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/app-shell/new-analysis-form.test.tsx`

Expected: FAIL because completion currently begins at 1200ms and no exiting state exists.

- [ ] **Step 3: Implement the minimal timeline**

Use exact constants:

```ts
const processingMinimumDuration = 3_000;
const completionCopyDuration = 400;
const exitTransitionDuration = 600;
```

When `redirectTo` arrives, schedule completion at the remaining processing minimum, `isExiting = true` 400ms later, and navigation 600ms after that. Reset `isExiting` on a new submission, error, retry, and timer cleanup. Preserve the immediate reduced-motion route.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/components/app-shell/new-analysis-form.test.tsx`

Expected: all form tests PASS.

### Task 2: Restrained exit treatment

**Files:**
- Modify: `src/components/app-shell/analyze-processing-visual.tsx`
- Modify: `src/styles/app-shell-reference.css`
- Test: `src/components/app-shell/analyze-processing-visual.test.tsx`

**Interfaces:**
- Consumes: `isExiting?: boolean` from `NewAnalysisForm`.
- Produces: `data-analysis-exiting="true"` and `.analyze-shell.exiting` for styling and browser verification.

- [ ] **Step 1: Write the failing visual contract test**

Render a complete visual with `isExiting` and assert the data attribute and `exiting` shell class. Assert CSS contains an exiting rule that fades and slightly scales the processing panel over 600ms, while the reduced-motion block removes that transition.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/app-shell/analyze-processing-visual.test.tsx`

Expected: FAIL because the prop, attribute, class, and CSS contract do not exist.

- [ ] **Step 3: Implement the visual state**

Add `isExiting?: boolean` to the component props, expose the data attribute, append `exiting` to the shell class, and apply a restrained opacity/transform fade to the existing panel. Keep the completion wipe visible during exit. Do not add a new overlay or object.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/components/app-shell/analyze-processing-visual.test.tsx`

Expected: all visual tests PASS.

### Task 3: End-to-end verification

**Files:**
- Modify: `tests/e2e/analyze-processing.spec.ts`

**Interfaces:**
- Consumes: `data-analysis-state` and `data-analysis-exiting` browser contracts.
- Produces: regression coverage for the completion-to-result handoff.

- [ ] **Step 1: Add the browser assertion**

In the production flow, assert that completion copy becomes visible, the exiting attribute becomes true before the URL changes, and navigation follows. Keep the reduced-motion assertion that navigation has no decorative minimum.

- [ ] **Step 2: Run required verification**

Run formatting, lint, type checking, all Vitest tests, the webpack production build, and the isolated Playwright DEN-16/DEN-24 suites.

Expected: formatting clean; lint and typecheck exit 0; 336+ unit/integration tests pass; build succeeds; all analyze-processing and intake browser tests pass.

- [ ] **Step 3: Commit implementation**

```bash
git add src/components/app-shell/new-analysis-form.tsx src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/analyze-processing-visual.tsx src/components/app-shell/analyze-processing-visual.test.tsx src/styles/app-shell-reference.css tests/e2e/analyze-processing.spec.ts
git commit -m "feat(DEN-24): add spectral rail result transition"
```

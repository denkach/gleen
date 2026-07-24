# DEN-24 Spectral Rail Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the concept gallery into the standalone, state-complete Spectral Rail prototype approved in DEN-24.

**Architecture:** Keep the deliverable self-contained in one HTML file, with semantic DOM states driven by one `AnalysisState` string and a single `renderState` function. Use CSS classes and data attributes for visual transitions; timers exist only in the standalone demo sequence.

**Tech Stack:** Semantic HTML, CSS custom properties and media queries, vanilla JavaScript, Vitest static-contract tests, Playwright/browser verification.

## Global Constraints

- Preserve the existing New Analysis screen composition and dark-only Gleen design language.
- Implement only Spectral Rail; no prism, triangle, 3D scene, concept tabs, or alternative concepts.
- Use Summary amber `#FFB454`, Flashcards purple `#C77DFF`, Timestamps cyan `#5BE9E9`, and Export lime `#A8E063` as restrained accents.
- Show real processing stage names and no fabricated percentage.
- Support desktop, mobile, keyboard activation, recoverable error, and `prefers-reduced-motion`.
- Add no dependencies.

---

### Task 1: Lock the standalone prototype contract

**Files:**

- Create: `src/lib/spectral-prototype.test.ts`
- Test: `design/prototypes/spectral/index.html`

**Interfaces:**

- Consumes: the standalone prototype file as UTF-8 text.
- Produces: regression assertions for required state names, labels, controls, accessibility hooks, and forbidden concepts.

- [ ] **Step 1: Write the failing static-contract test**

Create a Vitest test that reads `design/prototypes/spectral/index.html` and asserts the eight `AnalysisState` values, the four backend stages, all four artifact labels/colors, `aria-live`, editable URL input, `Try again`, completion copy, reduced-motion media query, and absence of `Optical Scan`, `Knowledge Pulse`, `<nav class="tabs">`, and percentage copy.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/spectral-prototype.test.ts`

Expected: FAIL because the current concept gallery lacks the complete state and recovery contract.

- [ ] **Step 3: Commit the contract test**

```bash
git add src/lib/spectral-prototype.test.ts
git commit -m "test(DEN-24): define spectral rail prototype contract"
```

### Task 2: Build the exact Spectral Rail interaction

**Files:**

- Modify: `design/prototypes/spectral/index.html`
- Test: `src/lib/spectral-prototype.test.ts`

**Interfaces:**

- Consumes: `AnalysisState = 'idle' | 'submitting' | 'validating' | 'transcript' | 'structuring' | 'artifacts' | 'complete' | 'error'`.
- Produces: `setAnalysisState(nextState)` and `runAnalysis()` demo behavior; stable DOM hooks `#analysis-card`, `#url-input`, `#analyze-button`, `#try-again`, `#preview-error`, and `[data-stage]`.

- [ ] **Step 1: Replace the gallery with the standalone idle composition**

Keep the approved hero headline, URL input card, Analyze video button, and advanced-options line. Remove gallery header, tabs, alternative concepts, and comparison metadata.

- [ ] **Step 2: Add state-driven processing markup and CSS**

Add the two-column processing workspace, four real stages, safe-to-leave message, white master rail, and four semantic colored rails. Add desktop, tablet, mobile, focus-visible, error, completion, and reduced-motion rules.

- [ ] **Step 3: Add the demo state machine**

Implement one `analysisState` variable and `setAnalysisState(nextState)` renderer. `runAnalysis()` immediately disables submission, sequences photon/card/rail activation, advances real stages, holds completion for 600 ms, and returns to a stable completion preview. `previewError()` restores the editable URL with coral error edge and `Try again`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/lib/spectral-prototype.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the standalone prototype**

```bash
git add design/prototypes/spectral/index.html src/lib/spectral-prototype.test.ts
git commit -m "feat(DEN-24): complete spectral rail prototype"
```

### Task 3: Verify quality and visual states

**Files:**

- Modify only if verification finds an issue: `design/prototypes/spectral/index.html`

**Interfaces:**

- Consumes: completed standalone prototype.
- Produces: verified desktop, mobile, reduced-motion, keyboard, processing, completion, and error states.

- [ ] **Step 1: Run repository verification**

Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

Expected: every command exits 0.

- [ ] **Step 2: Serve and verify the prototype in Chromium**

Run `python3 -m http.server 4173` from the repository root. Open `/design/prototypes/spectral/` at desktop and 390×844 mobile widths. Verify idle, processing, completion, error, keyboard activation, no console errors, and no horizontal overflow.

- [ ] **Step 3: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce`; confirm photon travel, rail extension, breathing, and wipe are absent while state changes and stage meaning remain visible.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors and no unrelated tracked files modified.

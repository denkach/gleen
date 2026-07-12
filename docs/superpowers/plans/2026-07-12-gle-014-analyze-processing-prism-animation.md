# GLE-014 Analyze-to-Processing Prism Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the approved analyze-processing prototype into the authenticated New Analysis flow without redesign, while keeping production animation driven only by real DEN-16 state and isolating the full fake sequence to development fixtures.

**Architecture:** A pure state-mapping module translates `AnalysisVisualState` into stage presentation without timers. A controlled React visual reproduces the prototype exactly and receives selected artifacts, URL, and safe error state; the production form maps its real Server Action lifecycle to coarse visual states, while a separately guarded fixture driver owns the complete timed demo sequence.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, CSS variables and keyframes, existing application tokens, Vitest/Testing Library, Playwright. No new production dependency and no GSAP in the authenticated processing interaction.

## Global Constraints

- DEN-24 is part of the active DEN-16 branch, but remains a focused visual issue recorded separately in Linear.
- `design/prototypes/analyze-processing/index.html` is the exact visual source. Add it to the branch unchanged and never redesign it.
- `design/reference-v3/`, `design/screenshots/`, and `/Users/niga/Downloads/gleen-motion-prototype-v2/` remain read-only.
- Preserve the existing New Analysis page, headline, surrounding dashboard panels, shell navigation, and approved input composition.
- Production must never advance `validating`, `transcript`, `structuring`, `artifacts`, or `complete` using independent timers.
- The full fake sequence is allowed only in a development-only fixture and automated visual tests, and must return 404 in production.
- Production DEN-16 maps only real lifecycle: `idle → submitting → readiness navigation | error`.
- Only selected artifacts render rays and labels. Flashcards render only when selected; Transcript replaces Export; Export never renders.
- The opening narrative is approximately 1.8 seconds maximum on desktop; errors interrupt it immediately; reduced motion adds no navigation delay.
- Do not claim that generated artifacts are complete in production DEN-16; success still navigates to the truthful readiness page.
- Use transforms, opacity, and filter where possible; application motion remains restrained and functional.
- Support 1440×900, 1024×768, 980×768, and 390×844, keyboard activation, 44px touch targets, no overflow, and `prefers-reduced-motion`.
- Do not add dependencies, backend processing, usage writes, billing, or result-workspace behavior.
- Follow strict red-green-refactor TDD and end each task in a focused Conventional Commit.

## File map

- `design/prototypes/analyze-processing/index.html`: exact user-supplied read-only source copied unchanged from the main checkout.
- `src/lib/analyze-processing/analysis-visual-state.ts`: state union, ordered stages, copy, and pure state-to-presentation mapping.
- `src/components/app-shell/analyze-processing-visual.tsx`: controlled React port of the prototype composition.
- `src/components/app-shell/analyze-processing-fixture.tsx`: development-only timed state driver and replay/error controls.
- `src/components/app-shell/new-analysis-form.tsx`: production coarse-state integration, URL/config preservation, retry, and success delay cap.
- `src/app/analyze-processing-fixture/page.tsx`: guarded visual-demo route.
- `src/styles/app-shell-reference.css`: tokenized exact prototype geometry, motion, mobile, and reduced-motion rules.
- `tests/e2e/analyze-processing.spec.ts`: production integration plus fixture visual/state/responsive/accessibility coverage.
- `tests/e2e/ui-production.spec.ts`: fixture route production exclusion.

---

### Task 1: Preserve the Prototype and Define the Timer-Free Visual State Contract

**Files:**
- Create with `apply_patch`: `design/prototypes/analyze-processing/index.html`
- Create: `src/lib/analyze-processing/analysis-visual-state.ts`
- Create: `src/lib/analyze-processing/analysis-visual-state.test.ts`

**Interfaces:**
- Produces: `AnalysisVisualState`, `AnalysisStage`, `AnalysisVisualPresentation`, `getAnalysisVisualPresentation(state)`.
- Produces: `artifactRayDefinitions` keyed by DEN-16 `Artifact` identifiers.

- [ ] **Step 1: Copy the approved prototype byte-for-byte**

Read `/Users/niga/Downloads/gleen/design/prototypes/analyze-processing/index.html`
completely, use `apply_patch` to add its contents verbatim at the same
repository-relative path in the worktree, then verify byte identity:

```bash
cmp /Users/niga/Downloads/gleen/design/prototypes/analyze-processing/index.html \
  design/prototypes/analyze-processing/index.html
```

Expected: exit 0 and no output. Do not format or edit this file.

- [ ] **Step 2: Write failing state-mapping tests**

```ts
import { describe, expect, test } from 'vitest';
import {
  getAnalysisVisualPresentation,
  orderedAnalysisStages,
} from './analysis-visual-state';

describe('getAnalysisVisualPresentation', () => {
  test('keeps production submitting honest and does not fabricate completed stages', () => {
    expect(getAnalysisVisualPresentation('submitting')).toEqual({
      mode: 'processing',
      title: 'Analyzing your video',
      subtitle: 'Checking video and transcript…',
      activeStage: null,
      completedStages: [],
    });
  });

  test.each([
    ['validating', 'validating', []],
    ['transcript', 'transcript', ['validating']],
    ['structuring', 'structuring', ['validating', 'transcript']],
    ['artifacts', 'artifacts', ['validating', 'transcript', 'structuring']],
  ] as const)('maps %s only from an application-provided state', (state, activeStage, completedStages) => {
    expect(getAnalysisVisualPresentation(state)).toMatchObject({
      activeStage,
      completedStages,
    });
  });

  test('uses the approved ordered stage labels', () => {
    expect(orderedAnalysisStages.map((stage) => stage.label)).toEqual([
      'Validating video',
      'Finding transcript',
      'Structuring key ideas',
      'Creating knowledge artifacts',
    ]);
  });
});
```

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- src/lib/analyze-processing/analysis-visual-state.test.ts`

Expected: FAIL because the state module does not exist.

- [ ] **Step 4: Implement the pure contract without timers or React**

```ts
export type AnalysisVisualState =
  | 'idle' | 'submitting' | 'validating' | 'transcript'
  | 'structuring' | 'artifacts' | 'complete' | 'error';
export type AnalysisStageId = 'validating' | 'transcript' | 'structuring' | 'artifacts';
export type AnalysisStage = Readonly<{ id: AnalysisStageId; label: string }>;
export type AnalysisVisualPresentation = Readonly<{
  mode: 'idle' | 'processing' | 'complete' | 'error';
  title: string;
  subtitle: string;
  activeStage: AnalysisStageId | null;
  completedStages: readonly AnalysisStageId[];
}>;

export const orderedAnalysisStages: readonly AnalysisStage[] = [
  { id: 'validating', label: 'Validating video' },
  { id: 'transcript', label: 'Finding transcript' },
  { id: 'structuring', label: 'Structuring key ideas' },
  { id: 'artifacts', label: 'Creating knowledge artifacts' },
];
```

Implement `getAnalysisVisualPresentation` as an exhaustive switch. It must contain no `setTimeout`, clock, promise, environment check, or mutable state.

- [ ] **Step 5: Run state tests and commit**

Run: `npm test -- src/lib/analyze-processing/analysis-visual-state.test.ts`

Expected: PASS.

```bash
git add design/prototypes/analyze-processing/index.html src/lib/analyze-processing
git commit -m "feat(DEN-24): define processing visual states"
```

### Task 2: Controlled React Port of the Exact Processing Composition

**Files:**
- Create: `src/components/app-shell/analyze-processing-visual.tsx`
- Create: `src/components/app-shell/analyze-processing-visual.test.tsx`
- Modify: `src/styles/app-shell-reference.css`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 `AnalysisVisualState`, `getAnalysisVisualPresentation`, and DEN-16 `Artifact`.
- Produces: `AnalyzeProcessingVisual(props)` with no timer ownership.

- [ ] **Step 1: Write failing controlled-visual tests**

```tsx
render(
  <AnalyzeProcessingVisual
    state="transcript"
    selectedArtifacts={['summary', 'timestamps', 'transcript']}
    submittedUrl="https://youtu.be/dQw4w9WgXcQ"
  />,
);
expect(screen.getByText('Finding transcript')).toHaveAttribute('data-stage-state', 'active');
expect(screen.getByText('Validating video')).toHaveAttribute('data-stage-state', 'done');
expect(screen.getByText('SUMMARY')).toBeInTheDocument();
expect(screen.getByText('TIMESTAMPS')).toBeInTheDocument();
expect(screen.getByText('TRANSCRIPT')).toBeInTheDocument();
expect(screen.queryByText('FLASHCARDS')).not.toBeInTheDocument();
expect(screen.queryByText('EXPORT')).not.toBeInTheDocument();
```

Add cases proving decorative photon/prism/rays are `aria-hidden`, error copy and **Try again** are accessible, and rerendering from one state to another changes presentation without waiting for a timer.

- [ ] **Step 2: Run component tests and verify RED**

Run: `npm test -- src/components/app-shell/analyze-processing-visual.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Port the prototype DOM into a controlled component**

Use the exact structural classes from the prototype under an application-scoped root:

```tsx
export type AnalyzeProcessingVisualProps = Readonly<{
  state: AnalysisVisualState;
  selectedArtifacts: readonly Artifact[];
  submittedUrl: string;
  errorMessage?: string;
  onRetry?: () => void;
}>;

export function AnalyzeProcessingVisual(props: AnalyzeProcessingVisualProps) {
  const presentation = getAnalysisVisualPresentation(props.state);
  return (
    <div className={`analyze-shell ${presentation.mode}`} data-analysis-state={props.state}>
      <div className="analyze-photon" aria-hidden="true" />
      <div className="analyze-shell-flash" aria-hidden="true" />
      <div className="analyze-processing-panel">
        <div className="analyze-status-copy">{/* controlled copy and stages */}</div>
        <div className="analyze-optic" aria-hidden="true">{/* exact beam, prism, rays */}</div>
      </div>
    </div>
  );
}
```

Artifact ray definitions are data, not nth-child assumptions. Render only selected artifacts; use token classes `summary`, `flashcards`, `timestamps`, and neutral `transcript`. Never render Export.

- [ ] **Step 4: Port exact tokenized styles without changing the reference**

Scope prototype selectors under `.analysis-visual`. Map raw colors to existing variables (`--background-deep`, `--surface-panel`, `--text-primary`, artifact tokens, borders, and easing). Add only missing semantic optical tokens to `globals.css`; component selectors contain no new literal artifact hex or arbitrary `rgba()` values.

Preserve exact shell heights, radii, grid proportions, photon/flash timings, prism geometry, beam/ray spread, stage spacing, mobile breakpoint, and reduced-motion behavior from the prototype. Do not apply the prototype page background, wrapper, or headline styles to the existing app shell.

- [ ] **Step 5: Add CSS contract assertions and commit**

Assert the processing shell reference values, selected-artifact class mapping, 900px mobile stack, and reduced-motion removal of photon/flash/breath/trace.

Run: `npm test -- src/components/app-shell/analyze-processing-visual.test.tsx src/components/app-shell/new-analysis-home.test.tsx`

Expected: PASS.

```bash
git add src/components/app-shell/analyze-processing-visual* src/styles/app-shell-reference.css src/app/globals.css
git commit -m "feat(DEN-24): port approved processing prism visual"
```

### Task 3: Integrate Real DEN-16 Submission, Error, and Readiness Navigation

**Files:**
- Modify: `src/components/app-shell/new-analysis-form.tsx`
- Modify: `src/components/app-shell/new-analysis-form.test.tsx`
- Modify: `src/styles/app-shell-reference.css`

**Interfaces:**
- Consumes: Task 2 controlled visual and existing `useActionState` pending/error/redirect state.
- Produces: production mapping `idle → submitting → navigation | error`, retry, and opening-transition cap.

- [ ] **Step 1: Write failing production integration tests**

Add tests proving:

```tsx
expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute('data-analysis-state', 'submitting');
expect(screen.getByRole('status')).toHaveTextContent('Checking video and transcript…');
expect(screen.queryByText('Structuring key ideas')?.closest('[data-stage-state="done"]')).toBeNull();
```

Resolve the action with an error and assert the typed URL, configuration, safe message, and **Try again** remain. Resolve with `redirectTo` and use fake timers only to test the bounded opening-transition delay; assert navigation occurs no later than 1.8 seconds from submit. Under mocked reduced motion, navigation must occur immediately.

- [ ] **Step 2: Run form tests and verify RED**

Run: `npm test -- src/components/app-shell/new-analysis-form.test.tsx`

Expected: FAIL because the form does not render the controlled processing visual.

- [ ] **Step 3: Integrate without changing Server Action semantics**

Keep the actual form controls mounted for state/configuration preservation. During pending, render `AnalyzeProcessingVisual state="submitting"`; on action error render `state="error"` with the mapped safe message and retry handler. Do not assign granular production states and do not introduce stage timers.

Store submission start time only to enforce the maximum opening narrative before success navigation. This clock may delay navigation for the remaining decorative opening duration; it must never change an analysis stage. Cancel navigation timeouts on unmount or replacement state. Detect reduced motion with `matchMedia('(prefers-reduced-motion: reduce)')` and skip decorative delay.

- [ ] **Step 4: Preserve exact idle and responsive geometry**

Idle still renders the approved `.beam-form.app-beam-form`. The processing visual replaces only the beam-card region and does not move the headline or dashboard panels horizontally. Advanced options become visually subdued during pending but remain non-destructive; prevent changes while the action is pending.

- [ ] **Step 5: Run integration and regression tests, then commit**

Run:

```bash
npm test -- src/components/app-shell/new-analysis-form.test.tsx \
  src/components/app-shell/new-analysis-home.test.tsx \
  src/app/app-shell-fixture/page.test.tsx
```

Expected: PASS.

```bash
git add src/components/app-shell/new-analysis-form* src/styles/app-shell-reference.css
git commit -m "feat(DEN-24): connect prism motion to intake state"
```

### Task 4: Development-Only Full State Driver and Production Isolation

**Files:**
- Create: `src/components/app-shell/analyze-processing-fixture.tsx`
- Create: `src/components/app-shell/analyze-processing-fixture.test.tsx`
- Create: `src/app/analyze-processing-fixture/page.tsx`
- Create: `src/app/analyze-processing-fixture/page.test.tsx`
- Modify: `src/lib/ui-preview.ts`
- Modify: `tests/e2e/ui-production.spec.ts`

**Interfaces:**
- Consumes: Task 2 controlled visual.
- Produces: a fixture-only timer driver that cycles every visual state and is unavailable in production.

- [ ] **Step 1: Write failing fixture sequence and guard tests**

Use fake timers to assert only the fixture driver advances:

```ts
expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute('data-analysis-state', 'idle');
await user.click(screen.getByRole('button', { name: 'Analyze video' }));
expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute('data-analysis-state', 'submitting');
await vi.advanceTimersByTimeAsync(850);
expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute('data-analysis-state', 'validating');
```

Continue through transcript, structuring, artifacts, and complete using the prototype timings. Test replay, error preview, retry, cleanup on unmount, and selected-artifact variation.

Test the page calls `notFound()` whenever `isUiPreviewEnabled` is false.

- [ ] **Step 2: Run fixture tests and verify RED**

Run: `npm test -- src/components/app-shell/analyze-processing-fixture.test.tsx src/app/analyze-processing-fixture/page.test.tsx`

Expected: FAIL because fixture files do not exist.

- [ ] **Step 3: Implement the isolated timer driver**

The fixture component owns the exact prototype timeout schedule, clears every timer on replay/error/unmount, and passes each state into the controlled visual. It contains obvious fixture/demo copy and is imported only by the guarded fixture route. No production form imports it.

- [ ] **Step 4: Add production route exclusion**

Add `/analyze-processing-fixture` to `ui-production.spec.ts` and assert exact 404 in the production server. Add a static import contract test proving `new-analysis-form.tsx` does not import `analyze-processing-fixture`.

- [ ] **Step 5: Run fixture/production guard tests and commit**

Run:

```bash
npm test -- src/components/app-shell/analyze-processing-fixture.test.tsx \
  src/app/analyze-processing-fixture/page.test.tsx
```

Expected: PASS.

```bash
git add src/components/app-shell/analyze-processing-fixture* \
  src/app/analyze-processing-fixture src/lib/ui-preview.ts tests/e2e/ui-production.spec.ts
git commit -m "test(DEN-24): add isolated processing motion fixture"
```

### Task 5: Browser Verification Against the Prototype

**Files:**
- Create: `tests/e2e/analyze-processing.spec.ts`
- Modify: `tests/e2e/intake.spec.ts`
- Modify: `tests/e2e/ui-production.spec.ts`

**Interfaces:**
- Consumes: complete production integration and dev fixture.
- Produces: full visual, responsive, accessibility, performance-proxy, and production-isolation evidence.

- [ ] **Step 1: Write failing opening-sequence browser assertions**

Verify fixture click immediately disables repeat submission; photon/flash launch, input row transitions, shell reaches processing geometry, compact prism and only selected rays appear, and the initial narrative settles within approximately 1.8 seconds. Use state/class/geometry assertions rather than screenshot-only evidence.

- [ ] **Step 2: Add state, error, and production integration stories**

Exercise every fixture state and assert stage text instead of percentage. Preview a recoverable error, verify URL preservation and **Try again**, then replay. In the real intake fixture, assert only coarse submitting state is used and readiness navigation retains truthful copy.

- [ ] **Step 3: Add exact responsive, touch, and reduced-motion stories**

At 1440×900, 1024×768, 980×768, and 390×844 assert shell geometry, no horizontal overflow, stage readability, correct two-column/single-column switch, fixed-nav clearance, and selected-artifact visibility. With touch, measure every action at least 44px. With reduced motion, assert photon/flash are hidden, breath/ray/trace animations are none, state text remains visible, and production success has no decorative navigation delay.

- [ ] **Step 4: Run full verification ladder**

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:production
```

Expected: every command exits 0; all existing DEN-16 flows remain green; production fixture route is exact 404.

- [ ] **Step 5: Perform visual comparison and record evidence**

Open the source prototype and fixture side-by-side at desktop and 390px mobile. Compare shell bounds, radii, spacing, typography scale, prism/beam/ray geometry, stage alignment, opening timing, error state, and reduced motion. Fix any visible drift before completion. Check the browser console for errors and verify no layout shift outside the processing card.

- [ ] **Step 6: Commit browser coverage**

```bash
git add tests/e2e/analyze-processing.spec.ts tests/e2e/intake.spec.ts tests/e2e/ui-production.spec.ts
git commit -m "test(DEN-24): verify processing prism interaction"
```

Do not mark DEN-24 complete until task-level reviews, broad branch review, the full verification ladder, and desktop/mobile visual comparison all pass.

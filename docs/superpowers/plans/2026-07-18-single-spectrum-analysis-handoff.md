# Single-Spectrum Analysis Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep durable analysis on New analysis with one spectral presentation, navigate only after complete, expose explicit partial actions, preserve landing URLs through auth, and restore strict Summary v2 generation.

**Architecture:** The intake action returns an owned `analysisId` instead of navigating immediately. A focused inline-processing controller on `/app` reconciles that job through the existing authenticated refresh/retry actions and owns the only spectral presentation. The result route becomes terminal-only, while a validated continuation object carries landing input through auth and History uses owned repository reads.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Zod, Supabase Auth/Postgres/Realtime, OpenRouter structured outputs, Vitest/Testing Library, Playwright.

## Global Constraints

- Preserve the approved dark-only “The Prism” design and show the approved spectrum exactly once, on New analysis.
- `/app/video/[id]` never renders the spectral processing presentation.
- Default artifacts remain Summary, Timestamps, and Transcript; Flashcards remain opt-in.
- A terminal partial result never auto-navigates and exposes `View available results` plus `Retry failed artifact`.
- Retry preserves ready artifacts and retries only unfinished work.
- Supabase remains authoritative for job and artifact state; Realtime is an optimization and polling is the correctness fallback.
- Landing continuations must remain internal, normalized, single-use, and immune to open redirects.
- Summary v1 remains readable; Summary v2 requires a non-negative integer `sourceOffsetMs` on every key point.
- Do not redesign the result workspace or add a second processing page.
- Support desktop, tablet, mobile, keyboard, touch, and `prefers-reduced-motion`.
- Never commit `.env` files, provider credentials, or Vercel project metadata.

---

### Task 1: Make Summary v2 strict-output compatible

**Files:**

- Modify: `src/lib/analysis-pipeline/artifact-schemas.ts`
- Modify: `src/lib/analysis-pipeline/artifact-schemas.test.ts`
- Modify: `src/lib/analysis-pipeline/generators.test.ts`
- Modify: `src/lib/analysis-pipeline/generators.ts`

**Interfaces:**

- Produces: `SummaryArtifact` whose v2 key points are `{ text: string; sourceOffsetMs: number }`.
- Consumes: existing transcript segments with millisecond offsets.

- [ ] **Step 1: Write failing strict-schema tests**

Add assertions that `summaryArtifactV2Schema` rejects a key point without `sourceOffsetMs`, accepts `0`, and that `summaryJsonSchema.properties.keyPoints.items.required` equals `['text', 'sourceOffsetMs']`.

```ts
expect(() =>
  summaryArtifactV2Schema.parse({
    schemaVersion: 2,
    title: 'Title',
    overview: 'Overview',
    keyPoints: [{ text: 'Grounded point' }],
  }),
).toThrow();
expect(summaryJsonSchema.properties.keyPoints.items.required).toEqual([
  'text',
  'sourceOffsetMs',
]);
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.test.ts
```

Expected: FAIL because the runtime and JSON schemas still permit a missing offset.

- [ ] **Step 3: Require the offset in both schemas**

Replace the optional field with:

```ts
sourceOffsetMs: z.number().int().nonnegative(),
```

and set the JSON Schema item requirement to:

```ts
required: ['text', 'sourceOffsetMs'],
```

Rename the structured request to `gleen_summary_v2` and retain the system instruction to use the nearest supplied transcript offset.

- [ ] **Step 4: Verify GREEN and compatibility**

Run:

```bash
npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.test.ts src/lib/result-workspace/presentation.test.ts
npm run typecheck
```

Expected: PASS; Summary v1 presentation tests remain green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis-pipeline/artifact-schemas.ts src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.ts src/lib/analysis-pipeline/generators.test.ts
git commit -m "fix: make summary v2 strict-output compatible"
```

---

### Task 2: Preserve a landing URL through authentication

**Files:**

- Create: `src/lib/youtube-intake/continuation.ts`
- Create: `src/lib/youtube-intake/continuation.test.ts`
- Create: `src/components/marketing/landing-analysis-form.tsx`
- Create: `src/components/marketing/landing-analysis-form.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/marketing/reference-motion.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/components/auth/access-form.tsx`
- Modify: `src/components/auth/auth-routes.test.tsx`

**Interfaces:**

- Produces: `buildAnalysisContinuation(rawUrl: string): string | null`.
- Produces: `parseAnalysisContinuation(candidate: string | null): { rawUrl: string } | null`.
- Produces: `AccessForm({ intent, nextPath })` with a validated internal path.
- Consumes: existing `safeInternalRedirect` and YouTube URL normalization rules.

- [ ] **Step 1: Write failing continuation-boundary tests**

Cover supported watch/short URLs, whitespace, invalid URLs, non-YouTube URLs, `//evil.example`, backslashes, control characters, and round-trip decoding.

```ts
const next = buildAnalysisContinuation('https://youtu.be/dQw4w9WgXcQ');
expect(next).toBe(
  '/app?continuation=' +
    encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
);
expect(
  parseAnalysisContinuation(
    new URL(next!, 'https://x').searchParams.get('continuation'),
  ),
).toEqual({ rawUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/lib/youtube-intake/continuation.test.ts src/components/marketing/landing-analysis-form.test.tsx src/components/auth/auth-routes.test.tsx
```

Expected: FAIL because the continuation helper and real landing form do not exist.

- [ ] **Step 3: Implement the validated continuation**

Use the existing YouTube parser/normalizer rather than a second URL regex. Return only an internal `/app?continuation=...` path and parse only a normalized supported YouTube URL.

Implement `LandingAnalysisForm` as a client form that validates on submit and navigates to:

```ts
router.push(`/sign-in?next=${encodeURIComponent(nextPath)}`);
```

Remove only the `.beam-form` submit interception from `ReferenceMotion`; decorative motion may react to explicit state but must not call `preventDefault()`.

- [ ] **Step 4: Thread `nextPath` through auth**

Make the Sign in page accept `searchParams: Promise<{ next?: string }>` and compute:

```ts
const nextPath = safeInternalRedirect((await searchParams).next, '/onboarding');
```

Pass it to `AccessForm`, and use it in both hidden `next` inputs. Preserve `/onboarding` as the fallback.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- src/lib/youtube-intake/continuation.test.ts src/components/marketing/landing-analysis-form.test.tsx src/components/auth/auth-routes.test.tsx src/lib/auth/auth.test.ts
npm run typecheck
```

Expected: PASS with no open redirect and both Google/email paths preserving the continuation.

- [ ] **Step 6: Commit**

```bash
git add src/lib/youtube-intake/continuation.ts src/lib/youtube-intake/continuation.test.ts src/components/marketing/landing-analysis-form.tsx src/components/marketing/landing-analysis-form.test.tsx src/app/page.tsx src/components/marketing/reference-motion.tsx 'src/app/(auth)/sign-in/page.tsx' src/components/auth/access-form.tsx src/components/auth/auth-routes.test.tsx
git commit -m "feat: preserve landing analysis through auth"
```

---

### Task 3: Return an analysis identity without early navigation

**Files:**

- Modify: `src/lib/youtube-intake/action-state.ts`
- Modify: `src/lib/youtube-intake/action-factory.ts`
- Modify: `src/lib/youtube-intake/actions.test.ts`
- Create: `src/components/app-shell/inline-analysis-processing.tsx`
- Create: `src/components/app-shell/inline-analysis-processing.test.tsx`
- Modify: `src/components/app-shell/new-analysis-form.tsx`
- Modify: `src/components/app-shell/new-analysis-form.test.tsx`

**Interfaces:**

- Produces: ready action state `{ status: 'ready'; analysisId: string; rawUrl; configuration }`.
- Produces: `InlineAnalysisProcessing({ analysisId, initialSnapshot?, refreshAction, retryAction, resultPathPrefix })`.
- Consumes: `refreshAnalysisSnapshot(analysisId)` and `retryAnalysis(formData)`.

- [ ] **Step 1: Write failing action and navigation tests**

Change the expected inserted result from `redirectTo` to `analysisId` and assert that New analysis does not call `router.push` while the job is queued/running.

```ts
expect(result).toMatchObject({
  status: 'ready',
  analysisId: '33333333-3333-4333-8333-333333333333',
});
expect(push).not.toHaveBeenCalled();
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/lib/youtube-intake/actions.test.ts src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/inline-analysis-processing.test.tsx
```

Expected: FAIL because actions still return the result route and the inline controller is absent.

- [ ] **Step 3: Change the action contract**

Add `analysisId?: string` to `IntakeActionState`. For an inserted intake return `analysisId: result.intake.id` and no `redirectTo`. Keep duplicate and explicit reanalysis behavior unchanged until the caller chooses an action.

- [ ] **Step 4: Implement inline reconciliation**

`InlineAnalysisProcessing` must:

```ts
type InlineAnalysisProcessingProps = Readonly<{
  analysisId: string;
  initialSnapshot?: AnalysisSnapshot;
  refreshAction?: typeof refreshAnalysisSnapshot;
  retryAction?: typeof retryAnalysis;
  resultPathPrefix?: string;
}>;
```

It renders one `AnalyzeProcessingVisual`, refreshes immediately, subscribes to the owned job/artifact channels, polls every 2 seconds while non-terminal, and derives visual stages through `toAnalysisVisualState`. Realtime callbacks call the same refresh function; polling remains active if subscription delivery is absent.

Use `window.history.replaceState(null, '', `/app?analysis=${analysisId}`)` after creation so reload can restore the job without performing route navigation.

- [ ] **Step 5: Mount it from New analysis**

Once `state.analysisId` exists, render `InlineAnalysisProcessing` instead of the form's idle/submission branch. The existing submission spectrum remains visible until the analysis identity arrives; the replacement uses the same `AnalyzeProcessingVisual` surface and never renders a second spectrum concurrently.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- src/lib/youtube-intake/actions.test.ts src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/inline-analysis-processing.test.tsx
npm run typecheck
```

Expected: PASS; queued/running states remain on `/app` and only one spectrum is in the document.

- [ ] **Step 7: Commit**

```bash
git add src/lib/youtube-intake/action-state.ts src/lib/youtube-intake/action-factory.ts src/lib/youtube-intake/actions.test.ts src/components/app-shell/inline-analysis-processing.tsx src/components/app-shell/inline-analysis-processing.test.tsx src/components/app-shell/new-analysis-form.tsx src/components/app-shell/new-analysis-form.test.tsx
git commit -m "feat: keep durable processing on new analysis"
```

---

### Task 4: Add terminal handoff and partial-result choices

**Files:**

- Modify: `src/components/app-shell/inline-analysis-processing.tsx`
- Modify: `src/components/app-shell/inline-analysis-processing.test.tsx`
- Modify: `src/components/app-shell/analyze-processing-visual.tsx`
- Modify: `src/components/app-shell/analyze-processing-visual.test.tsx`
- Modify: `src/app/app/video/[id]/page.tsx`
- Modify: `src/app/app/video/[id]/page.test.tsx`

**Interfaces:**

- Produces: complete navigation to `${resultPathPrefix}/${analysisId}` exactly once.
- Produces: partial actions labelled exactly `View available results` and `Retry failed artifact`.
- Consumes: existing owned retry and result normalization boundaries.

- [ ] **Step 1: Write failing terminal-state tests**

Cover:

```ts
expect(push).not.toHaveBeenCalled(); // running
expect(push).toHaveBeenCalledTimes(1); // complete after exit
expect(
  screen.getByRole('button', { name: 'View available results' }),
).toBeVisible();
expect(
  screen.getByRole('button', { name: 'Retry failed artifact' }),
).toBeVisible();
```

Also assert partial never auto-navigates, retry submits the analysis ID once, ready artifact labels remain ready, and reduced motion removes the decorative exit delay.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/components/app-shell/inline-analysis-processing.test.tsx src/components/app-shell/analyze-processing-visual.test.tsx src/app/app/video/[id]/page.test.tsx
```

Expected: FAIL because partial actions and the terminal-only route contract are absent.

- [ ] **Step 3: Implement complete and partial behavior**

For `complete`, guard navigation with `navigationScheduledFor.current` and retain the approved 400 ms completion copy plus 600 ms exit; use zero delay for reduced motion.

For `partial`, pass explicit controls into the visual:

```tsx
<button onClick={() => router.push(resultPath)}>View available results</button>
<button onClick={retryFailed}>Retry failed artifact</button>
```

After a successful retry, clear the partial control state, refresh immediately, and resume polling. Never clear ready artifacts locally.

- [ ] **Step 4: Make the result route terminal-only**

Keep `complete` and `partial` workspace rendering. For `queued` or `running`, redirect to:

```ts
redirect(`/app?analysis=${encodeURIComponent(intake.id)}`);
```

Do not import or render `AnalysisProcessingScreen` from the result page.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- src/components/app-shell/inline-analysis-processing.test.tsx src/components/app-shell/analyze-processing-visual.test.tsx src/app/app/video/[id]/page.test.tsx
npm run typecheck
```

Expected: PASS with one navigation, explicit partial actions, and no spectrum on the result route.

- [ ] **Step 6: Commit**

```bash
git add src/components/app-shell/inline-analysis-processing.tsx src/components/app-shell/inline-analysis-processing.test.tsx src/components/app-shell/analyze-processing-visual.tsx src/components/app-shell/analyze-processing-visual.test.tsx src/app/app/video/[id]/page.tsx src/app/app/video/[id]/page.test.tsx
git commit -m "feat: hand terminal analysis to results"
```

---

### Task 5: Restore active jobs and expose owned History entries

**Files:**

- Modify: `src/lib/youtube-intake/repository.ts`
- Modify: `src/lib/youtube-intake/supabase-repository.ts`
- Modify: `src/lib/youtube-intake/supabase-repository.test.ts`
- Modify: `src/lib/analysis-pipeline/repository.ts`
- Modify: `src/lib/analysis-pipeline/supabase-repository.ts`
- Modify: `src/lib/analysis-pipeline/supabase-repository.test.ts`
- Modify: `src/app/app/page.tsx`
- Modify: `src/app/app/page.test.tsx`
- Modify: `src/app/app/history/page.tsx`
- Create: `src/app/app/history/page.test.tsx`

**Interfaces:**

- Produces: `findMostRecentOwnedActive(userId): Promise<{ intake; snapshot } | null>`.
- Produces: `listOwnedHistory(userId, limit): Promise<readonly AnalysisHistoryRow[]>`.
- Consumes: authenticated server Supabase client and ownership predicates.

- [ ] **Step 1: Write failing repository/page tests**

Assert every query includes `.eq('user_id', userId)`, active selection includes only queued/running jobs ordered by `updated_at desc`, and History returns owned rows ordered newest first. Page tests cover explicit `?analysis=id`, most-recent active fallback, complete links, active resume links, and partial result links.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/lib/youtube-intake/supabase-repository.test.ts src/lib/analysis-pipeline/supabase-repository.test.ts src/app/app/page.test.tsx src/app/app/history/page.test.tsx
```

Expected: FAIL because active/history read models do not exist.

- [ ] **Step 3: Implement owned read models**

Define:

```ts
export type AnalysisHistoryRow = Readonly<{
  id: string;
  title: string;
  status: AnalysisJob['status'];
  updatedAt: string;
}>;
```

All database reads require `user_id = authenticated user`. Limit History to 50 rows; do not add pagination in this issue.

- [ ] **Step 4: Restore processing on `/app`**

Accept `searchParams: Promise<{ analysis?: string; continuation?: string }>`.

Resolution order:

1. valid explicitly owned `analysis`;
2. valid single-use continuation;
3. most recently updated owned queued/running job;
4. idle form.

Pass an owned initial snapshot into `InlineAnalysisProcessing`. Pass a validated continuation into New analysis for one automatic submit, then remove it from the address bar before dispatching.

- [ ] **Step 5: Render minimal History entries**

Replace the placeholder with semantic links:

```ts
const href =
  row.status === 'queued' || row.status === 'running'
    ? `/app?analysis=${row.id}`
    : `/app/video/${row.id}`;
```

Use text labels for Processing, Partial, Complete, and Failed; no result-workspace redesign.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- src/lib/youtube-intake/supabase-repository.test.ts src/lib/analysis-pipeline/supabase-repository.test.ts src/app/app/page.test.tsx src/app/app/history/page.test.tsx
npm run typecheck
```

Expected: PASS with ownership predicates and deterministic resume ordering.

- [ ] **Step 7: Commit**

```bash
git add src/lib/youtube-intake/repository.ts src/lib/youtube-intake/supabase-repository.ts src/lib/youtube-intake/supabase-repository.test.ts src/lib/analysis-pipeline/repository.ts src/lib/analysis-pipeline/supabase-repository.ts src/lib/analysis-pipeline/supabase-repository.test.ts src/app/app/page.tsx src/app/app/page.test.tsx src/app/app/history/page.tsx src/app/app/history/page.test.tsx
git commit -m "feat: restore active analyses from history"
```

---

### Task 6: Complete end-to-end verification and staging handoff

**Files:**

- Modify: `tests/e2e/auth.spec.ts`
- Modify: `tests/e2e/analyze-processing.spec.ts`
- Modify: `tests/e2e/result-workspace.spec.ts`
- Modify: `tests/e2e/fixtures.ts`
- Modify: `docs/superpowers/specs/2026-07-18-single-spectrum-analysis-handoff-design.md` only if verified behavior requires clarification; do not change approved product behavior silently.

**Interfaces:**

- Consumes: all Tasks 1–5.
- Produces: deterministic desktop/mobile/reduced-motion acceptance evidence and a real staging checklist.

- [ ] **Step 1: Write failing browser journeys**

Add independently named tests for:

- landing URL → Sign in `next` preservation;
- authenticated continuation auto-submit exactly once;
- queued/running remains on `/app` with one `[data-testid="analyze-processing-visual"]`;
- complete navigates once to `/app/video/[id]` and the destination contains zero processing visuals;
- partial exposes both actions and does not navigate automatically;
- retry keeps ready status and resumes unfinished status;
- reload and History restore the active job;
- reduced motion keeps truthful transitions without decorative delay.

Every test uses the shared console/page-error collector and asserts zero unexpected errors.

- [ ] **Step 2: Verify RED**

Run:

```bash
PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/auth.spec.ts tests/e2e/analyze-processing.spec.ts tests/e2e/result-workspace.spec.ts --project=chromium --project=mobile-chrome
```

Expected: new journeys FAIL before the completed integration.

- [ ] **Step 3: Complete fixture support without production mocks**

Extend only `/app-shell-fixture` and test actions with deterministic queued → running → complete and queued → partial → retry → complete sequences. Production actions, Supabase ownership, and provider implementations remain real.

- [ ] **Step 4: Run the complete local gate**

Run:

```bash
npx prettier --check src tests docs/superpowers/specs/2026-07-18-single-spectrum-analysis-handoff-design.md docs/superpowers/plans/2026-07-18-single-spectrum-analysis-handoff.md
npm run lint
npm run typecheck
npm test
npm run build
PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/auth.spec.ts tests/e2e/analyze-processing.spec.ts tests/e2e/result-workspace.spec.ts --project=chromium --project=mobile-chrome
git diff --check
```

Expected: all commands exit 0; no unexpected browser errors; desktop and Pixel 7 pass.

- [ ] **Step 5: Verify real staging**

On `https://gleen-staging.vercel.app`:

1. submit a real public YouTube URL on landing while signed out;
2. complete Google or email auth and confirm one automatic analysis start;
3. confirm the URL remains `/app` and one spectrum remains visible until terminal;
4. confirm Summary, Timestamps, and Transcript become ready and Summary claims contain source offsets;
5. confirm complete performs one result transition and result contains no spectrum;
6. run a controlled provider rejection or fixture-equivalent partial path, confirm both actions, retry, and ready-artifact preservation;
7. leave and return through History to verify durable recovery.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/auth.spec.ts tests/e2e/analyze-processing.spec.ts tests/e2e/result-workspace.spec.ts tests/e2e/fixtures.ts
git commit -m "test: verify single-spectrum analysis handoff"
```

---

## Final review checklist

- The landing form performs real navigation and no marketing listener prevents submission.
- Auth continuation is internal, normalized, and consumed once.
- Default artifact selection remains Summary, Timestamps, and Transcript.
- The only spectrum lives on New analysis.
- Queued/running never opens the result route.
- Complete navigates exactly once.
- Partial never auto-navigates and exposes both approved actions.
- Retry preserves ready artifacts.
- Reload and History restore owned jobs only.
- Result routes render no processing spectrum.
- Summary v1 remains readable and Summary v2 offsets are required.
- All local and staging verification evidence is recorded before merge or deployment promotion.

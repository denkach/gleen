# DEN-18 Video Result Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the terminal processing placeholder with the complete, editable, responsive video result workspace required by Linear DEN-18.

**Architecture:** Keep authentication, ownership, snapshot loading, and payload validation server-first. Pass a normalized presentation model into focused client components for tabs, the YouTube player adapter, editing/autosave, flashcard study, source seeking, copy, and local exports. Preserve DEN-17 processing for non-terminal jobs and isolate malformed or failed artifacts to their own tabs.

**Tech Stack:** Next.js App Router, React, strict TypeScript, `@supabase/ssr`, Zod, existing Gleen Tabs primitives, YouTube IFrame API, Vitest, Testing Library, Playwright.

## Global Constraints

- Match `design/reference-v3/index.html`; do not redesign the approved result workspace.
- Summary is amber, Flashcards purple, Timestamps cyan, Transcript neutral, and Export lime.
- Keep server secrets outside Client Components.
- Do not add a production dependency.
- Do not fabricate source timestamps for legacy content.
- Notion remains honestly unavailable until a separate integration issue.
- Transcript content is read-only.
- Support desktop, tablet, mobile, keyboard, touch, and `prefers-reduced-motion`.
- Preserve partial ready artifacts when another artifact is absent, failed, or malformed.

---

### Task 1: Version and normalize result artifact contracts

**Files:**

- Modify: `src/lib/analysis-pipeline/artifact-schemas.ts`
- Modify: `src/lib/analysis-pipeline/artifact-schemas.test.ts`
- Modify: `src/lib/analysis-pipeline/generators.ts`
- Modify: `src/lib/analysis-pipeline/generators.test.ts`
- Create: `src/lib/result-workspace/presentation.ts`
- Create: `src/lib/result-workspace/presentation.test.ts`

**Interfaces:**

- Produces: `summaryArtifactV1Schema`, `summaryArtifactV2Schema`, `summaryArtifactSchema`
- Produces: `normalizeResultWorkspace(intake, snapshot): ResultWorkspaceModel`
- Produces normalized key points as `{ text: string; sourceOffsetMs: number | null }`

- [ ] **Step 1: Write failing schema compatibility tests**

Add tests proving v1 strings remain readable, v2 source offsets validate as non-negative integers, and invalid offsets fail:

```ts
expect(
  summaryArtifactSchema.parse({
    schemaVersion: 1,
    title: 'Legacy',
    overview: 'Overview',
    keyPoints: ['A legacy point'],
  }),
).toBeDefined();

expect(
  summaryArtifactSchema.parse({
    schemaVersion: 2,
    title: 'Current',
    overview: 'Overview',
    keyPoints: [{ text: 'A sourced point', sourceOffsetMs: 12_000 }],
  }),
).toBeDefined();

expect(() =>
  summaryArtifactSchema.parse({
    schemaVersion: 2,
    title: 'Invalid',
    overview: 'Overview',
    keyPoints: [{ text: 'Bad source', sourceOffsetMs: -1 }],
  }),
).toThrow();
```

- [ ] **Step 2: Run the schema tests and verify RED**

Run:

```bash
npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts
```

Expected: FAIL because only summary schema v1 exists.

- [ ] **Step 3: Implement the discriminated summary contracts**

Keep `summaryArtifactV1Schema` unchanged and add v2:

```ts
export const summaryArtifactV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    title: z.string().trim().min(1),
    overview: z.string().trim().min(1),
    keyPoints: z
      .array(
        z
          .object({
            text: z.string().trim().min(1),
            sourceOffsetMs: z.number().int().nonnegative().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

export const summaryArtifactSchema = z.discriminatedUnion('schemaVersion', [
  summaryArtifactV1Schema,
  summaryArtifactV2Schema,
]);
```

Update `summaryJsonSchema` and generation to request schema version 2 and source offsets grounded in transcript segment offsets. Keep provider parsing compatible with v1 persisted rows.

- [ ] **Step 4: Write and implement presentation normalization tests**

Test complete, partial, legacy, missing, failed, and malformed artifacts. `normalizeResultWorkspace` must return independent tab states:

```ts
expect(model.tabs.summary).toMatchObject({ status: 'ready' });
expect(model.tabs.flashcards).toEqual({
  status: 'unavailable',
  reason: 'not_requested',
});
expect(model.tabs.summary.data.keyPoints[0]).toEqual({
  text: 'Legacy point',
  sourceOffsetMs: null,
});
```

Clamp presentation of source links by video duration: an out-of-range offset remains text but normalizes to `null`.

- [ ] **Step 5: Verify Task 1 and commit**

Run:

```bash
npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.test.ts src/lib/result-workspace/presentation.test.ts
npm run typecheck
```

Commit:

```bash
git add src/lib/analysis-pipeline src/lib/result-workspace
git commit -m "feat(den-18): normalize versioned result artifacts"
```

---

### Task 2: Add owned compare-and-set editing actions

**Files:**

- Create: `src/lib/result-workspace/edit-schemas.ts`
- Create: `src/lib/result-workspace/edit-schemas.test.ts`
- Create: `src/lib/result-workspace/actions.ts`
- Create: `src/lib/result-workspace/actions.test.ts`
- Modify: `src/lib/youtube-intake/supabase-repository.ts`
- Modify: `src/lib/analysis-pipeline/supabase-repository.ts`

**Interfaces:**

- Produces: `saveResultTitle(input): Promise<ResultSaveState>`
- Produces: `saveResultArtifact(input): Promise<ResultSaveState>`
- Consumes: `analysisId`, parsed editable payload, and `expectedUpdatedAt`
- Returns: `{ status: 'saved'; updatedAt: string } | { status: 'conflict' | 'error' }`

- [ ] **Step 1: Write failing mutation-boundary tests**

Cover invalid UUIDs, unsupported artifact kinds, transcript rejection, malformed content, unauthenticated requests, cross-user rows, successful ownership updates, and stale `expectedUpdatedAt` conflicts.

```ts
expect(
  await saveResultArtifact({
    analysisId,
    kind: 'transcript',
    content: transcript,
    expectedUpdatedAt,
  }),
).toEqual({ status: 'error' });
```

- [ ] **Step 2: Run the action tests and verify RED**

Run:

```bash
npm test -- src/lib/result-workspace/edit-schemas.test.ts src/lib/result-workspace/actions.test.ts
```

Expected: FAIL because the editing boundary does not exist.

- [ ] **Step 3: Implement validated compare-and-set repository methods**

Add repository methods that update only when all predicates match:

```ts
client
  .from('analysis_artifacts')
  .update({ content: parsedContent })
  .eq('analysis_id', analysisId)
  .eq('user_id', userId)
  .eq('kind', kind)
  .eq('status', 'ready')
  .eq('updated_at', expectedUpdatedAt)
  .select('updated_at')
  .maybeSingle();
```

Use the equivalent owned compare-and-set update for `analysis_intakes.title`. Treat a missing returned row as `conflict`; never retry by overwriting unconditionally.

- [ ] **Step 4: Implement server actions**

Each action obtains the authenticated user with the server Supabase client, parses input with Zod, invokes the owned repository method, and returns controlled state without provider/database details.

- [ ] **Step 5: Verify Task 2 and commit**

Run:

```bash
npm test -- src/lib/result-workspace/edit-schemas.test.ts src/lib/result-workspace/actions.test.ts src/lib/analysis-pipeline/supabase-repository.test.ts src/lib/youtube-intake/supabase-repository.test.ts
npm run typecheck
```

Commit:

```bash
git add src/lib/result-workspace src/lib/analysis-pipeline/supabase-repository.ts src/lib/youtube-intake/supabase-repository.ts
git commit -m "feat(den-18): add owned result autosave actions"
```

---

### Task 3: Build the player adapter and source panel

**Files:**

- Create: `src/components/result-workspace/player-controller.ts`
- Create: `src/components/result-workspace/player-context.tsx`
- Create: `src/components/result-workspace/youtube-player.tsx`
- Create: `src/components/result-workspace/youtube-player.test.tsx`
- Create: `src/components/result-workspace/source-panel.tsx`
- Create: `src/components/result-workspace/source-panel.test.tsx`

**Interfaces:**

- Produces: `VideoPlayerController`
- Produces: `PlayerProvider` and `useVideoPlayer()`
- Produces: `<YouTubePlayer videoId title onReady onTimeChange />`
- Consumes only the official YouTube IFrame API

- [ ] **Step 1: Write failing player contract tests**

Mock `window.YT.Player` and assert controller conversion from milliseconds to seconds:

```ts
controller.seekTo(75_500);
expect(player.seekTo).toHaveBeenCalledWith(75.5, true);
```

Cover script load success, existing API reuse, unavailable API fallback, cleanup, play/pause, and current-time polling cleanup.

- [ ] **Step 2: Run player tests and verify RED**

Run:

```bash
npm test -- src/components/result-workspace/youtube-player.test.tsx src/components/result-workspace/source-panel.test.tsx
```

- [ ] **Step 3: Implement the adapter and source panel**

Expose only the controller interface to artifact tabs. Render approved source-panel structure with title, channel, duration, language, thumbnail fallback, and a player-unavailable state. Do not expose raw iframe messages outside the adapter.

- [ ] **Step 4: Verify Task 3 and commit**

Run:

```bash
npm test -- src/components/result-workspace/youtube-player.test.tsx src/components/result-workspace/source-panel.test.tsx
npm run typecheck
```

Commit:

```bash
git add src/components/result-workspace
git commit -m "feat(den-18): add adaptable youtube source player"
```

---

### Task 4: Render all artifact tabs and interaction states

**Files:**

- Create: `src/components/result-workspace/result-workspace.tsx`
- Create: `src/components/result-workspace/result-workspace.test.tsx`
- Create: `src/components/result-workspace/overview-tab.tsx`
- Create: `src/components/result-workspace/summary-tab.tsx`
- Create: `src/components/result-workspace/flashcards-tab.tsx`
- Create: `src/components/result-workspace/timestamps-tab.tsx`
- Create: `src/components/result-workspace/transcript-tab.tsx`
- Create: `src/components/result-workspace/artifact-state.tsx`

**Interfaces:**

- Produces: `<ResultWorkspace model saveTitle saveArtifact />`
- Summary, timestamps, and transcript consume `useVideoPlayer().seekTo`
- Every tab consumes normalized ready/unavailable/failed/corrupted state

- [ ] **Step 1: Write failing workspace interaction tests**

Cover:

- six accessible tabs and arrow-key navigation;
- disabled/unavailable tab state without losing explanation;
- summary v1 text and v2 source seek;
- flashcard flip, previous/next, Again / Hard / Got it, and reduced motion;
- timestamp seek and active chapter;
- transcript search, zero results, copy, and seek;
- complete, partial, failed, empty, and corrupted states.

```ts
await userEvent.click(screen.getByRole('button', { name: '12:35' }));
expect(controller.seekTo).toHaveBeenCalledWith(755_000);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- src/components/result-workspace/result-workspace.test.tsx
```

- [ ] **Step 3: Implement focused tab components**

Use the existing Gleen Tabs primitive. Keep all content semantic and avoid one generic card component for visually distinct artifacts. Use the artifact-specific classes/tokens from the approved reference.

- [ ] **Step 4: Verify Task 4 and commit**

Run:

```bash
npm test -- src/components/result-workspace/result-workspace.test.tsx src/components/ui/navigation-primitives.test.tsx
npm run typecheck
```

Commit:

```bash
git add src/components/result-workspace
git commit -m "feat(den-18): render interactive result artifact tabs"
```

---

### Task 5: Add autosave and local export behavior

**Files:**

- Create: `src/components/result-workspace/use-autosave.ts`
- Create: `src/components/result-workspace/use-autosave.test.tsx`
- Create: `src/components/result-workspace/editable-title.tsx`
- Create: `src/components/result-workspace/autosave-status.tsx`
- Create: `src/lib/result-workspace/markdown.ts`
- Create: `src/lib/result-workspace/markdown.test.ts`
- Create: `src/components/result-workspace/export-tab.tsx`
- Modify: `src/components/result-workspace/summary-tab.tsx`
- Modify: `src/components/result-workspace/flashcards-tab.tsx`
- Modify: `src/components/result-workspace/timestamps-tab.tsx`

**Interfaces:**

- Produces: `useAutosave({ value, revision, save, delayMs: 700 })`
- Produces: `serializeMarkdown(model, format)` for `markdown | obsidian | notebooklm`
- Consumes the Task 2 server actions through injected functions

- [ ] **Step 1: Write failing autosave and serializer tests**

Use fake timers only for the hook boundary. Assert one save after 700ms, no duplicate save for unchanged content, latest edit wins, conflict is visible, retry keeps input, and offline never claims success.

Serializer tests assert deterministic headings, source URL, timestamps, summary, flashcards, chapters, and transcript without HTML or secrets.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- src/components/result-workspace/use-autosave.test.tsx src/lib/result-workspace/markdown.test.ts
```

- [ ] **Step 3: Implement editing and export controls**

Title, summary, flashcard text, and timestamp title/description use controlled inputs with optimistic state and explicit save status. Transcript remains read-only. Export creates a Blob and object URL locally, revokes URLs after use, and reports clipboard failure accessibly. Notion renders `Connection required` without a success action.

- [ ] **Step 4: Verify Task 5 and commit**

Run:

```bash
npm test -- src/components/result-workspace src/lib/result-workspace
npm run typecheck
```

Commit:

```bash
git add src/components/result-workspace src/lib/result-workspace
git commit -m "feat(den-18): add result autosave and local exports"
```

---

### Task 6: Integrate the route, approved styling, fixtures, and browser coverage

**Files:**

- Modify: `src/app/app/video/[id]/page.tsx`
- Modify: `src/app/app/video/[id]/page.test.tsx`
- Modify: `src/components/app-shell/analysis-processing-screen.tsx`
- Modify: `src/components/app-shell/analysis-processing-screen.test.tsx`
- Modify: `src/styles/app-shell-reference.css`
- Modify: `src/app/app-shell-fixture/fixture-cases.ts`
- Modify: `src/app/app-shell-fixture/app/video/[id]/page.tsx`
- Create: `tests/e2e/result-workspace.spec.ts`

**Interfaces:**

- Terminal snapshots render `ResultWorkspace` directly.
- Processing snapshots retain DEN-17 live reconciliation.
- Complete transition swaps Spectral Rail for the same workspace component.

- [ ] **Step 1: Write failing route and E2E tests**

Add deterministic fixtures for complete, legacy summary, partial, corrupted, and empty states. E2E must assert:

- desktop two-column/sticky source layout;
- tablet fallback;
- mobile player-first layout and no horizontal page overflow;
- keyboard tab navigation;
- source seeking from summary/timestamps/transcript;
- flashcard keyboard/touch flow;
- title and artifact autosave statuses;
- copy/download controls;
- partial and corrupted isolation;
- reduced-motion behavior;
- zero console errors.

- [ ] **Step 2: Run focused route/E2E tests and verify RED**

Run:

```bash
npm test -- src/app/app/video/[id]/page.test.tsx src/components/app-shell/analysis-processing-screen.test.tsx
PLAYWRIGHT_PORT=3019 npx playwright test tests/e2e/result-workspace.spec.ts --project=chromium
```

- [ ] **Step 3: Integrate route state selection and approved CSS**

For terminal snapshots, normalize on the server and render the workspace. For live completion, render the workspace from the newest snapshot after the approved 500ms exit unless reduced motion is active. Port the approved `.source-panel`, `.result-workspace`, `.artifact-toolbar`, summary, flashcard, timestamp, transcript, export, responsive, and reduced-motion rules into the existing app-shell stylesheet using shared tokens.

- [ ] **Step 4: Run full repository verification**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
PLAYWRIGHT_PORT=3019 npx playwright test tests/e2e/result-workspace.spec.ts tests/e2e/analyze-processing.spec.ts --project=chromium
npm run build
git diff --check
```

- [ ] **Step 5: Verify real staging data**

Using the existing completed DEN-17 analysis, verify:

- v1 summary renders without fabricated source links;
- timestamps seek the live YouTube player;
- transcript search and seek work;
- title and one supported artifact edit persist after reload;
- Markdown/Obsidian/NotebookLM files are generated locally;
- desktop and mobile layouts match the reference;
- reduced motion and keyboard navigation remain usable;
- browser console has no errors.

- [ ] **Step 6: Commit DEN-18 integration**

```bash
git add src tests/e2e/result-workspace.spec.ts
git commit -m "feat(den-18): deliver video result workspace"
```

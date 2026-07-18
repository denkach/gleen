# DEN-25 Result Page Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Replace the current result workspace presentation with a one-to-one production implementation of the approved HTML prototype while preserving existing behavior and adding every DEN-25 mobile, persistence, transcript, export, Favorite, and public Share requirement.

**Architecture:** Evolve the existing ResultWorkspace and repository boundaries rather than converting the standalone prototype into a monolith. A single reactive player provider coordinates the YouTube iframe, full controls, mini-player, chapters, timestamps, and transcript; owner state and shares are stored in ownership-scoped Supabase tables; public sharing uses a dedicated server-only projection.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS plus shared CSS variables, Radix Dialog/Tabs, Zod 4, Supabase SSR/JS, Vitest, Testing Library, Playwright, YouTube IFrame API.

## Global Constraints

- The visual implementation must match \`design/prototypes/analyze-page/gleen-new-issue.html\` one-to-one; this is not a redesign.
- Preserve the existing application sidebar/top bar, DEN-18 routes, autosave, partial-result states, artifact editing, and exports.
- Use prototype transitions at 1180 px, 860 px, and 620 px; verify every DEN-25 reference viewport.
- Use only shared Gleen tokens: summary amber, flashcards purple, timestamps cyan, export lime, restrained spectral accents.
- No large prism in the player, rainbow borders, generic SaaS cards, gaming HUD, excessive glass, or dead controls.
- All controls must support keyboard, touch, WCAG AA contrast, 44×44 px mobile targets, and \`prefers-reduced-motion\`.
- Never expose \`SUPABASE_SECRET_KEY\` or generated user content to client bundles, analytics payloads, or public owner metadata.
- Every new table in \`public\` must enable RLS, use least-privilege grants, and combine role checks with ownership predicates.
- Do not add a production dependency. Use the existing Radix primitives and pin the Supabase CLI invocation to \`2.109.0\`.
- Follow TDD: test fails first, minimal implementation next, focused verification, then a Conventional Commit.

---

## File and responsibility map

### Persistence and server boundaries

- Create CLI-generated \`supabase/migrations/*_den_25_result_state_and_shares.sql\`: owner result state, flashcard reviews, shares, indexes, grants, and RLS.
- Create \`src/lib/result-workspace/user-state.ts\`: schemas and domain interfaces for persisted owner state.
- Create \`src/lib/result-workspace/user-state-repository.ts\`: repository contracts and Supabase adapter.
- Create \`src/lib/result-workspace/share.ts\`: share token schema, public projection schema, and safe token generation.
- Create \`src/lib/result-workspace/share-repository.ts\`: owner share mutations and trusted public lookup.
- Create \`src/lib/supabase/admin.ts\`: server-only admin client reused by workflow and public projection.
- Modify \`src/lib/result-workspace/actions.ts\`: validated owner mutations for state, review, create/revoke Share.
- Modify \`src/env.ts\` and \`.env.example\`: validate/document the existing server-only Supabase secret.

### Result contracts and cross-cutting behavior

- Modify \`src/lib/analysis-pipeline/artifact-schemas.ts\`: Summary v3 and Transcript v1/v2 schemas.
- Create \`src/lib/analysis-pipeline/transcript-enrichment.ts\`: deterministic, non-destructive segment classification and speaker fallback.
- Modify \`src/lib/analysis-pipeline/generators.ts\` and \`workflow.ts\`: generate Summary v3 and persist Transcript v2.
- Modify \`src/lib/result-workspace/presentation.ts\`: normalized sections, Overview data, user state, and truthful counts.
- Create \`src/lib/result-workspace/navigation.ts\`: artifact/hash parsing and recommendation rules.
- Create \`src/lib/result-workspace/copy.ts\`: typed result copy dictionaries for \`uk|ru|en|es|de\`.
- Create \`src/lib/analytics/result-events.ts\`: content-free typed analytics events.

### Player and result UI

- Replace \`src/components/result-workspace/player-controller.ts\`: reactive state and complete controller contract.
- Replace \`src/components/result-workspace/player-context.tsx\`: external-store provider with one source of truth.
- Modify \`src/components/result-workspace/youtube-player.tsx\`: one iframe and full IFrame API synchronization.
- Create \`src/components/result-workspace/player-controls.tsx\`: prototype controls.
- Create \`src/components/result-workspace/chapter-rail.tsx\`: desktop chapters.
- Modify \`src/components/result-workspace/source-panel.tsx\`: prototype source/player composition.
- Create \`src/components/result-workspace/result-header.tsx\`: title, Favorite, Share, and download actions.
- Create \`src/components/result-workspace/result-navigation.tsx\`: route-aware desktop tabs.
- Replace \`overview-tab.tsx\`, and refine the five artifact tab components to the prototype.

### Mobile and public UI

- Create \`mobile-mini-player.tsx\`, \`mobile-result-navigation.tsx\`, \`result-sheet.tsx\`, and \`chapter-sheet.tsx\`.
- Create \`use-player-visibility.ts\`, \`use-result-scroll-memory.ts\`, and \`use-artifact-swipe.ts\`.
- Modify \`src/components/app-shell/app-shell.tsx\`: suppress global mobile navigation only on result routes.
- Create \`src/app/share/[token]/page.tsx\` and tests: anonymous read-only projection.
- Create \`src/styles/result-workspace-reference.css\` and import it from \`src/app/layout.tsx\`.

### Fixtures and verification

- Extend \`src/app/app-shell-fixture/app/video/[id]/fixture-result-workspace.tsx\` and its page fixtures.
- Extend component tests and \`tests/e2e/result-workspace.spec.ts\`.
- Create \`tests/e2e/result-share.spec.ts\` and \`tests/e2e/result-workspace.visual.spec.ts\`.

---

### Task 1: Freeze the production fixture and visual contract

**Files:**

- Modify: \`src/app/app-shell-fixture/app/video/[id]/page.tsx\`
- Modify: \`src/app/app-shell-fixture/app/video/[id]/fixture-result-workspace.tsx\`
- Modify: \`src/app/app-shell-fixture/fixture-cases.ts\`
- Test: \`src/app/app-shell-fixture/page.test.tsx\`
- Test: \`tests/e2e/result-workspace.spec.ts\`

**Interfaces:**

- Produces: stable \`result-den-25\`, \`result-den-25-partial\`, and \`result-den-25-public\` fixtures used by all later component and browser tasks.
- Consumes: current \`ResultWorkspaceModel\` until Task 4 expands it.

- [ ] **Step 1: Write failing fixture contract tests**

Add assertions that the complete fixture contains five Summary key points, 28 flashcards, 18 timestamp chapters, and enough timestamped transcript segments to exercise scrolling. Keep this baseline compatible with the existing DEN-18 model; Tasks 3 and 4 add owner state, sections, and categories after their types exist.

```ts
expect(den25Model.tabs.summary.status).toBe('ready');
expect(den25Model.tabs.summary.data.keyPoints).toHaveLength(5);
expect(den25Model.tabs.flashcards.data.cards).toHaveLength(28);
expect(den25Model.tabs.timestamps.data.chapters).toHaveLength(18);
```

- [ ] **Step 2: Run the fixture tests and observe the contract failure**

Run: \`npm test -- src/app/app-shell-fixture/page.test.tsx\`

Expected: FAIL because the DEN-25 fixture IDs/model fields do not exist.

- [ ] **Step 3: Add the deterministic fixture data**

Build the fixture entirely from safe local content. Use the prototype counts and structure, but no base64 poster and no network-dependent data. Add a fake player adapter exposing state changes and command logs through \`window.__fixturePlayer\`. Keep future owner-state seed data in a separately typed constant until Task 3 passes it to the expanded workspace.

```ts
const den25UserStateSeed = {
  favorite: false,
  playbackPositionMs: 370_000,
  lastArtifact: 'overview' as const,
  reviewedFlashcardCount: 11,
  activeShare: null,
};
```

- [ ] **Step 4: Add a fixture browser smoke assertion**

Assert that \`/app-shell-fixture/app/video/result-den-25#overview\` renders one current result workspace, one player mount, and no analysis spectrum. Do not assert DEN-25-only controls until their tasks introduce them.

Run: \`PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/result-workspace.spec.ts --project=chromium --grep "DEN-25 fixture"\`

Expected: PASS.

- [ ] **Step 5: Commit the fixture baseline**

```bash
git add src/app/app-shell-fixture tests/e2e/result-workspace.spec.ts
git commit -m "test(den-25): add stable result refinement fixtures"
```

### Task 2: Add owner state, flashcard reviews, and Share persistence

**Files:**

- Modify: \`package.json\`
- Modify: \`package-lock.json\`
- Create (with CLI): \`supabase/migrations/*_den_25_result_state_and_shares.sql\`
- Test: \`src/lib/result-workspace/migration.test.ts\`

**Interfaces:**

- Produces tables \`analysis_result_states\`, \`analysis_flashcard_reviews\`, and \`analysis_shares\`.
- Produces owner-only CRUD grants for authenticated users; \`anon\` receives no table grants.

- [ ] **Step 1: Pin the migration tool as a development dependency**

Run: \`npm install --save-dev --save-exact supabase@2.109.0\`

Expected: \`package.json\` contains \`"supabase": "2.109.0"\` under devDependencies and the lockfile is updated. This is a development tool, not a production dependency.

- [ ] **Step 2: Ask the CLI to create the migration**

Run: \`npx supabase migration new den_25_result_state_and_shares\`

Expected: one timestamped SQL file is printed under \`supabase/migrations/\`. Use that exact generated path for every remaining step in this task.

- [ ] **Step 3: Write the failing migration security test**

```ts
expect(sql).toContain(
  'alter table public.analysis_result_states enable row level security',
);
expect(sql).toContain(
  'alter table public.analysis_flashcard_reviews enable row level security',
);
expect(sql).toContain(
  'alter table public.analysis_shares enable row level security',
);
expect(sql).toContain('using ((select auth.uid()) = user_id)');
expect(sql).toContain('with check ((select auth.uid()) = user_id');
expect(sql).toContain('revoke all on public.analysis_shares from anon');
expect(sql).not.toMatch(/grant .*analysis_shares.* to anon/);
```

Run: \`npm test -- src/lib/result-workspace/migration.test.ts\`

Expected: FAIL because the generated migration is empty.

- [ ] **Step 4: Implement the constrained schema and policies**

Use these columns and constraints:

```sql
create table public.analysis_result_states (
  analysis_id uuid not null references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite boolean not null default false,
  playback_position_ms bigint not null default 0 check (playback_position_ms >= 0),
  last_artifact text not null default 'overview'
    check (last_artifact in ('overview','summary','flashcards','timestamps','transcript','export')),
  last_study_action text check (last_study_action in ('summary_opened','flashcards_reviewed','transcript_used')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (analysis_id, user_id)
);

create table public.analysis_flashcard_reviews (
  analysis_id uuid not null references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_revision timestamptz not null,
  card_index integer not null check (card_index >= 0),
  rating text not null check (rating in ('again','hard','got_it')),
  updated_at timestamptz not null default now(),
  primary key (analysis_id, user_id, artifact_revision, card_index)
);

create table public.analysis_shares (
  token text primary key check (token ~ '^[A-Za-z0-9_-]{43}$'),
  analysis_id uuid not null references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (analysis_id, user_id)
);
```

For every INSERT/UPDATE policy, combine \`(select auth.uid()) = user_id\` with an ownership \`exists\` check against \`analysis_intakes\`. UPDATE must have both \`USING\` and \`WITH CHECK\`; DELETE is allowed only for the owner where required. Add indexes for every \`user_id\`, \`analysis_id\`, and active share lookup used by queries. Reuse \`public.set_updated_at()\` triggers for mutable rows.

- [ ] **Step 5: Verify migration text, local database, and advisors**

Run:

```bash
npm test -- src/lib/result-workspace/migration.test.ts
npx supabase db reset
npx supabase db advisors
npx supabase migration list --local
```

Expected: tests PASS, reset completes, advisors report no security errors introduced by the migration, and the new migration is listed locally.

- [ ] **Step 6: Commit the persistence schema**

```bash
git add package.json package-lock.json supabase/migrations src/lib/result-workspace/migration.test.ts
git commit -m "feat(den-25): add secure result state persistence"
```

### Task 3: Implement owner-state repositories and Server Actions

**Files:**

- Create: \`src/lib/result-workspace/user-state.ts\`
- Create: \`src/lib/result-workspace/user-state-repository.ts\`
- Create: \`src/lib/result-workspace/user-state-repository.test.ts\`
- Modify: \`src/lib/result-workspace/actions.ts\`
- Modify: \`src/lib/result-workspace/actions.test.ts\`

**Interfaces:**

- Produces \`ResultUserState\`, \`FlashcardRating\`, and \`ResultUserStateRepository\`.
- Produces Server Actions \`saveResultPreference\`, \`savePlaybackPosition\`, and \`saveFlashcardReview\`.

- [ ] **Step 1: Write repository and action failure tests**

```ts
await expect(repository.findOwned('owner-1', analysisId)).resolves.toEqual({
  favorite: false,
  playbackPositionMs: 0,
  lastArtifact: 'overview',
  lastStudyAction: null,
  reviews: [],
});
await expect(
  savePlaybackPosition({ analysisId, positionMs: -1 }),
).resolves.toEqual({
  status: 'error',
});
```

Run: \`npm test -- src/lib/result-workspace/user-state-repository.test.ts src/lib/result-workspace/actions.test.ts\`

Expected: FAIL because the repository and actions do not exist.

- [ ] **Step 2: Define strict domain schemas**

```ts
export const resultArtifactSchema = z.enum([
  'overview',
  'summary',
  'flashcards',
  'timestamps',
  'transcript',
  'export',
]);
export const flashcardRatingSchema = z.enum(['again', 'hard', 'got_it']);
export type ResultUserState = Readonly<{
  favorite: boolean;
  playbackPositionMs: number;
  lastArtifact: z.infer<typeof resultArtifactSchema>;
  lastStudyAction:
    'summary_opened' | 'flashcards_reviewed' | 'transcript_used' | null;
  reviews: readonly Readonly<{
    artifactRevision: string;
    cardIndex: number;
    rating: z.infer<typeof flashcardRatingSchema>;
  }>[];
}>;
```

- [ ] **Step 3: Implement the ownership-filtered Supabase adapter**

Every query must filter both \`analysis_id\` and \`user_id\`, return a safe default for no row, and map database failures to \`ResultUserStateRepositoryError\`. Upsert state with \`onConflict: 'analysis_id,user_id'\`; upsert reviews with the full composite key.

- [ ] **Step 4: Implement authenticated Server Actions**

Each action validates with Zod, calls \`supabase.auth.getUser()\`, ignores any caller-supplied owner ID, and returns:

```ts
export type ResultMutationState =
  Readonly<{ status: 'saved' }> | Readonly<{ status: 'conflict' | 'error' }>;
```

Favorite is an explicit boolean, playback clamps to the video duration after the owned intake is loaded, and review input includes the current artifact revision and card index.

- [ ] **Step 5: Run focused tests**

Run: \`npm test -- src/lib/result-workspace/user-state-repository.test.ts src/lib/result-workspace/actions.test.ts\`

Expected: PASS including unauthenticated, invalid-input, foreign-analysis, storage-error, and success cases.

- [ ] **Step 6: Commit**

```bash
git add src/lib/result-workspace
git commit -m "feat(den-25): persist result owner state"
```

### Task 4: Expand artifact schemas and normalized presentation

**Files:**

- Modify: \`src/lib/analysis-pipeline/artifact-schemas.ts\`
- Modify: \`src/lib/analysis-pipeline/artifact-schemas.test.ts\`
- Create: \`src/lib/analysis-pipeline/transcript-enrichment.ts\`
- Create: \`src/lib/analysis-pipeline/transcript-enrichment.test.ts\`
- Modify: \`src/lib/analysis-pipeline/generators.ts\`
- Modify: \`src/lib/analysis-pipeline/generators.test.ts\`
- Modify: \`src/lib/analysis-pipeline/workflow.ts\`
- Modify: \`src/lib/analysis-pipeline/workflow.test.ts\`
- Modify: \`src/lib/result-workspace/edit-schemas.ts\`
- Modify: \`src/lib/result-workspace/edit-schemas.test.ts\`
- Modify: \`src/lib/result-workspace/presentation.ts\`
- Modify: \`src/lib/result-workspace/presentation.test.ts\`

**Interfaces:**

- Produces backward-compatible \`SummaryPresentation.sections\` and \`TranscriptPresentation.segments[].segmentType/speakerLabel\`.
- Produces \`ResultOverviewData\` and normalized user state.

- [ ] **Step 1: Write failing legacy/v3/v2 normalization tests**

Test Summary v1/v2 normalization into sections, Summary v3 strict parsing, Transcript v1 fallback to \`other\`, Transcript v2 classification, false-zero prevention, chapter durations, and reviewed-count filtering by current artifact revision.

```ts
expect(model.overview.summarySectionCount).toBe(5);
expect(model.overview.transcriptWordCount).toBe(4112);
expect(legacyTranscript.segments[0].segmentType).toBe('other');
expect(partialModel.overview.flashcardCount).toBeNull();
```

Run: \`npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/result-workspace/presentation.test.ts\`

Expected: FAIL on the new contracts.

- [ ] **Step 2: Add Summary v3 and Transcript v1/v2 schemas**

```ts
const summarySectionSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    details: z.string().trim().min(1),
    supportingQuote: z.string().trim().min(1).nullable(),
    sourceOffsetMs: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const transcriptSegmentV2Schema = z
  .object({
    text: z.string().trim().min(1),
    offsetMs: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    segmentType: z.enum(['insight', 'question', 'example', 'story', 'other']),
    speakerLabel: z.string().trim().min(1).nullable(),
  })
  .strict();
```

Summary v3 contains \`schemaVersion: 3\`, title, outcome, and 1–20 sections. Preserve v1/v2 parsers and extend the result edit schema so owner autosave accepts the same strict v3 contract. After provider parsing, keep a supporting quote only when its normalized text occurs in the source transcript; otherwise replace it with null. Clamp or null every source offset outside the video duration.

- [ ] **Step 3: Implement non-destructive transcript enrichment**

\`classifyTranscriptSegment(text)\` returns \`question\` for a real question mark, \`example\` for localized example markers, \`story\` for explicit first-person narrative markers, and \`other\` otherwise. Never rewrite text or infer a named speaker. Existing provider data has no speaker identity, so persist \`speakerLabel: null\`.

- [ ] **Step 4: Generate Summary v3 and Transcript v2**

Update the structured Summary prompt/schema to require grounded sections and nullable quote/timestamp fields. During workflow transcript persistence, merge the original transcript with deterministic classification and write schema version 2. Failed enrichment falls back to v1-ready transcript rather than failing the whole analysis.

- [ ] **Step 5: Normalize Overview and legacy artifacts**

\`normalizeResultWorkspace(intake, snapshot, userState)\` must derive outcome, counts, word count, chapter end times, available exports, current chapter, and only reviews matching \`revisions.flashcards\`. It returns null for unknown counts and never fabricates quote/speaker/timestamp values.

- [ ] **Step 6: Run focused pipeline/presentation tests**

Run: \`npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/transcript-enrichment.test.ts src/lib/analysis-pipeline/generators.test.ts src/lib/analysis-pipeline/workflow.test.ts src/lib/result-workspace/edit-schemas.test.ts src/lib/result-workspace/presentation.test.ts\`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/analysis-pipeline src/lib/result-workspace/presentation.ts src/lib/result-workspace/presentation.test.ts
git commit -m "feat(den-25): enrich result presentation contracts"
```

### Task 5: Add typed copy, navigation rules, and safe analytics

**Files:**

- Create: \`src/lib/result-workspace/copy.ts\`
- Create: \`src/lib/result-workspace/copy.test.ts\`
- Create: \`src/lib/result-workspace/navigation.ts\`
- Create: \`src/lib/result-workspace/navigation.test.ts\`
- Create: \`src/lib/analytics/result-events.ts\`
- Create: \`src/lib/analytics/result-events.test.ts\`
- Modify: \`src/app/app/video/[id]/page.tsx\`
- Modify: \`src/app/app/video/[id]/page.test.tsx\`

**Interfaces:**

- Produces \`ResultCopy\`, \`ResultArtifact\`, \`readResultArtifactHash\`, \`recommendNextArtifact\`, and \`trackResultEvent\`.

- [ ] **Step 1: Write failing dictionary and recommendation tests**

Require identical key coverage for \`uk|ru|en|es|de\`, valid hash parsing, fallback to Overview, deterministic recommendations, and analytics rejection of arbitrary/generated properties.

```ts
for (const locale of supportedLocales) {
  expect(Object.keys(resultCopy[locale]).sort()).toEqual(englishKeys);
}
expect(recommendNextArtifact({ summaryVisited: true, reviewed: 0 })).toBe(
  'flashcards',
);
```

- [ ] **Step 2: Implement the typed copy map**

Define a closed \`ResultCopy\` interface covering player, tabs, Overview, artifacts, sheets, state messages, Favorite, Share, and public view. Populate complete Ukrainian, Russian, English, Spanish, and German dictionaries; TypeScript must fail if a locale misses a key. No component may introduce a user-visible hard-coded result string afterward.

- [ ] **Step 3: Implement hash navigation and recommendation**

Use \`#overview|#summary|#flashcards|#timestamps|#transcript|#export\`. Invalid or unavailable hashes resolve to Overview. Use \`history.pushState\` for user navigation, \`replaceState\` for initialization, and listen to \`hashchange\`/popstate.

- [ ] **Step 4: Implement the analytics boundary**

```ts
type ResultEvent =
  | { name: 'result_overview_artifact_opened'; artifact: ResultArtifact }
  | { name: 'result_continue_watching_clicked'; anonymousAnalysisId: string }
  | { name: 'result_mobile_miniplayer_shown'; anonymousAnalysisId: string }
  | { name: 'result_mobile_miniplayer_expanded'; anonymousAnalysisId: string }
  | { name: 'result_chapter_sheet_opened'; anonymousAnalysisId: string }
  | { name: 'result_mobile_tab_changed'; artifact: ResultArtifact }
  | { name: 'result_chapter_selected'; anonymousAnalysisId: string }
  | { name: 'result_favorite_changed'; favorite: boolean }
  | { name: 'result_share_changed'; action: 'created' | 'copied' | 'revoked' }
  | {
      name: 'result_transcript_control_changed';
      control: 'filter' | 'auto_scroll' | 'speaker_labels';
    }
  | { name: 'result_playback_rate_changed'; rate: number }
  | {
      name: 'result_export_requested';
      destination: 'markdown' | 'obsidian' | 'notebooklm' | 'notion';
    };

export function trackResultEvent(event: ResultEvent) {
  window.dispatchEvent(new CustomEvent('gleen:analytics', { detail: event }));
}
```

The type must not accept title, content, transcript, query, speaker, owner, or token properties.

- [ ] **Step 5: Load interface locale and owner state on the result page**

Use the existing profile storage to read \`interfaceLocale\`, load owner state through Task 3, normalize with Task 4, and pass \`copy\` plus mutation actions to ResultWorkspace.

- [ ] **Step 6: Verify and commit**

Run: \`npm test -- src/lib/result-workspace/copy.test.ts src/lib/result-workspace/navigation.test.ts src/lib/analytics/result-events.test.ts 'src/app/app/video/[id]/page.test.tsx'\`

Expected: PASS.

```bash
git add src/lib/result-workspace src/lib/analytics 'src/app/app/video/[id]'
git commit -m "feat(den-25): add localized result navigation"
```

### Task 6: Build the single reactive YouTube player state

**Files:**

- Modify: \`src/components/result-workspace/player-controller.ts\`
- Modify: \`src/components/result-workspace/player-context.tsx\`
- Create: \`src/components/result-workspace/player-context.test.tsx\`
- Modify: \`src/components/result-workspace/youtube-player.tsx\`
- Modify: \`src/components/result-workspace/youtube-player.test.tsx\`
- Create: \`src/components/result-workspace/use-playback-persistence.ts\`
- Create: \`src/components/result-workspace/use-playback-persistence.test.tsx\`

**Interfaces:**

- Produces \`VideoPlayerSnapshot\`, \`VideoPlayerController\`, and \`useVideoPlayerSnapshot(selector)\`.
- Consumes \`savePlaybackPosition\` from Task 3.

- [ ] **Step 1: Write failing state/controller tests**

```ts
expect(store.getSnapshot()).toMatchObject({
  status: 'ready',
  currentTimeMs: 370_000,
  playing: false,
  playbackRate: 1.25,
  muted: false,
});
controller.setPlaybackRate(1.5);
expect(fakePlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);
```

Also assert only one IFrame API player is constructed when full and mini controls subscribe.

- [ ] **Step 2: Define the controller and store contract**

```ts
export type VideoPlayerSnapshot = Readonly<{
  status: 'loading' | 'ready' | 'unavailable';
  currentTimeMs: number;
  durationMs: number;
  playing: boolean;
  playbackRate: number;
  availableRates: readonly number[];
  volume: number;
  muted: boolean;
  captionsAvailable: boolean;
}>;

export type VideoPlayerController = Readonly<{
  subscribe(listener: () => void): () => void;
  getSnapshot(): VideoPlayerSnapshot;
  seekTo(offsetMs: number): void;
  getCurrentTimeMs(): number;
  play(): void;
  pause(): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  toggleCaptions(): void;
  requestFullscreen(): Promise<void>;
}>;
```

- [ ] **Step 3: Synchronize the IFrame API**

Add \`onStateChange\` plus duration/rate/volume polling only while ready. Extend the local YouTube instance type with the official methods used by the controls. Seek to the saved position once after ready. Native controls remain available until custom controls mount successfully; unavailable capabilities become false in the snapshot.

- [ ] **Step 4: Add throttled playback persistence**

Persist no more often than every five seconds, flush on pause/pagehide, clamp to duration, and ignore changes smaller than one second. An error must not interrupt playback.

- [ ] **Step 5: Run focused tests and commit**

Run: \`npm test -- src/components/result-workspace/player-context.test.tsx src/components/result-workspace/youtube-player.test.tsx src/components/result-workspace/use-playback-persistence.test.tsx\`

Expected: PASS with fake timers and one player instance.

```bash
git add src/components/result-workspace
git commit -m "feat(den-25): unify result video playback state"
```

### Task 7: Match the prototype desktop player and result shell

**Files:**

- Create: \`src/components/result-workspace/player-controls.tsx\`
- Create: \`src/components/result-workspace/player-controls.test.tsx\`
- Create: \`src/components/result-workspace/chapter-rail.tsx\`
- Create: \`src/components/result-workspace/chapter-rail.test.tsx\`
- Create: \`src/components/result-workspace/result-header.tsx\`
- Create: \`src/components/result-workspace/result-navigation.tsx\`
- Modify: \`src/components/result-workspace/source-panel.tsx\`
- Modify: \`src/components/result-workspace/source-panel.test.tsx\`
- Modify: \`src/components/result-workspace/result-workspace.tsx\`
- Create: \`src/styles/result-workspace-reference.css\`
- Modify: \`src/app/layout.tsx\`

**Interfaces:**

- Consumes the Task 6 controller and Task 4 chapters.
- Produces the exact prototype two-column owner shell and functional full player.
- Share callbacks are injected into component/fixture tests here and connected to the production repository/action in Task 13. Before Task 13, omit the production Share control rather than rendering a dead action.

- [ ] **Step 1: Write failing semantic/control tests**

Assert the source header, one player, current chapter, progress slider, play/pause, jump controls, supported speed menu, volume, captions capability state, fullscreen, chapter rail, Favorite, an injected functional Share action, and six desktop tabs.

- [ ] **Step 2: Implement functional controls**

Use a native \`input type="range"\` for seek/volume with prototype styling. Speed options come only from \`availableRates\`. Captions are hidden/disabled truthfully. All icon buttons have copy-provided labels and 44 px hit areas under coarse pointer media queries.

- [ ] **Step 3: Implement source header, chapter rail, and result header**

Favorite and Share in repeated prototype locations call the same owner actions/state. Chapter selection seeks and plays; the active card uses \`aria-current="true"\`. The thumbnail uses the real source thumbnail, never the embedded prototype poster.

- [ ] **Step 4: Copy the prototype geometry into dedicated CSS**

Translate the approved selectors into result-prefixed classes. Preserve 226 px desktop sidebar context, 72 px topbar context, 16×18 px workspace padding, approximately 1.04fr/0.96fr columns, 14 px gap, prototype radii, surfaces, and exact 1180/860/620 transitions. Use existing variables or add semantically named result tokens to \`:root\`; do not paste one-off spectral colors into components.

```css
.result-page-layout {
  display: grid;
  grid-template-columns: minmax(520px, 1.04fr) minmax(500px, 0.96fr);
  gap: 14px;
  max-width: 1720px;
  margin-inline: auto;
  padding: 16px 18px 30px;
}
```

- [ ] **Step 5: Verify component behavior and desktop geometry**

Run:

```bash
npm test -- src/components/result-workspace/player-controls.test.tsx src/components/result-workspace/chapter-rail.test.tsx src/components/result-workspace/source-panel.test.tsx src/components/result-workspace/result-workspace.test.tsx
PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/result-workspace.spec.ts --project=chromium --grep "desktop"
```

Expected: PASS, no horizontal overflow at 1440×900 or 1920×1080, one player instance, zero processing spectrum.

- [ ] **Step 6: Commit**

```bash
git add src/components/result-workspace src/styles/result-workspace-reference.css src/app/layout.tsx
git commit -m "feat(den-25): match prototype result shell"
```

### Task 8: Rebuild Overview as the DEN-25 result hub

**Files:**

- Modify: \`src/components/result-workspace/overview-tab.tsx\`
- Create: \`src/components/result-workspace/artifact-link-card.tsx\`
- Create: \`src/components/result-workspace/overview-tab.test.tsx\`
- Modify: \`src/components/result-workspace/result-workspace.tsx\`
- Modify: \`src/styles/result-workspace-reference.css\`

**Interfaces:**

- Consumes \`ResultOverviewData\`, \`ResultUserState\`, recommendation rules, player snapshot, and \`openArtifact\`.
- Produces a concise hub with no detailed Summary duplication.

- [ ] **Step 1: Write failing Overview behavior tests**

Assert result statement line limits, truthful metrics/null handling, Continue Watching seek/play without tab reset, five whole-card artifact links, unavailable explanations, deterministic recommendation, and absence of Summary details/quotes.

- [ ] **Step 2: Implement the prototype-faithful hub**

Use the prototype insight surface and metrics rhythm, but render DEN-25 modules in the approved order. Each artifact card uses its semantic accent only on the controlled edge/spectral line and has hover, focus, pressed, selected, ready, processing, failed, and disabled states.

- [ ] **Step 3: Wire continuation and navigation analytics**

Continue calls \`seekTo(savedPosition)\` then \`play()\`; card/recommendation clicks change the hash and fire only typed, content-free events.

- [ ] **Step 4: Verify and commit**

Run: \`npm test -- src/components/result-workspace/overview-tab.test.tsx src/components/result-workspace/result-workspace.test.tsx\`

Expected: PASS.

```bash
git add src/components/result-workspace src/styles/result-workspace-reference.css
git commit -m "feat(den-25): rebuild result overview hub"
```

### Task 9: Match Summary, Flashcards, and Timestamps to the prototype

**Files:**

- Modify: \`src/components/result-workspace/summary-tab.tsx\`
- Modify: \`src/components/result-workspace/flashcards-tab.tsx\`
- Modify: \`src/components/result-workspace/timestamps-tab.tsx\`
- Modify: \`src/components/result-workspace/result-workspace.test.tsx\`
- Modify: \`src/styles/result-workspace-reference.css\`

**Interfaces:**

- Consumes Summary sections, saved reviews, chapter durations, owner edit actions, and shared player.
- Produces prototype accordion, study deck, and moment timeline without losing autosave.

- [ ] **Step 1: Add failing artifact interaction tests**

Test Summary accordion/Copy/timestamp/edit autosave; Flashcard flip/navigation/rating persistence/revision isolation/edit mode; Timestamps active moment/derived duration/seek-play/edit autosave.

- [ ] **Step 2: Implement Summary**

Render the prototype one-sentence hero, three metric cells, and accessible disclosure buttons. Supporting quote/timestamp controls render only when real. Keep inputs visually neutral until focus; Copy announces success/failure.

- [ ] **Step 3: Implement Flashcards**

Render the prototype progress header, 3D card, arrows, and three review buttons. Persist one rating per card/revision and advance after success or optimistic save; rollback the reviewed indicator on failure. Under reduced motion, swap faces without rotation.

- [ ] **Step 4: Implement Timestamps**

Render thumbnail, timestamp, title, description, and duration in the prototype timeline. Derive each duration from the next offset or video end. Clicking a moment seeks/plays without calling \`scrollIntoView\`.

- [ ] **Step 5: Verify and commit**

Run: \`npm test -- src/components/result-workspace/result-workspace.test.tsx\`

Expected: PASS for autosave, study, seeking, partial states, and reduced motion.

```bash
git add src/components/result-workspace src/styles/result-workspace-reference.css
git commit -m "feat(den-25): refine result study artifacts"
```

### Task 10: Implement Transcript filters, labels, download, and auto-scroll

**Files:**

- Modify: \`src/components/result-workspace/transcript-tab.tsx\`
- Create: \`src/components/result-workspace/transcript-tab.test.tsx\`
- Modify: \`src/styles/result-workspace-reference.css\`

**Interfaces:**

- Consumes Transcript v2 normalized segments and shared player snapshot.
- Produces combined search/filter, optional speaker labels, Copy/Download, and guarded auto-scroll.

- [ ] **Step 1: Write failing Transcript tests**

Cover search plus type intersection, empty result, v1 \`other\` fallback, disabled speaker toggle without reliable labels, visible labels when present, Copy/Download content, active seek/play, auto-scroll only while active, user-scroll suppression, and reduced motion.

- [ ] **Step 2: Implement combined filtering**

```ts
const visibleSegments = transcript.segments.filter((segment) => {
  const matchesText = segment.text.toLocaleLowerCase(locale).includes(query);
  const matchesType = filter === 'all' || segment.segmentType === filter;
  return matchesText && matchesType;
});
```

- [ ] **Step 3: Implement labels and auto-scroll**

Enable speaker controls only when at least one reliable label exists. Track temporary manual-scroll suppression from wheel/touch/pointer interaction. Auto-scroll only when Transcript is active and the active segment changed due to playback; use \`behavior: reducedMotion ? 'auto' : 'smooth'\`.

- [ ] **Step 4: Implement Copy and Download**

Both use the complete transcript rather than the filtered view. Download a UTF-8 text file with timestamp and optional speaker prefix. Clipboard/download outcomes use an accessible status message.

- [ ] **Step 5: Verify and commit**

Run: \`npm test -- src/components/result-workspace/transcript-tab.test.tsx src/components/result-workspace/result-workspace.test.tsx\`

Expected: PASS.

```bash
git add src/components/result-workspace/transcript-tab.tsx src/components/result-workspace/transcript-tab.test.tsx src/styles/result-workspace-reference.css
git commit -m "feat(den-25): add transcript study controls"
```

### Task 11: Implement selectable Export with one serializer

**Files:**

- Modify: \`src/lib/result-workspace/markdown.ts\`
- Modify: \`src/lib/result-workspace/markdown.test.ts\`
- Modify: \`src/components/result-workspace/export-tab.tsx\`
- Create: \`src/components/result-workspace/export-tab.test.tsx\`
- Modify: \`src/styles/result-workspace-reference.css\`

**Interfaces:**

- Produces \`ExportSelection\` and \`serializeExport(model, destination, selection)\`.
- Consumes the draft model so preview/export include unsaved current edits consistently.

- [ ] **Step 1: Write failing serializer and UI tests**

```ts
const selection = {
  summary: true,
  keyTakeaways: false,
  chapters: true,
  transcript: false,
  metadata: true,
};
expect(serializeExport(model, 'markdown', selection)).not.toContain(
  'Key takeaways',
);
expect(preview.textContent).toBe(downloadedText);
```

Also test empty selection, unavailable artifact controls, NotebookLM/Obsidian filenames, and disconnected Notion.

- [ ] **Step 2: Implement the closed selection contract**

Use five booleans matching the prototype inclusion rows. The serializer is pure and is the only source for preview, copy, and download. Missing/failed selected artifacts add an honest unavailable note or disable that option; they never produce empty headings presented as content.

- [ ] **Step 3: Match the prototype Export UI**

Implement destination cards, inclusion rows, live preview, action label, and privacy line. Notion remains disabled with Connection required until a real integration exists. Empty selection disables Export.

- [ ] **Step 4: Verify and commit**

Run: \`npm test -- src/lib/result-workspace/markdown.test.ts src/components/result-workspace/export-tab.test.tsx\`

Expected: PASS with byte-for-byte preview/output equivalence.

```bash
git add src/lib/result-workspace/markdown.ts src/lib/result-workspace/markdown.test.ts src/components/result-workspace/export-tab.tsx src/components/result-workspace/export-tab.test.tsx src/styles/result-workspace-reference.css
git commit -m "feat(den-25): add selective result export preview"
```

### Task 12: Add mobile result navigation, sheets, mini-player, scroll memory, and swipe

**Files:**

- Create: \`src/components/result-workspace/mobile-mini-player.tsx\`
- Create: \`src/components/result-workspace/mobile-result-navigation.tsx\`
- Create: \`src/components/result-workspace/result-sheet.tsx\`
- Create: \`src/components/result-workspace/chapter-sheet.tsx\`
- Create: \`src/components/result-workspace/use-player-visibility.ts\`
- Create: \`src/components/result-workspace/use-player-visibility.test.tsx\`
- Create: \`src/components/result-workspace/use-result-scroll-memory.ts\`
- Create: \`src/components/result-workspace/use-result-scroll-memory.test.tsx\`
- Create: \`src/components/result-workspace/use-artifact-swipe.ts\`
- Create: \`src/components/result-workspace/use-artifact-swipe.test.tsx\`
- Modify: \`src/components/result-workspace/result-workspace.tsx\`
- Modify: \`src/components/app-shell/app-shell.tsx\`
- Modify: \`src/components/app-shell/app-shell.test.tsx\`
- Modify: \`src/styles/result-workspace-reference.css\`

**Interfaces:**

- Consumes shared player, chapters, hash navigation, and Radix Dialog.
- Produces one mobile mini-player, five-item result nav, More sheet, Chapters sheet, session scroll memory, and guarded swipe.

- [ ] **Step 1: Write failing hook and shell tests**

Assert IntersectionObserver threshold behavior, one mini-player after orientation changes, per-analysis/per-artifact scroll keys and clamping, hash restoration, horizontal threshold, vertical rejection, and protected interactive targets. Assert global AppShell bottom nav is hidden only for \`/app/video/_\` and the matching \`/app-shell-fixture/app/video/_\` test route on mobile.

- [ ] **Step 2: Implement visibility and mini-player**

\`usePlayerVisibility(ref)\` owns one observer and disconnects on cleanup. Render mini-player only when the full player is outside the threshold and the player is ready. Place it above the result nav using safe-area variables. Expand scrolls the full player into view without changing hash.

- [ ] **Step 3: Implement result navigation and sheets**

Primary mobile items are Overview, Summary, Flashcards, Timestamps, More. More contains Transcript and Export. Chapters lists the current chapter and seeks/plays on selection. Build both sheets with the existing Radix Dialog so focus trap, inert background, Escape, focus restoration, and scroll locking are inherited; add the prototype drag handle and explicit Close.

- [ ] **Step 4: Implement scroll memory and swipe**

Store \`gleen:result-scroll:<analysisId>:<artifact>\` in sessionStorage. Save before changing artifact and restore in \`requestAnimationFrame\` after the destination panel mounts; clamp to document max. Swipe requires at least 56 px horizontal travel and a 1.4 horizontal/vertical ratio. Reject \`input,textarea,button,[role=slider],[data-swipe-guard],[data-horizontal-scroll]\` and active selection.

- [ ] **Step 5: Verify unit and browser behavior**

Run:

```bash
npm test -- src/components/result-workspace/use-player-visibility.test.tsx src/components/result-workspace/use-result-scroll-memory.test.tsx src/components/result-workspace/use-artifact-swipe.test.tsx src/components/app-shell/app-shell.test.tsx
PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/result-workspace.spec.ts --project=mobile-chrome --grep "durable"
```

Expected: PASS with no second iframe, no double bottom navigation, and no page jump on timestamp seek.

- [ ] **Step 6: Commit**

```bash
git add src/components/result-workspace src/components/app-shell/app-shell.tsx src/components/app-shell/app-shell.test.tsx src/styles/result-workspace-reference.css
git commit -m "feat(den-25): add mobile result study navigation"
```

### Task 13: Add secure Favorite and public read-only Share

**Files:**

- Create: \`src/lib/supabase/admin.ts\`
- Create: \`src/lib/supabase/admin.test.ts\`
- Modify: \`src/env.ts\`
- Modify: \`src/env.test.ts\`
- Modify: \`.env.example\`
- Create: \`src/lib/result-workspace/share.ts\`
- Create: \`src/lib/result-workspace/share-repository.ts\`
- Create: \`src/lib/result-workspace/share-repository.test.ts\`
- Modify: \`src/lib/result-workspace/actions.ts\`
- Modify: \`src/lib/result-workspace/actions.test.ts\`
- Create: \`src/app/share/[token]/page.tsx\`
- Create: \`src/app/share/[token]/page.test.tsx\`
- Create: \`src/app/share/[token]/not-found.tsx\`
- Modify: \`src/components/result-workspace/result-workspace.tsx\`
- Test: \`tests/e2e/result-share.spec.ts\`

**Interfaces:**

- Produces \`createResultShare\`, \`revokeResultShare\`, \`PublicResultProjection\`, and anonymous \`/share/[token]\`.
- Consumes tables from Task 2 and the prototype-faithful workspace in read-only mode.

- [ ] **Step 1: Write failing secret-boundary, repository, action, and page tests**

Test 32-byte base64url token creation, owner-only create/revoke, active token reuse/rotation, anonymous projection, revoked/malformed/foreign token indistinguishability, no profile/email/private progress/drafts/edit actions, and no secret import from a client module.

- [ ] **Step 2: Centralize the admin client**

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { validateSupabaseAdminEnv } from '@/env';

export function createAdminSupabaseClient() {
  const env = validateSupabaseAdminEnv(process.env);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

Refactor \`analysis-pipeline/workflow.ts\` to use this helper. Document \`SUPABASE_SECRET_KEY\` in \`.env.example\` with an unmistakable server-only warning.

- [ ] **Step 3: Implement token and repository boundaries**

Generate \`randomBytes(32).toString('base64url')\`, validate exactly 43 URL-safe characters, and store one active/revoked share row per analysis/owner. Owner mutations use the authenticated client and both IDs. Public lookup uses the admin client server-side, exact token equality, \`revoked_at is null\`, and returns a hand-built projection containing only safe source fields and ready artifact content.

- [ ] **Step 4: Implement actions and public page**

\`createResultShare\` returns \`{status:'created', url}\`; \`revokeResultShare\` returns saved/error. Construct the URL from validated \`NEXT_PUBLIC_APP_URL\`. The public page uses \`noindex\`, neutral not-found copy, owner-independent metadata, and \`ResultWorkspace mode="public"\` that removes Favorite, Share management, editing, autosave, private recommendations, and private progress.

- [ ] **Step 5: Verify public security and browser flow**

Run:

```bash
npm test -- src/lib/supabase/admin.test.ts src/lib/result-workspace/share-repository.test.ts src/lib/result-workspace/actions.test.ts 'src/app/share/[token]/page.test.tsx'
PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/result-share.spec.ts --project=chromium
```

Expected: PASS for create → anonymous open → read-only → revoke → neutral unavailable. No share token appears in analytics events or rendered diagnostic text.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/env.ts src/env.test.ts src/lib/supabase src/lib/result-workspace src/app/share src/components/result-workspace tests/e2e/result-share.spec.ts
git commit -m "feat(den-25): add revocable public result sharing"
```

### Task 14: Complete visual regression and required viewport coverage

**Files:**

- Modify: \`tests/e2e/result-workspace.spec.ts\`
- Create: \`tests/e2e/result-workspace.visual.spec.ts\`
- Create: \`tests/e2e/result-workspace.visual.spec.ts-snapshots/*\`
- Modify: \`playwright.config.ts\`
- Modify: \`src/styles/result-workspace-reference.css\`

**Interfaces:**

- Consumes the completed fixture and UI.
- Produces reviewed screenshots for every required DEN-25 state.

- [ ] **Step 1: Add required viewport matrix and screenshots**

Capture desktop Overview, mobile Overview top, mobile mini-player, Chapters sheet, More sheet, and mobile Transcript with mini-player at:

- 320×568
- 375×667
- 390×844
- 430×932
- 768×1024
- 1440×900
- 1920×1080

Use stable fixtures, hide only nondeterministic iframe pixels, and never mask layout regions that need review.

- [ ] **Step 2: Run screenshots to expose visual differences**

Run: \`PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/result-workspace.visual.spec.ts --project=chromium\`

Expected: FAIL until baselines are deliberately generated/reviewed.

- [ ] **Step 3: Compare directly with the prototype**

Open the local prototype and the fixture at matching widths. Correct CSS/markup until composition, typography, spacing, surfaces, controls, and responsive transitions match one-to-one. Do not approve snapshots while known differences remain.

- [ ] **Step 4: Verify interaction edge cases**

Extend browser coverage for:

- timestamp seek without page jump;
- Transcript → Flashcards → Transcript scroll restoration;
- More sheet and Chapters sheet keyboard/Escape;
- one mini-player through orientation changes;
- reduced motion;
- 200% browser zoom;
- 3+ hour title/time fixture;
- partial/failed/disconnected states;
- network failure rollback;
- Back/Forward hash behavior.

- [ ] **Step 5: Review and commit visual baselines**

Run:

```bash
PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/result-workspace.visual.spec.ts --project=chromium --update-snapshots
PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/result-workspace.visual.spec.ts tests/e2e/result-workspace.spec.ts tests/e2e/result-share.spec.ts --project=chromium
```

Expected: PASS after human review against the prototype.

```bash
git add tests/e2e playwright.config.ts src/styles/result-workspace-reference.css
git commit -m "test(den-25): lock result prototype fidelity"
```

### Task 15: Run full verification and staging smoke tests

**Files:**

- Modify only if a verification failure exposes an in-scope defect.

**Interfaces:**

- Produces evidence that DEN-25 is ready for review; does not mark Linear Done automatically.

- [ ] **Step 1: Run repository quality gates**

Run:

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: every command exits 0. Review formatting changes and keep only DEN-25 files.

- [ ] **Step 2: Run complete browser coverage**

Run:

```bash
PLAYWRIGHT_PORT=3017 npm run test:e2e
PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/result-workspace.spec.ts tests/e2e/result-workspace.visual.spec.ts tests/e2e/result-share.spec.ts --project=chromium --project=mobile-chrome
```

Expected: PASS with no unexpected console/page errors.

- [ ] **Step 3: Verify Supabase locally**

Run:

```bash
npx supabase db reset
npx supabase db advisors
npx supabase migration list --local
```

Expected: migrations apply from zero, no new security/performance advisor failures, and the DEN-25 migration is present.

- [ ] **Step 4: Deploy the branch to staging**

Use the existing Vercel staging project and staging Supabase project. Confirm all required environment values, especially the server-only \`SUPABASE_SECRET_KEY\`, without printing them. Apply the reviewed migration to staging through the established deployment workflow.

- [ ] **Step 5: Smoke-test real integrations**

In Chrome, verify:

1. analyze a real YouTube video;
2. automatic handoff to the result page;
3. exact desktop/mobile prototype layout;
4. custom player controls and saved position;
5. all artifacts and partial states;
6. Favorite survives reload;
7. transcript filters/auto-scroll;
8. selected export preview equals download;
9. anonymous Share opens read-only and stops after revoke;
10. no application console errors and no generated content in analytics payloads.

- [ ] **Step 6: Request review**

Run:

```bash
git status --short
git diff --check origin/main...HEAD
git log --oneline origin/main..HEAD
```

Expected: clean worktree, no whitespace errors, focused DEN-25 commits. Then use \`superpowers:requesting-code-review\`; only after review and product-owner screenshot approval use \`superpowers:finishing-a-development-branch\`.

---

## Plan self-review checklist

- Every approved DEN-25 requirement maps to Tasks 4–14.
- Prototype-only additions map to Tasks 6, 7, 10, 11, and 13.
- One-to-one visual fidelity is enforced by Tasks 1, 7, and 14 rather than inferred from component tests.
- Supabase tables are private to authenticated owners; anonymous public reads go only through the server-only safe projection.
- Player, mini-player, chapters, timestamps, and transcript share one iframe and one reactive store.
- Legacy artifacts remain readable; unknown counts remain null; no speaker/quote/timestamp is fabricated.
- Existing autosave and artifact editing remain covered in Tasks 8–10 and the full DEN-18 regression suite.
- Final verification includes formatting, lint, strict types, unit/integration tests, build, desktop/mobile, reduced motion, zoom, visual review, local database advisors, and real staging integrations.

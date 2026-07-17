# DEN-17 Durable Analysis Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a durable, observable YouTube analysis pipeline that persists real progress and partial artifacts, survives reloads and retries, and drives the approved Spectral Rail.

**Architecture:** Supabase is the product source of truth for jobs, events, artifacts, and reservations; Vercel Workflow is the durable executor. Focused artifact generators call a server-only OpenRouter adapter through a provider interface, while the result page consumes a server snapshot plus Realtime updates with polling fallback.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Supabase/Postgres/RLS/Realtime, Vercel Workflow, OpenRouter HTTP API, Zod 4, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve the dark-only “The Prism” design language and match the approved Spectral Rail reference without redesign.
- Use shared CSS design tokens; summary is amber, flashcards purple, timestamps cyan, and export lime.
- Support desktop, tablet, mobile, keyboard navigation, and `prefers-reduced-motion`.
- Keep `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and trusted database credentials server-only.
- Every OpenRouter request sets `require_parameters: true`, `data_collection: "deny"`, `zdr: true`, and `allow_fallbacks: true`.
- Do not log transcripts, prompts, or generated content.
- Store artifact formats with an explicit schema version.
- Do not add billing plans, prices, currencies, balances, or real credit rules; DEN-17 uses `NoopUsageLedger`.
- Add only the `workflow` production dependency; use native `fetch` for OpenRouter.
- Preserve the user's unrelated `next-env.d.ts` modification.

---

## File Map

- `supabase/migrations/202607170001_create_analysis_pipeline.sql`: pipeline tables, constraints, indexes, RLS, Realtime publication, and atomic job creation/retry functions.
- `src/lib/analysis-pipeline/domain.ts`: canonical job, event, artifact, reservation, snapshot, and safe-error types plus Zod row parsers.
- `src/lib/analysis-pipeline/repository.ts`: persistence interface used by workflow and UI loaders.
- `src/lib/analysis-pipeline/supabase-repository.ts`: idempotent Supabase implementation.
- `src/lib/analysis-pipeline/provider.ts`: model-neutral structured-generation interface and error taxonomy.
- `src/lib/analysis-pipeline/openrouter-provider.ts`: server-only OpenRouter HTTP adapter.
- `src/lib/analysis-pipeline/artifact-schemas.ts`: versioned summary, flashcard, and timestamp schemas.
- `src/lib/analysis-pipeline/generators.ts`: focused prompts and artifact generation functions.
- `src/lib/analysis-pipeline/usage-ledger.ts`: `UsageLedger` and `NoopUsageLedger`.
- `src/lib/analysis-pipeline/workflow.ts`: durable orchestration and step functions.
- `src/lib/analysis-pipeline/start.ts`: production workflow starter and dependency assembly.
- `src/lib/analysis-pipeline/retry-actions.ts`: authenticated selective-retry server action.
- `src/lib/analysis-pipeline/client-state.ts`: snapshot/event-to-Spectral-Rail reducer.
- `src/components/app-shell/analysis-processing-screen.tsx`: processing/partial-result client controller, Realtime, polling, and retry UI.
- `src/app/app/video/[id]/page.tsx`: owned intake and pipeline snapshot loader.
- Existing intake files: create and start a job after a new intake or reanalysis is persisted.
- Tests live beside their modules; end-to-end coverage extends `tests/e2e/analyze-processing.spec.ts` and its fixtures.

---

### Task 1: Persistent Pipeline Contract

**Files:**
- Create: `supabase/migrations/202607170001_create_analysis_pipeline.sql`
- Create: `src/lib/analysis-pipeline/domain.ts`
- Create: `src/lib/analysis-pipeline/domain.test.ts`
- Create: `src/lib/analysis-pipeline/migration.test.ts`

**Interfaces:**
- Produces: `AnalysisJob`, `AnalysisJobEvent`, `AnalysisArtifact`, `UsageReservation`, `AnalysisSnapshot`, `parseAnalysisSnapshot(input: unknown): AnalysisSnapshot`.
- Consumes: existing `analysis_intakes.id`, `analysis_intakes.user_id`, and selected artifact values.

- [ ] **Step 1: Write failing domain and migration contract tests**

```ts
// src/lib/analysis-pipeline/domain.test.ts
import { parseAnalysisSnapshot } from './domain';

it('parses a partial snapshot with one ready and one failed artifact', () => {
  const snapshot = parseAnalysisSnapshot(snapshotRowFixture({ status: 'partial' }));
  expect(snapshot.job.status).toBe('partial');
  expect(snapshot.artifacts.map(({ kind, status }) => [kind, status])).toEqual([
    ['summary', 'ready'],
    ['flashcards', 'failed'],
  ]);
});

it('rejects content on a failed artifact', () => {
  expect(() => parseAnalysisSnapshot(failedArtifactWithContentFixture())).toThrow();
});
```

```ts
// src/lib/analysis-pipeline/migration.test.ts
it('defines owned RLS policies and atomic pipeline RPCs', () => {
  const sql = readMigration('202607170001_create_analysis_pipeline.sql');
  expect(sql).toContain('create function public.create_analysis_pipeline');
  expect(sql).toContain('create function public.retry_analysis_pipeline');
  expect(sql).toContain('analysis_jobs_select_own');
  expect(sql).toContain('analysis_artifacts_select_own');
  expect(sql).toContain("alter publication supabase_realtime add table public.analysis_jobs");
});
```

- [ ] **Step 2: Run the tests and verify the missing modules fail**

Run: `npm test -- src/lib/analysis-pipeline/domain.test.ts src/lib/analysis-pipeline/migration.test.ts`

Expected: FAIL because `domain.ts` and the migration do not exist.

- [ ] **Step 3: Add the migration with constrained tables and RPCs**

```sql
create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_run_id text,
  status text not null check (status in ('queued','running','partial','complete','failed')),
  stage text not null check (stage in ('validating','transcript','structuring','artifacts','complete')),
  attempt integer not null default 1 check (attempt > 0),
  revision bigint not null default 1 check (revision > 0),
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analysis_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.analysis_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  stage text not null check (stage in ('validating','transcript','structuring','artifacts','complete')),
  status text not null check (status in ('started','completed','retrying','failed')),
  error_code text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique(job_id, idempotency_key)
);

create table public.analysis_artifacts (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analysis_intakes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('transcript','summary','flashcards','timestamps')),
  status text not null check (status in ('pending','ready','failed')),
  schema_version integer not null default 1 check (schema_version > 0),
  content jsonb,
  error_code text,
  generated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(analysis_id, kind),
  check ((status = 'ready' and content is not null and error_code is null)
    or (status = 'failed' and content is null and error_code is not null)
    or (status = 'pending' and content is null and error_code is null))
);

create table public.analysis_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.analysis_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('reserved','settled','released')),
  updated_at timestamptz not null default now()
);
```

Add ownership RLS policies using `auth.uid() = user_id` for authenticated reads, user/history indexes, updated-at triggers that also increment `analysis_jobs.revision`, and Realtime publication for `analysis_jobs`, `analysis_job_events`, and `analysis_artifacts`. Add `security invoker` RPCs `create_analysis_pipeline(analysis_id uuid)` and `retry_analysis_pipeline(analysis_id uuid)`; both verify ownership through the caller's RLS-visible intake. Creation inserts one queued job, one reserved reservation, and pending rows for the intake's selected artifacts. Retry locks the job, increments `attempt` and `revision`, resets only pending/failed artifacts, and retains ready artifacts.

- [ ] **Step 4: Implement strict domain parsers**

```ts
export const jobStatusSchema = z.enum([
  'queued', 'running', 'partial', 'complete', 'failed',
]);
export const jobStageSchema = z.enum([
  'validating', 'transcript', 'structuring', 'artifacts', 'complete',
]);
export const artifactKindSchema = z.enum([
  'transcript', 'summary', 'flashcards', 'timestamps',
]);
export type AnalysisJobStatus = z.infer<typeof jobStatusSchema>;
export type AnalysisJobStage = z.infer<typeof jobStageSchema>;
export type ArtifactKind = z.infer<typeof artifactKindSchema>;

export function parseAnalysisSnapshot(input: unknown): AnalysisSnapshot {
  return snapshotRowSchema.parse(input);
}
```

Map snake-case database rows into readonly camel-case domain objects and enforce the artifact content/status invariant in Zod.

- [ ] **Step 5: Run tests and migration lint checks**

Run: `npm test -- src/lib/analysis-pipeline/domain.test.ts src/lib/analysis-pipeline/migration.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the persistent contract**

```bash
git add supabase/migrations/202607170001_create_analysis_pipeline.sql src/lib/analysis-pipeline/domain.ts src/lib/analysis-pipeline/domain.test.ts src/lib/analysis-pipeline/migration.test.ts
git commit -m "feat(den-17): add analysis pipeline persistence"
```

### Task 2: Idempotent Supabase Repository and Usage Ledger

**Files:**
- Create: `src/lib/analysis-pipeline/repository.ts`
- Create: `src/lib/analysis-pipeline/supabase-repository.ts`
- Create: `src/lib/analysis-pipeline/supabase-repository.test.ts`
- Create: `src/lib/analysis-pipeline/usage-ledger.ts`
- Create: `src/lib/analysis-pipeline/usage-ledger.test.ts`

**Interfaces:**
- Consumes: Task 1 domain types and database RPCs.
- Produces: `AnalysisRepository`, `createSupabaseAnalysisRepository(client)`, `UsageLedger`, and `createNoopUsageLedger(repository)`.

- [ ] **Step 1: Write failing repository and ledger tests**

```ts
it('does not replace an already ready artifact', async () => {
  const repository = createSupabaseAnalysisRepository(clientWithReadyArtifact());
  await repository.saveArtifactReady({
    jobId, analysisId, kind: 'summary', schemaVersion: 1, content: summary,
  });
  expect(fakeClient.updates).toHaveLength(0);
});

it('settles and releases through repository state transitions', async () => {
  const ledger = createNoopUsageLedger(repository);
  await ledger.settle(jobId);
  expect(repository.setReservationStatus).toHaveBeenCalledWith(jobId, 'settled');
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- src/lib/analysis-pipeline/supabase-repository.test.ts src/lib/analysis-pipeline/usage-ledger.test.ts`

Expected: FAIL because repository and ledger modules do not exist.

- [ ] **Step 3: Define the repository boundary**

```ts
export type AnalysisRepository = Readonly<{
  createForAnalysis(userId: string, analysisId: string): Promise<AnalysisSnapshot>;
  findOwnedSnapshot(userId: string, analysisId: string): Promise<AnalysisSnapshot | null>;
  findSnapshotByJobId(jobId: string): Promise<AnalysisSnapshot>;
  attachWorkflowRun(jobId: string, runId: string): Promise<void>;
  recordEvent(input: NewAnalysisEvent): Promise<void>;
  setJobState(jobId: string, state: JobStateUpdate): Promise<void>;
  saveArtifactReady(input: ReadyArtifactWrite): Promise<void>;
  saveArtifactFailed(input: FailedArtifactWrite): Promise<void>;
  setReservationStatus(jobId: string, status: 'settled' | 'released'): Promise<void>;
  prepareRetry(userId: string, analysisId: string): Promise<AnalysisSnapshot>;
}>;
```

- [ ] **Step 4: Implement repository parsing and idempotent writes**

Use the Task 1 parsers at every database boundary. Implement ready-artifact writes with a conditional update (`status != 'ready'`), event writes with `upsert(..., { onConflict: 'job_id,idempotency_key', ignoreDuplicates: true })`, and convert database errors into `AnalysisRepositoryError('persistence_failure')`.

```ts
async saveArtifactReady(input) {
  const current = await loadArtifact(input.analysisId, input.kind);
  if (current.status === 'ready') return;
  await updateArtifact(input.analysisId, input.kind, {
    status: 'ready', schema_version: input.schemaVersion,
    content: input.content, error_code: null, generated_at: new Date().toISOString(),
  });
}
```

- [ ] **Step 5: Implement the no-op usage ledger**

```ts
export type UsageLedger = Readonly<{
  settle(jobId: string): Promise<void>;
  release(jobId: string): Promise<void>;
}>;

export function createNoopUsageLedger(repository: AnalysisRepository): UsageLedger {
  return {
    settle: (jobId) => repository.setReservationStatus(jobId, 'settled'),
    release: (jobId) => repository.setReservationStatus(jobId, 'released'),
  };
}
```

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- src/lib/analysis-pipeline/supabase-repository.test.ts src/lib/analysis-pipeline/usage-ledger.test.ts`

Expected: PASS.

```bash
git add src/lib/analysis-pipeline/repository.ts src/lib/analysis-pipeline/supabase-repository.ts src/lib/analysis-pipeline/supabase-repository.test.ts src/lib/analysis-pipeline/usage-ledger.ts src/lib/analysis-pipeline/usage-ledger.test.ts
git commit -m "feat(den-17): add idempotent pipeline repository"
```

### Task 3: Structured OpenRouter Provider

**Files:**
- Modify: `src/env.ts`
- Modify: `src/env.test.ts`
- Create: `src/lib/analysis-pipeline/provider.ts`
- Create: `src/lib/analysis-pipeline/openrouter-provider.ts`
- Create: `src/lib/analysis-pipeline/openrouter-provider.test.ts`

**Interfaces:**
- Consumes: native `fetch`, Zod schemas supplied by generators.
- Produces: `StructuredGenerationProvider.generate<T>(request): Promise<GenerationResult<T>>`, `ProviderError`, `validateAnalysisProviderEnv`.

- [ ] **Step 1: Write failing environment and HTTP contract tests**

```ts
it('requires server-only OpenRouter configuration', () => {
  expect(() => validateAnalysisProviderEnv({})).toThrow('OPENROUTER_API_KEY is required');
});

it('sends strict schema and mandatory privacy routing', async () => {
  const provider = createOpenRouterProvider({ apiKey: 'secret', model: 'model/id', fetch: fetchSpy });
  await provider.generate(requestFixture());
  expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string)).toMatchObject({
    model: 'model/id',
    response_format: { type: 'json_schema', json_schema: { strict: true } },
    provider: { require_parameters: true, data_collection: 'deny', zdr: true, allow_fallbacks: true },
  });
});

it.each([408, 429, 502, 503])('classifies %i as retryable', async (status) => {
  await expect(providerForStatus(status).generate(requestFixture())).rejects.toMatchObject({ retryable: true });
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- src/env.test.ts src/lib/analysis-pipeline/openrouter-provider.test.ts`

Expected: FAIL because analysis-provider configuration and adapter are absent.

- [ ] **Step 3: Add server environment validation**

```ts
export type AnalysisProviderEnv = Readonly<{
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
}>;

export function validateAnalysisProviderEnv(input: NodeJS.ProcessEnv): AnalysisProviderEnv {
  const apiKey = input.OPENROUTER_API_KEY?.trim();
  const model = input.OPENROUTER_MODEL?.trim();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');
  if (!model) throw new Error('OPENROUTER_MODEL is required');
  return Object.freeze({ OPENROUTER_API_KEY: apiKey, OPENROUTER_MODEL: model });
}
```

- [ ] **Step 4: Define and implement the provider adapter**

```ts
export type StructuredGenerationRequest<T> = Readonly<{
  name: string;
  system: string;
  input: string;
  jsonSchema: Record<string, unknown>;
  parse(value: unknown): T;
}>;

export class ProviderError extends Error {
  constructor(
    readonly code: SafeAnalysisErrorCode,
    readonly retryable: boolean,
    readonly retryAfterMs?: number,
  ) { super(code); }
}
```

POST to `https://openrouter.ai/api/v1/chat/completions`, parse only `choices[0].message.content`, validate it through `request.parse`, and expose request ID/model/usage as metadata without logging content. Map 408/429/502/503 and network timeouts to retryable errors; map 400/401/402/403/404/422 to controlled fatal codes. Invalid JSON/schema is retryable for workflow policy.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/env.test.ts src/lib/analysis-pipeline/openrouter-provider.test.ts`

Expected: PASS, including assertions that request bodies never expose the API key.

```bash
git add src/env.ts src/env.test.ts src/lib/analysis-pipeline/provider.ts src/lib/analysis-pipeline/openrouter-provider.ts src/lib/analysis-pipeline/openrouter-provider.test.ts
git commit -m "feat(den-17): add structured OpenRouter adapter"
```

### Task 4: Versioned Artifact Generators

**Files:**
- Create: `src/lib/analysis-pipeline/artifact-schemas.ts`
- Create: `src/lib/analysis-pipeline/artifact-schemas.test.ts`
- Create: `src/lib/analysis-pipeline/generators.ts`
- Create: `src/lib/analysis-pipeline/generators.test.ts`
- Create: `src/lib/analysis-pipeline/deterministic-provider.ts`

**Interfaces:**
- Consumes: `StructuredGenerationProvider`, normalized transcript segments, intake configuration.
- Produces: `generateSummary`, `generateFlashcards`, `generateTimestamps`, and deterministic provider fixtures.

- [ ] **Step 1: Write failing schema and prompt-boundary tests**

```ts
it('rejects a flashcard without a front or back', () => {
  expect(flashcardsArtifactSchema.safeParse({ schemaVersion: 1, cards: [{ front: '', back: 'A' }] }).success).toBe(false);
});

it('passes locale and preset to summary generation', async () => {
  await generateSummary(provider, contextFixture({ outputLocale: 'uk', summaryPreset: 'detailed' }));
  expect(provider.requests[0]).toMatchObject({ name: 'gleen_summary_v1' });
  expect(provider.requests[0].input).toContain('Output locale: uk');
  expect(provider.requests[0].input).toContain('Preset: detailed');
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.test.ts`

Expected: FAIL because schemas and generators do not exist.

- [ ] **Step 3: Implement versioned schemas and JSON Schema constants**

```ts
export const summaryArtifactSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().trim().min(1),
  overview: z.string().trim().min(1),
  keyPoints: z.array(z.string().trim().min(1)).min(1).max(20),
});

export const flashcardsArtifactSchema = z.object({
  schemaVersion: z.literal(1),
  cards: z.array(z.object({ front: z.string().trim().min(1), back: z.string().trim().min(1) })).min(1).max(30),
});

export const timestampsArtifactSchema = z.object({
  schemaVersion: z.literal(1),
  chapters: z.array(z.object({ offsetMs: z.number().int().nonnegative(), title: z.string().trim().min(1), description: z.string().trim().min(1) })).min(1),
});
```

- [ ] **Step 4: Implement focused generators and deterministic provider**

Keep each system prompt limited to one artifact, interpolate only normalized transcript text plus explicit locale/preset, and validate timestamps against video duration after provider parsing. The deterministic provider returns fixture values by request `name` and can be configured to throw a `ProviderError` a fixed number of times.

```ts
export async function generateSummary(provider: StructuredGenerationProvider, context: GeneratorContext) {
  return provider.generate({
    name: 'gleen_summary_v1',
    system: SUMMARY_SYSTEM_PROMPT,
    input: formatGeneratorInput(context),
    jsonSchema: summaryJsonSchema,
    parse: (value) => summaryArtifactSchema.parse(value),
  });
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.test.ts`

Expected: PASS.

```bash
git add src/lib/analysis-pipeline/artifact-schemas.ts src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.ts src/lib/analysis-pipeline/generators.test.ts src/lib/analysis-pipeline/deterministic-provider.ts
git commit -m "feat(den-17): add artifact generators"
```

### Task 5: Durable Workflow and Selective Retry

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/analysis-pipeline/workflow.ts`
- Create: `src/lib/analysis-pipeline/workflow.test.ts`
- Create: `src/lib/analysis-pipeline/start.ts`
- Create: `src/lib/analysis-pipeline/start.test.ts`

**Interfaces:**
- Consumes: repository, generators, provider, usage ledger.
- Produces: `runAnalysisWorkflow(input: { jobId: string }): Promise<void>` and `startAnalysis(jobId: string): Promise<{ runId: string }>`.

- [ ] **Step 1: Install the durable execution dependency**

Run: `npm install workflow`

Expected: `workflow` appears in `dependencies`; explain in the commit that it is required for persisted steps, retries, and deployment-safe resume.

- [ ] **Step 2: Write failing orchestration tests with deterministic dependencies**

```ts
it('persists stages and settles after all requested artifacts succeed', async () => {
  await executeAnalysisPipeline({ jobId, repository, provider, ledger });
  expect(repository.recordedStages).toEqual(['validating','transcript','structuring','artifacts','complete']);
  expect(ledger.settle).toHaveBeenCalledWith(jobId);
});

it('keeps ready artifacts, marks partial, and releases reservation', async () => {
  provider.failAlways('gleen_flashcards_v1');
  await executeAnalysisPipeline({ jobId, repository, provider, ledger });
  expect(repository.artifact('summary').status).toBe('ready');
  expect(repository.job.status).toBe('partial');
  expect(ledger.release).toHaveBeenCalledWith(jobId);
});

it('skips ready artifacts during a retry attempt', async () => {
  repository.seedReady('summary');
  await executeAnalysisPipeline({ jobId, repository, provider, ledger });
  expect(provider.names).not.toContain('gleen_summary_v1');
});
```

- [ ] **Step 3: Verify tests fail**

Run: `npm test -- src/lib/analysis-pipeline/workflow.test.ts src/lib/analysis-pipeline/start.test.ts`

Expected: FAIL because workflow modules do not exist.

- [ ] **Step 4: Implement testable orchestration and durable wrappers**

```ts
export async function runAnalysisWorkflow(input: { jobId: string }) {
  'use workflow';
  await markValidating(input.jobId);
  await normalizeTranscript(input.jobId);
  await buildStructuredContext(input.jobId);
  await generateRequestedArtifacts(input.jobId);
  await finalizeAnalysis(input.jobId);
}

async function generateRequestedArtifacts(jobId: string) {
  'use step';
  return executeArtifactStage(jobId, createProductionDependencies());
}
```

Keep pure/testable orchestration separate from directive-bearing wrappers. Give provider steps bounded retries; translate fatal provider failures to Workflow `FatalError` and retryable failures to `RetryableError` with `retryAfter` when present. Finalization derives `complete`, `partial`, or `failed` from persisted requested-artifact states, then settles or releases the ledger.

- [ ] **Step 5: Implement the starter**

```ts
import { start } from 'workflow/api';

export async function startAnalysis(jobId: string) {
  const run = await start(runAnalysisWorkflow, [{ jobId }]);
  await productionRepository().attachWorkflowRun(jobId, run.runId);
  return { runId: run.runId };
}
```

If starting fails after atomic job creation, persist a controlled failed state and release the reservation so the user can retry.

- [ ] **Step 6: Run focused tests, typecheck, and commit**

Run: `npm test -- src/lib/analysis-pipeline/workflow.test.ts src/lib/analysis-pipeline/start.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS with Workflow directives and imports.

```bash
git add package.json package-lock.json src/lib/analysis-pipeline/workflow.ts src/lib/analysis-pipeline/workflow.test.ts src/lib/analysis-pipeline/start.ts src/lib/analysis-pipeline/start.test.ts
git commit -m "feat(den-17): orchestrate durable analysis workflow"
```

### Task 6: Start Jobs from Intake and Reanalysis

**Files:**
- Modify: `src/lib/youtube-intake/service.ts`
- Modify: `src/lib/youtube-intake/service.test.ts`
- Modify: `src/lib/youtube-intake/actions.ts`
- Modify: `src/lib/youtube-intake/actions.test.ts`
- Modify: `src/lib/youtube-intake/action-factory.ts`

**Interfaces:**
- Consumes: `AnalysisRepository.createForAnalysis`, `startAnalysis`.
- Produces: every newly inserted intake/reanalysis has a queued job before redirect; duplicates reuse their existing analysis.

- [ ] **Step 1: Write failing intake lifecycle tests**

```ts
it('creates and starts a job after inserting a new intake', async () => {
  const result = await service.submit(validSubmitInput);
  expect(pipeline.createForAnalysis).toHaveBeenCalledWith(userId, result.intake.id);
  expect(pipeline.start).toHaveBeenCalledWith(jobId);
});

it('does not start another job for a reusable duplicate', async () => {
  await service.submit(validSubmitInput);
  expect(pipeline.start).not.toHaveBeenCalled();
});

it('creates a fresh job for reanalysis', async () => {
  const result = await service.reanalyze(userId, sourceId);
  expect(pipeline.createForAnalysis).toHaveBeenCalledWith(userId, result.intake.id);
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- src/lib/youtube-intake/service.test.ts src/lib/youtube-intake/actions.test.ts`

Expected: FAIL because intake dependencies do not include pipeline startup.

- [ ] **Step 3: Extend intake dependencies and start only inserted work**

```ts
export type IntakePipeline = Readonly<{
  createAndStart(userId: string, analysisId: string): Promise<void>;
}>;

export type IntakeServiceDependencies = Readonly<{
  metadata: VideoMetadataProvider;
  transcript: TranscriptProvider;
  repository: IntakeRepository;
  pipeline: IntakePipeline;
}>;
```

Call `pipeline.createAndStart` after `insertReady` returns `inserted` and after `createReanalysis`; do not call it for `recovered`/duplicate results. Assemble the production pipeline in `actions.ts` from the authenticated Supabase client and `startAnalysis`.

- [ ] **Step 4: Run intake regression suite and commit**

Run: `npm test -- src/lib/youtube-intake`

Expected: PASS, including existing duplicate protection and validation tests.

```bash
git add src/lib/youtube-intake/service.ts src/lib/youtube-intake/service.test.ts src/lib/youtube-intake/actions.ts src/lib/youtube-intake/actions.test.ts src/lib/youtube-intake/action-factory.ts
git commit -m "feat(den-17): start pipeline from accepted intake"
```

### Task 7: Server Snapshot, Live Processing UI, and Retry Action

**Files:**
- Create: `src/lib/analysis-pipeline/client-state.ts`
- Create: `src/lib/analysis-pipeline/client-state.test.ts`
- Create: `src/lib/analysis-pipeline/retry-actions.ts`
- Create: `src/lib/analysis-pipeline/retry-actions.test.ts`
- Create: `src/components/app-shell/analysis-processing-screen.tsx`
- Create: `src/components/app-shell/analysis-processing-screen.test.tsx`
- Modify: `src/app/app/video/[id]/page.tsx`
- Modify: `src/app/app/video/[id]/page.test.tsx`
- Modify: `src/components/app-shell/analyze-processing-visual.tsx`
- Modify: `src/components/app-shell/analyze-processing-visual.test.tsx`
- Modify: `src/styles/app-shell-reference.css`

**Interfaces:**
- Consumes: `AnalysisSnapshot`, Supabase browser client, existing `AnalyzeProcessingVisual`.
- Produces: `toAnalysisVisualState(snapshot): AnalysisVisualState`, `retryAnalysis(formData): Promise<RetryActionResult>`, and `AnalysisProcessingScreen`.

- [ ] **Step 1: Write failing reducer, UI, and retry tests**

```ts
it.each([
  ['queued', 'validating', 'validating'],
  ['running', 'transcript', 'transcript'],
  ['running', 'structuring', 'structuring'],
  ['running', 'artifacts', 'artifacts'],
  ['complete', 'complete', 'complete'],
  ['failed', 'artifacts', 'error'],
])('maps %s/%s to %s', (status, stage, expected) => {
  expect(toAnalysisVisualState(snapshotFixture({ status, stage }))).toBe(expected);
});

it('submits Try again once and retains ready partial artifacts', async () => {
  render(<AnalysisProcessingScreen initialSnapshot={partialSnapshot()} retryAction={retrySpy} />);
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retrySpy).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Summary ready')).toBeVisible();
});

it('loads only an owned pipeline snapshot', async () => {
  render(await VideoIntakePage(pageProps(id)));
  expect(repository.findOwnedSnapshot).toHaveBeenCalledWith(userId, id);
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- src/lib/analysis-pipeline/client-state.test.ts src/lib/analysis-pipeline/retry-actions.test.ts src/components/app-shell/analysis-processing-screen.test.tsx src/app/app/video/'[id]'/page.test.tsx`

Expected: FAIL because live processing modules are absent.

- [ ] **Step 3: Implement monotonic client-state mapping**

```ts
export function toAnalysisVisualState(snapshot: AnalysisSnapshot): AnalysisVisualState {
  if (snapshot.job.status === 'complete') return 'complete';
  if (snapshot.job.status === 'failed' || snapshot.job.status === 'partial') return 'error';
  return snapshot.job.stage;
}

export function chooseNewestSnapshot(current: AnalysisSnapshot, incoming: AnalysisSnapshot) {
  return incoming.revision > current.revision ? incoming : current;
}
```

Use an explicit monotonically increasing revision or updated-at/event ordering from the repository contract so Realtime reconnects cannot regress the rail.

- [ ] **Step 4: Implement authenticated selective retry**

```ts
export async function retryAnalysis(formData: FormData): Promise<RetryActionResult> {
  'use server';
  const user = await requireCurrentUser();
  const analysisId = z.string().uuid().parse(formData.get('analysisId'));
  const snapshot = await repository.prepareRetry(user.id, analysisId);
  await startAnalysis(snapshot.job.id);
  return { ok: true, attempt: snapshot.job.attempt };
}
```

Return controlled error codes, not raw exceptions. The RPC verifies ownership and resets only pending/failed artifacts.

- [ ] **Step 5: Implement the live controller**

Render `AnalyzeProcessingVisual` from the server snapshot. Subscribe to changes scoped to the job/analysis ID, then refetch a complete owned snapshot rather than merging arbitrary rows in the client. Start polling at a bounded interval only when the Realtime channel is not subscribed; stop it on terminal state or unmount.

```ts
useEffect(() => {
  if (isTerminal(snapshot.job.status)) return;
  const channel = subscribeToAnalysis(analysisId, () => refreshSnapshot());
  const fallback = startPollingWhenUnhealthy(channel, refreshSnapshot, 3000);
  return () => { fallback.stop(); void channel.unsubscribe(); };
}, [analysisId, snapshot.job.status]);
```

Display ready artifacts in partial state, safe error copy for failed artifacts, and a retry form whose button disables while pending. Keep the approved completion/exit transition; reduced motion reveals the result immediately after the terminal update.

- [ ] **Step 6: Replace the readiness placeholder on the video page**

Load the owned intake and snapshot server-side and render:

```tsx
return <AnalysisProcessingScreen intake={intake} initialSnapshot={snapshot} />;
```

Keep `generateMetadata`, unauthenticated redirect, and `notFound()` ownership behavior.

- [ ] **Step 7: Run UI tests and accessibility checks**

Run: `npm test -- src/lib/analysis-pipeline/client-state.test.ts src/lib/analysis-pipeline/retry-actions.test.ts src/components/app-shell/analysis-processing-screen.test.tsx src/components/app-shell/analyze-processing-visual.test.tsx src/app/app/video/'[id]'/page.test.tsx`

Expected: PASS; tests assert `role=status`, keyboard-operable retry, disabled pending state, cleanup of subscriptions/timers, and reduced-motion behavior.

- [ ] **Step 8: Commit the processing UI**

```bash
git add src/lib/analysis-pipeline/client-state.ts src/lib/analysis-pipeline/client-state.test.ts src/lib/analysis-pipeline/retry-actions.ts src/lib/analysis-pipeline/retry-actions.test.ts src/components/app-shell/analysis-processing-screen.tsx src/components/app-shell/analysis-processing-screen.test.tsx src/app/app/video/'[id]'/page.tsx src/app/app/video/'[id]'/page.test.tsx src/components/app-shell/analyze-processing-visual.tsx src/components/app-shell/analyze-processing-visual.test.tsx src/styles/app-shell-reference.css
git commit -m "feat(den-17): connect Spectral Rail to durable jobs"
```

### Task 8: End-to-End Fixtures and Full Verification

**Files:**
- Modify: `src/app/app-shell-fixture/fixture-cases.ts`
- Modify: `src/app/app-shell-fixture/app/video/[id]/page.tsx`
- Modify: `tests/e2e/analyze-processing.spec.ts`
- Modify: `tests/e2e/fixtures.ts`
- Modify: `playwright.config.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete production flow and deterministic snapshot fixtures.
- Produces: browser regression coverage and documented server environment variables.

- [ ] **Step 1: Add failing browser scenarios**

```ts
test('processing survives reload and continues from persisted transcript stage', async ({ page }) => {
  await page.goto('/app-shell-fixture/app/video/processing-transcript');
  await expect(page.getByText('Finding transcript')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Finding transcript')).toBeVisible();
});

test('partial result keeps ready artifacts and Try again resumes failed work', async ({ page }) => {
  await page.goto('/app-shell-fixture/app/video/partial');
  await expect(page.getByText('Summary ready')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('[data-analysis-state="artifacts"]')).toBeVisible();
});

test('reduced motion skips decorative completion exit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app-shell-fixture/app/video/completing');
  await expect(page.getByTestId('analysis-results')).toBeVisible();
});
```

- [ ] **Step 2: Run browser tests and verify fixture failures**

Run: `PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/analyze-processing.spec.ts`

Expected: FAIL because durable pipeline fixture cases do not exist.

- [ ] **Step 3: Add deterministic fixture cases and environment documentation**

Add queued, each active stage, partial, failed, retrying, and complete snapshots to the fixture route. Document only variable names and setup instructions:

```md
OPENROUTER_API_KEY=server-only OpenRouter key
OPENROUTER_MODEL=single structured-output-capable model slug
```

State that production requests require parameter-compatible, data-collection-denied, ZDR routing and that credentials must never use a `NEXT_PUBLIC_` prefix.

- [ ] **Step 4: Run formatting and static verification**

Run: `npm run format`

Expected: Prettier completes without errors. Review `git diff` and ensure `next-env.d.ts` remains outside the task diff.

Run: `npm run lint && npm run typecheck`

Expected: both commands exit 0.

- [ ] **Step 5: Run all unit and integration tests**

Run: `npm test`

Expected: all Vitest suites pass with no OpenRouter network calls.

- [ ] **Step 6: Run production build**

Run: `npm run build`

Expected: Next.js production build exits 0 with no client import of server secrets or Workflow-only modules.

- [ ] **Step 7: Run desktop and mobile browser verification**

Run: `PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/analyze-processing.spec.ts`

Expected: all processing-flow scenarios pass on desktop.

Run: `PLAYWRIGHT_PORT=3017 npx playwright test tests/e2e/analyze-processing.spec.ts --project=mobile-chrome`

Expected: all processing-flow scenarios pass after adding a `mobile-chrome` project using Playwright's Pixel 7 device profile.

Manually inspect the fixture flow at desktop and mobile widths for restrained spectral accents, no generic cards/gradient blobs, correct amber/purple/cyan/lime rails, keyboard focus, and reduced motion.

- [ ] **Step 8: Commit verification coverage**

```bash
git add src/app/app-shell-fixture/fixture-cases.ts src/app/app-shell-fixture/app/video/'[id]'/page.tsx tests/e2e/analyze-processing.spec.ts tests/e2e/fixtures.ts playwright.config.ts README.md
git commit -m "test(den-17): verify durable analysis flow"
```

---

## Completion Gate

Before marking DEN-17 complete, confirm all of the following from actual command output and browser observation:

- A new intake redirects promptly while work continues durably.
- Reload and return-later restore the persisted stage.
- Transient failures retry; fatal failures stop with safe copy.
- Partial results retain successful artifacts and selective retry works.
- Failed or partial work releases the no-op reservation; complete work settles it.
- Spectral Rail uses real persisted stages and the approved completion transition.
- Desktop, mobile, keyboard, Realtime fallback, and reduced motion are verified.
- Formatting, lint, typecheck, all tests, production build, and Playwright pass.
- No secrets, `.env` files, transcript text, prompts, or generated content are committed or logged.

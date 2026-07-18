# DEN-17 Durable Analysis Pipeline Design

## Objective

Build a durable analysis pipeline that turns an accepted YouTube intake into a transcript, summary, flashcards, and timestamps. Processing must survive navigation, reloads, transient provider failures, and deployments. The application must expose real processing stages to the existing Spectral Rail and retain successful artifacts when another artifact fails.

This design covers DEN-17 only. Result presentation belongs to DEN-18, and real credit or billing policy belongs to DEN-20.

## Decisions

- Supabase is the product source of truth for jobs, events, artifacts, and usage reservations.
- Vercel Workflow executes and retries durable background work.
- OpenRouter is accessed through a server-only provider adapter.
- One server environment variable, `OPENROUTER_MODEL`, selects the model for all generated artifacts.
- Tests use a deterministic provider implementation and do not call OpenRouter.
- Usage accounting is represented by an interface and a no-op implementation until DEN-20.
- OpenRouter routing must require compatible parameters, deny data collection, require zero-data-retention providers, and allow compatible provider fallback.

## Architecture

After URL validation and duplicate protection, the intake path creates the analysis, analysis job, and usage reservation before starting the workflow. The user is redirected immediately to `/app/video/[id]`; generation does not keep the intake request open.

Vercel Workflow is the executor, but its internal run history is not read by the product UI. Each durable step records its state in Supabase. This keeps reload recovery, ownership checks, result history, and the future DEN-18 workspace independent from the workflow vendor's internal representation.

The workflow moves through these user-visible stages:

1. `validating`
2. `transcript`
3. `structuring`
4. `artifacts`
5. `complete`

The stages map directly to the approved Spectral Rail state machine. Client timers may enforce a minimum visual transition time, but they must never invent progress or advance the server state.

## Components and Boundaries

### Analysis repository

The repository is the only module that reads or writes pipeline records in Supabase. Its commands use unique keys and upserts so replaying a workflow step cannot duplicate events or overwrite an already-ready artifact.

### Workflow orchestration

The workflow coordinates steps and error policy. Steps accept stable identifiers rather than full transcripts when practical, load their inputs from the repository, and persist their outputs before returning. The workflow contains no React or visual-state logic.

### OpenRouter provider adapter

The adapter owns authentication, request construction, routing constraints, structured-output configuration, response parsing, provider metadata, and error classification. The API key and model slug remain server-only.

The adapter requests strict JSON Schema output and sends these mandatory routing constraints:

- `require_parameters: true`
- `data_collection: "deny"`
- `zdr: true`
- `allow_fallbacks: true`

### Artifact generators

Summary, flashcard, and timestamp generators each own a focused prompt and versioned output schema. They depend on the provider interface rather than OpenRouter directly. This makes schemas independently testable and permits deterministic test responses.

### Usage ledger

`UsageLedger` exposes reserve, settle, and release operations. DEN-17 supplies `NoopUsageLedger`, which persists lifecycle state but implements no prices, limits, currencies, or balance changes.

### Processing UI

The result route loads a server-side snapshot of the job and available artifacts. A client controller then subscribes to Supabase Realtime. If the subscription disconnects or does not become healthy, bounded polling revalidates the snapshot. Both paths feed the same state reducer.

## Persistent Data Model

### `analysis_jobs`

One active job belongs to an analysis. It stores the workflow run identifier, overall status, current stage, attempt count, safe error code, and lifecycle timestamps.

Allowed overall statuses are `queued`, `running`, `partial`, `complete`, and `failed`.

### `analysis_job_events`

Events form an ordered, append-only product history. Each event records the job, stage, event status, safe metadata, timestamp, and a unique idempotency key. Event statuses are `started`, `completed`, `retrying`, and `failed`.

Events do not contain prompts, transcripts, provider responses, or arbitrary exception messages.

### `analysis_artifacts`

Each analysis has at most one current record for each artifact kind: `transcript`, `summary`, `flashcards`, and `timestamps`. A record stores `pending`, `ready`, or `failed`, a schema version, JSONB content, a safe error code, and generation timestamps.

Versioned JSONB is intentional for DEN-17: it provides a uniform handoff to DEN-18 without prematurely creating separate relational schemas for every generated format.

### `analysis_usage_reservations`

A reservation belongs to a job and stores `reserved`, `settled`, or `released` plus timestamps. It contains no hard-coded commercial policy.

## Processing Flow

1. Create the analysis, queued job, pending artifact records, and reserved usage record atomically.
2. Start the workflow and persist its run identifier.
3. Record `validating`, then verify the stored intake snapshot and requested artifact set.
4. Normalize the transcript and detect source/output language; persist the transcript artifact.
5. Build the shared structured context required by generators.
6. Generate requested summary, flashcards, and timestamps as independent durable steps. Generators may run concurrently after their shared inputs are ready.
7. Validate and persist each artifact separately.
8. Mark the job `complete` and settle the reservation when every requested artifact is ready.
9. Mark it `partial` when at least one requested generated artifact is ready and another has exhausted retries. Mark it `failed` when no requested generated artifact succeeds or a prerequisite fails fatally. Release the reservation for both outcomes in DEN-17.

Retrying a partial or failed job starts a new workflow run for only missing or failed artifacts. Ready artifacts are reused. The existing job history is retained, and the new attempt emits new events with distinct idempotency keys.

## Error Handling

HTTP 408, 429, 502, and 503 responses are retryable. Retry policy honors `Retry-After` when supplied and otherwise uses bounded exponential backoff. Network timeouts and temporary provider unavailability are also retryable.

Authentication, authorization, invalid configuration, unsupported model capabilities, invalid requests, and policy rejection are fatal. Provider output that fails the declared schema receives a small bounded retry allowance; after exhaustion, only that artifact fails.

Workflow retries are safe because every side effect is idempotent. A replay checks for a ready artifact before requesting it again and uses stable keys for event writes.

User-facing errors use controlled codes and actionable copy. Server diagnostics may record provider request ID, selected model, latency, token usage, and cost metadata. They must not log the transcript, prompts, or generated content.

## UI Behavior

Spectral Rail reflects persisted server events. On first render it resumes at the latest stored stage. Realtime and polling updates pass through the same reducer, so reconnecting cannot regress a completed stage.

After the final server stage, the approved restrained completion transition plays before the result is revealed. `prefers-reduced-motion` removes decorative movement while retaining state changes and announcements.

`Try again` requests a retry for missing or failed artifacts, disables duplicate submission while accepted, and returns the rail to active processing as soon as the new attempt is persisted. It never discards ready partial results.

Desktop, tablet, and mobile share the same state machine. Keyboard focus, live status announcements, and error actions remain usable without pointer input.

## Security and Privacy

- OpenRouter credentials and `OPENROUTER_MODEL` are read only in server modules.
- Workflow writes use a trusted server identity.
- Supabase RLS permits users to read jobs, events, reservations, and artifacts only for analyses they own.
- Client code cannot update pipeline status or artifact content directly.
- OpenRouter requests enforce the approved privacy routing constraints on every call.
- Logs and event metadata contain no source or generated content.

## Verification Strategy

Unit tests cover state transitions, schema validation, provider error classification, retry decisions, usage reservation transitions, event idempotency, and UI state reduction.

Integration tests cover job creation, workflow resume, transient retry, fatal prerequisite failure, one-artifact failure, partial completion, selective retry, and complete settlement using the deterministic provider.

Browser tests cover leaving and returning during processing, reload recovery, Realtime updates, polling fallback, partial results, `Try again`, completion transition, keyboard operation, and reduced-motion behavior. The affected flow is checked at desktop and mobile viewport sizes.

Before completion, run formatting, linting, strict type checking, unit and integration tests, the production build, and browser verification. DEN-17 is not complete while any required check fails.

## Assumptions and Risks

- The selected OpenRouter model supports the required strict structured outputs. Startup or the first provider call must fail with a controlled configuration error if it does not.
- Vercel Workflow and Supabase credentials are available in deployment environments.
- Realtime delivery is not guaranteed; polling is required for correctness rather than only as an optimization.
- DEN-18 may refine presentation schemas, so all stored artifact formats are explicitly versioned.
- DEN-20 will replace the no-op ledger without changing workflow call sites or embedding billing rules into UI components.

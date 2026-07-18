# Single-spectrum analysis handoff design

## Context

The current analysis flow redirects to `/app/video/[id]` before processing is terminal. The destination route then renders the same spectral processing presentation a second time. This produces a duplicated transition and exposes the result route before a result is available.

The public landing form also intercepts submission for decorative motion without starting authentication or analysis. Separately, Summary v2 generation is rejected by the configured strict OpenRouter structured-output path because `sourceOffsetMs` is optional in the JSON Schema.

## Goals

- Show the approved spectrum exactly once, on New analysis.
- Keep the user on New analysis while the durable job is non-terminal.
- Navigate to the result route only after every selected artifact is ready.
- Give users an honest choice when a terminal partial result is reached.
- Preserve a landing-page YouTube URL through authentication and start analysis with the existing defaults.
- Make Summary v2 compatible with strict structured outputs.
- Preserve durable background processing, reload recovery, History access, mobile behavior, accessibility, and reduced motion.

## Non-goals

- Redesigning the result workspace.
- Designing a second processing page.
- Enabling Flashcards by default.
- Adding fake percentages or completion-time estimates.
- Retrying failed artifacts indefinitely without user intent.

## Primary flow

1. The user submits a valid YouTube URL on New analysis.
2. The intake and durable analysis job are created immediately.
3. The New analysis form transforms into the existing approved spectral processing presentation.
4. The route remains `/app`; no early result-route navigation occurs.
5. The client reconciles the owned job through the existing refresh and Realtime mechanisms.
6. When the job becomes `complete`, the spectrum performs its single restrained exit and navigation occurs to `/app/video/[id]`.
7. The result route renders only the result workspace. It never renders the spectral processing presentation.

The job remains durable in Supabase. Closing the tab does not cancel it, and History exposes the job independently from the currently open page.

## Partial and failed outcomes

A terminal `partial` result must not navigate automatically. The spectrum changes to an attention state that truthfully distinguishes ready and failed artifacts.

The user receives two actions:

- **View available results** navigates to `/app/video/[id]`, where ready artifacts remain usable and failed or unavailable artifacts are represented honestly.
- **Retry failed artifact** invokes the existing owned retry boundary. Only pending or failed work is retried; ready artifacts are preserved.

While retry is active, the same spectral surface remains mounted and reflects renewed processing. A terminal `failed` result with no usable artifact exposes only the retry action and controlled error copy.

## Reload and History behavior

- An active job is written to History as soon as it is created.
- Reloading `/app` restores the user's active non-terminal job and its truthful stage rather than returning to an empty form.
- A History entry for a non-terminal job opens or resumes the New analysis processing surface.
- A complete entry opens the result workspace.
- A partial entry may open the result workspace because the user explicitly chose it from History or from **View available results**.
- Completion while New analysis remains open triggers exactly one result navigation.

## Landing-page handoff

The landing `Transform video` form performs real validation and no longer uses submission solely for decorative motion.

For an unauthenticated user:

1. The normalized YouTube URL is encoded into an internal, validated continuation target.
2. The user is sent to Sign in.
3. Google or email authentication preserves the continuation through the existing safe callback flow.
4. After authentication, the user reaches New analysis with the URL restored.
5. Analysis starts automatically once, using the existing default selection: Summary, Timestamps, and Transcript.

Flashcards remain opt-in. Invalid or unsupported continuation values are discarded safely and never become open redirects.

## Result-route contract

`/app/video/[id]` is a result-only route:

- `complete` renders the full result workspace;
- `partial` renders available results with failed states and retry affordances;
- non-terminal jobs redirect back to the resumable New analysis processing surface;
- missing or cross-user analyses remain unavailable through the existing ownership checks.

This contract prevents the spectrum from appearing twice and keeps processing ownership in one component tree.

## Summary strict schema correction

Summary v2 requires every key point to contain a concrete `sourceOffsetMs` derived from the nearest supplied transcript segment.

The Zod model and JSON Schema must agree:

- `sourceOffsetMs` is a required non-negative integer;
- it is included in the key-point object's `required` array;
- the prompt continues to request the nearest supplied transcript offset;
- persisted Summary v1 remains readable;
- existing valid Summary v2 data remains readable after normalization.

This removes the confirmed strict-schema rejection while preserving timestamp-grounded claims.

## State ownership

The New analysis client surface owns only presentation and reconciliation state. Supabase remains authoritative for job status, artifact status, retry state, and durable recovery.

Navigation is derived from terminal state:

- `queued` or `running`: stay on New analysis;
- `complete`: navigate once to the result;
- `partial`: stay and present both user actions;
- `failed`: stay and present retry/error state.

Guards prevent duplicate submissions, duplicate automatic starts after authentication, and repeated completion navigation.

## Accessibility and motion

- Processing status remains a polite live region; terminal errors remain assertive.
- Artifact states use text in addition to color.
- Both partial-result actions are keyboard reachable and at least 44 by 44 pixels on touch layouts.
- Focus moves to the processing heading after submission and to the partial-result message when it appears.
- Reduced motion keeps all state transitions but removes decorative spectrum motion and performs completion navigation without the decorative exit delay.
- No result content is hidden behind an inert processing surface after navigation.

## Verification

Automated coverage must prove:

- the landing CTA validates and preserves the URL through auth;
- authenticated continuation auto-starts exactly once with Summary, Timestamps, and Transcript;
- submission stays on `/app` throughout queued and running states;
- only one spectrum is rendered during the complete flow;
- `complete` performs exactly one result navigation;
- `partial` does not auto-navigate and exposes both actions;
- retry preserves ready artifacts and restarts only unfinished work;
- reload restores an active processing job;
- the result route never renders the spectrum;
- strict Summary v2 schema accepts provider output with required source offsets and rejects missing offsets;
- desktop, mobile, keyboard, touch, and reduced-motion flows remain usable.

Live staging verification must cover Google or email continuation, one real YouTube analysis, Summary generation through OpenRouter, a complete handoff, and a controlled partial retry.

## Risks

- Continuation parameters can become an open-redirect or duplicate-submission vector unless normalized and consumed once.
- Multiple active jobs require a deterministic resume rule; the most recently updated owned non-terminal job is used.
- Realtime delivery is not guaranteed, so polling reconciliation remains the correctness fallback.
- Partial retries must not clear ready artifacts or overwrite newer revisions.
- OpenRouter provider support is model-dependent; the strict schema remains within the documented structured-output subset.

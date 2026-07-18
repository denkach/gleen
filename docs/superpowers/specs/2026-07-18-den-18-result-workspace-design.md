# DEN-18 Video Result Workspace Design

## Outcome

Replace the terminal `Analysis results ready` placeholder with the responsive result workspace required by Linear DEN-18. Users can consume, navigate, copy, export, and safely edit generated artifacts without leaving `/app/video/[id]`.

DEN-18 consumes the durable, owned, versioned artifacts produced by DEN-17. It does not replace the processing pipeline or introduce billing policy.

## Sources of truth

- Linear `DEN-18 — GLE-008 — Implement the video result workspace`;
- `docs/product.md`;
- `docs/design-system.md`;
- `docs/architecture.md`;
- `docs/roadmap.md` Milestone 6;
- the approved result workspace in `design/reference-v3/index.html`.

## Scope

DEN-18 includes:

- sticky YouTube player;
- Overview, Summary, Flashcards, Timestamps, Transcript, and Export tabs;
- timestamp-to-player synchronization;
- flashcard study mode;
- title and supported artifact editing;
- debounced persistent autosave;
- copy and local file export actions;
- loading, empty, partial, corrupted, offline, and save-error states;
- desktop, tablet, mobile, keyboard, touch, and reduced-motion behavior.

DEN-18 does not include:

- AI regeneration;
- Notion OAuth or token storage;
- billing or usage policy;
- direct YouTube media extraction;
- transcript editing;
- fabricated source links when the generation payload has no source offset.

## Route and rendering architecture

`/app/video/[id]` remains the canonical owned analysis URL.

The Server Component authenticates the user, loads the owned intake and analysis snapshot, and validates every ready artifact before rendering. Non-terminal jobs continue to use `AnalysisProcessingScreen`. Complete or partial jobs render the result workspace with each valid ready artifact independently available.

The workspace uses a hybrid architecture:

- Server Components own authentication, ownership, initial data loading, and safe payload validation.
- Focused Client Components own tabs, player control, search, editing, autosave feedback, flashcard study state, copy, and download actions.
- A malformed or unsupported artifact is isolated to its tab and never crashes the whole workspace.

## Layout and approved visual language

The implementation matches the approved result reference rather than redesigning it.

Desktop uses a two-column workspace:

- a sticky source panel with the YouTube player and video metadata;
- a result panel with artifact toolbar, accessible tabs, and tab content.

Tablet removes sticky behavior when space is constrained while preserving a practical two-column layout. Mobile places the player above the workspace, provides horizontally scrollable tabs, uses 44px minimum touch targets, and avoids horizontal page overflow.

The visual language remains dark-only and restrained. Summary uses amber, Flashcards purple, Timestamps cyan, Transcript neutral, and Export lime. Artifact color supplements text and state rather than replacing it.

## Player abstraction

Workspace features depend on a player controller, not directly on the YouTube implementation:

```ts
export type VideoPlayerController = Readonly<{
  seekTo(offsetMs: number): void;
  play(): void;
  pause(): void;
  getCurrentTimeMs(): number;
}>;
```

The first adapter wraps the official YouTube IFrame API. Summary source links, timestamp rows, and transcript segments consume the controller interface. This permits a future custom UI or an HTML5/HLS adapter for owned media without rewriting artifact components.

For YouTube sources, a custom visual layer must continue to comply with the official embed/API model; DEN-18 never extracts or directly streams YouTube media.

## Artifact contracts and compatibility

All payloads are parsed through Zod before presentation.

Existing summary v1 payloads remain readable:

```ts
type SummaryV1 = {
  schemaVersion: 1;
  title: string;
  overview: string;
  keyPoints: string[];
};
```

New summary generation uses a compatible v2 contract:

```ts
type SummaryV2 = {
  schemaVersion: 2;
  title: string;
  overview: string;
  keyPoints: Array<{
    text: string;
    sourceOffsetMs?: number;
  }>;
};
```

The display model normalizes both versions. Source timecodes render only when `sourceOffsetMs` is valid and within video duration. Existing v1 content never receives invented offsets.

Flashcards and timestamps retain their DEN-17 versioned contracts unless implementation discovery identifies a concrete acceptance-criteria gap. Transcript display consumes the persisted timestamped transcript artifact and retains source order.

## Tabs and interactions

### Overview

Overview provides a concise takeaway, video metadata, available artifact status, and quick links into ready tabs. Missing optional artifacts are described honestly.

### Summary

Summary renders title, overview, and key points with amber accents. Supported fields are editable. A key point with a source offset shows a timecode that seeks the player.

### Flashcards

Flashcards render a focused study deck with purple accents. Cards support flip, previous/next navigation, Again / Hard / Got it actions, and source navigation when future payloads provide a source offset. Study progress is local UI state in DEN-18 and does not claim durable spaced-repetition scheduling.

### Timestamps

Timestamp chapters use cyan accents and seek the player through `VideoPlayerController`. The active chapter follows current player time. Title and description fields are editable; offsets remain source coordinates and are not casually text-edited.

### Transcript

Transcript supports search, timestamped segments, active-segment highlighting, copy, and seek-to-source. Transcript text is read-only because it is a source snapshot used by generation and duplicate/re-analysis workflows.

### Export

Export uses lime accents and generates data locally from the currently saved workspace state:

- Copy Markdown;
- Download Markdown;
- Obsidian-compatible Markdown;
- NotebookLM-compatible source file.

Notion is shown as an honest unavailable/connection-required state. DEN-18 does not simulate a successful integration.

## Editing and autosave

The analysis title is stored separately on the owned intake. Summary, flashcards, and timestamp text edits update the owned artifact JSON payload while preserving schema version and structural validation.

Autosave behavior:

- optimistic local editing;
- a short debounce after input;
- server-side authentication and ownership verification;
- Zod validation at the mutation boundary;
- revision or updated-at conflict protection so an older request cannot overwrite a newer edit;
- explicit `Saving…`, `Saved`, and `Couldn’t save` states;
- retry without losing current input;
- no silent fallback to local-only persistence.

Edits never mutate another user's rows and never expose secret/service credentials to the client.

## State model

The route handles:

- processing: existing durable Spectral Rail and live reconciliation;
- complete: all requested artifacts ready;
- partial: valid ready tabs remain usable and failed tabs show retry/error context;
- loading: stable skeleton geometry without fake completion;
- empty: selected artifact has no usable content;
- corrupted/unsupported: local tab error with other tabs preserved;
- save error: current edit retained with retry affordance;
- offline: editing remains visible but explicitly unsaved;
- session expiry: existing protected-route behavior;
- not found/unauthorized: no cross-user data disclosure.

The complete transition opens the workspace after the approved restrained exit motion. Reloading a terminal job renders the workspace directly without replaying decorative processing motion.

## Accessibility and motion

- Tabs use correct tablist/tab/tabpanel semantics and arrow-key navigation.
- Player, timecodes, card controls, copy, export, and editing controls have accessible names.
- Focus is visible and follows logical document order.
- Touch targets are at least 44px where applicable.
- Status messages use appropriate live regions without repeated announcements during polling.
- Color never communicates state alone.
- Reduced motion removes card flips, workspace pulses, and nonessential transitions while preserving instant state changes.

## Testing and verification

Unit and integration coverage includes:

- v1/v2 summary parsing and normalization;
- invalid source offsets;
- artifact corruption isolation;
- ownership and mutation validation;
- autosave debounce, success, conflict, retry, and offline states;
- player adapter calls from summary, timestamps, and transcript;
- flashcard keyboard and touch interactions;
- Markdown, Obsidian, and NotebookLM serialization;
- complete, partial, empty, and failed tab rendering.

Browser coverage includes desktop and mobile layout, keyboard tab navigation, timestamp seeking, transcript search, flashcard study flow, editing/autosave, local exports, no horizontal overflow, console errors, and reduced motion.

Before completion run formatting, linting, strict type checking, all unit/integration tests, the production build, and a real staging flow using persisted DEN-17 artifacts.

## Assumptions, dependencies, and risks

- DEN-18 is stacked on the verified DEN-17 branch because it consumes DEN-17 schemas and repository snapshots.
- The Linear issue has no comments or attached design files; the repository reference is the approved visual source.
- Existing generated v1 summaries remain readable but cannot gain source links without regeneration.
- Autosave requires focused database/RLS mutation support; schema or RPC changes must be migration-backed and advisor-checked.
- YouTube IFrame API availability, browser privacy settings, and third-party blocking require a clear player-unavailable fallback.
- Large transcripts require rendering and search performance care; the implementation should avoid mounting unnecessarily expensive derived content on every keystroke.

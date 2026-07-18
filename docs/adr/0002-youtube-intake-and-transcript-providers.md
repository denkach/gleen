# ADR 0002: YouTube intake and transcript providers

- Status: Accepted
- Date: 2026-07-12
- Linear: DEN-16

## Context

DEN-16 must validate YouTube links, retrieve trustworthy video metadata, detect
transcript availability, preserve useful timestamps, and distinguish duplicate
analysis configurations before any processing or credit consumption occurs.

The official YouTube Data API can return video metadata, duration, caption
presence, privacy/status fields, and embeddability. Its caption listing and
download endpoints require OAuth authorization associated with the video's
owner, so they cannot retrieve transcript text for arbitrary public videos.

General speech-to-text APIs such as Groq Whisper, OpenAI Audio, AssemblyAI, and
Deepgram accept media files or direct media URLs rather than ordinary YouTube
watch-page URLs. Using them requires a separate compliant audio-acquisition,
temporary-storage, chunking, cleanup, and durable-job pipeline.

## Decision

Use two replaceable server-only adapters:

1. YouTube Data API v3 `videos.list` for metadata and availability.
2. Supadata transcript API in `native` mode for existing transcript segments
   and timestamps.

Supadata must never run `auto` or `generate` mode in DEN-16. A video without an
existing transcript returns a useful `transcript_unavailable` result. No AI
transcription is started and no user-facing credits are consumed.

Use direct server-side HTTP adapters instead of adding provider SDK production
dependencies. Provider secrets are validated as server-only environment
variables and never cross a Client Component boundary.

Domain services depend on local provider interfaces rather than vendor response
types. Provider errors are normalized to stable domain codes so either vendor
can be replaced without rewriting forms, duplicate logic, or persistence.

## Future AI fallback

If the product later supports videos without captions, add a separately priced,
explicitly confirmed durable transcription job. Groq Whisper Large v3 Turbo is
the preferred cost baseline, but only after a compliant audio-acquisition and
cleanup strategy is approved. This fallback belongs to processing work, not
DEN-16, and must never activate automatically.

## Alternatives considered

### Official YouTube captions only

Rejected because caption list/download requires owner-authorized OAuth and does
not support arbitrary public videos.

### Supadata `auto`

Rejected because it silently starts billable AI transcription when native
captions are absent. That conflicts with explicit cost confirmation and the
DEN-16 transcript-less error requirement.

### Direct Groq/OpenAI/AssemblyAI/Deepgram transcription

Deferred. Inference can be cheaper than Supadata's generated transcript, but
the application would first need to acquire, temporarily store, chunk, and
delete YouTube audio safely. DEN-16 does not introduce that infrastructure.

### Scraping YouTube caption or audio endpoints directly

Rejected for production because undocumented endpoints and download behavior
are fragile, difficult to operate, and create additional compliance risk.

## Consequences

- Native transcript intake is predictable and inexpensive.
- Videos without captions are rejected until a separately approved fallback
  exists.
- Two server-only API keys are required.
- Provider availability must be handled as a recoverable failure that preserves
  submitted input.
- Transcript segments can be stored once and reused by DEN-17 processing.
- Adapter contract tests and HTTP boundary tests are required.

# GLE-006 YouTube Intake and Duplicate Protection Design

## Goal

Implement DEN-16 so an authenticated user can submit a supported YouTube URL,
receive useful validation and availability feedback, preserve the submitted
input after recoverable failures, and reuse an equivalent saved intake without
creating another processing or usage event.

## Sources of truth

- Linear issue DEN-16.
- `docs/product.md`, `docs/design-system.md`, `docs/architecture.md`, and
  `docs/roadmap.md`.
- `docs/adr/0002-youtube-intake-and-transcript-providers.md`.
- `/Users/niga/Downloads/gleen-motion-prototype-v2/app.html` for New analysis.
- `/Users/niga/Downloads/gleen-motion-prototype-v2/history.html` for the exact
  duplicate banner composition.
- Existing repository tokens, UI primitives, authenticated shell, Supabase
  session boundary, and onboarding preferences.

The external prototype and approved `design/` references remain read-only.

## Scope

DEN-16 includes:

- strict YouTube URL parsing, normalization, and canonical video ID extraction;
- YouTube metadata, duration, privacy/availability, and embeddability checks;
- Supadata `native` transcript availability and timestamped segment retrieval;
- persistence of provider-validated intake data in Supabase;
- configuration-aware duplicate fingerprints;
- exact-duplicate reuse, open-existing flow, and explicit re-analysis;
- useful invalid/private/unavailable/restricted/transcript-less/provider errors;
- preservation of submitted URL and configuration after recoverable failures;
- active New analysis form and restrained status feedback within the approved
  application shell;
- a shell-contained `/app/video/[id]` intake-readiness page that DEN-17 and
  DEN-18 can extend.

DEN-16 does not include:

- AI transcript generation;
- summary, flashcard, timestamp, or export generation;
- persistent processing workers, progress stages, retries, or partial results;
- credit or usage-ledger writes;
- the final result workspace;
- billing enforcement.

## Supported YouTube URLs

Accept HTTPS URLs from these explicit host/path families:

- `youtube.com/watch?v=VIDEO_ID` and approved YouTube subdomains such as `www`
  and `m`;
- `youtu.be/VIDEO_ID`;
- `youtube.com/shorts/VIDEO_ID`;
- `youtube.com/embed/VIDEO_ID`;
- `youtube.com/live/VIDEO_ID`.

Accept an optional surrounding whitespace and ignore unrelated query parameters,
fragments, timestamps, and playlist parameters after extracting the video ID.

Reject:

- non-HTTPS URLs;
- credentials, custom ports, deceptive suffix hosts, and non-YouTube hosts;
- playlist-only, channel, search, and homepage URLs;
- missing, malformed, or non-11-character video IDs;
- more than one conflicting video identity in the same URL.

Normalize every accepted URL to:

`https://www.youtube.com/watch?v=VIDEO_ID`

URL parsing is a pure domain function and never makes a network request.

## Provider boundaries

Define local interfaces:

```ts
type VideoMetadataProvider = Readonly<{
  getVideo(videoId: string): Promise<VideoMetadataResult>;
}>;

type TranscriptProvider = Readonly<{
  getNativeTranscript(
    canonicalUrl: string,
    preferredLanguage?: string,
  ): Promise<TranscriptResult>;
}>;
```

The YouTube adapter calls `videos.list` with only the parts required for title,
channel, thumbnails, ISO-8601 duration, caption flag, and status. Validate the
response with Zod before it reaches domain code.

The Supadata adapter calls `/v1/transcript` with `mode=native` and timestamped
segments. It validates each segment's text, offset, duration, and language.
Status `206` maps to `transcript_unavailable`; `401/402` maps to provider
configuration; `429/5xx` maps to recoverable provider unavailability.

Use request timeouts and abort signals. Never log provider keys, authorization
headers, complete transcript content, or Supabase session cookies.

## Intake configuration

The intake configuration includes:

- output language;
- summary preset;
- flashcard preset;
- selected artifacts;
- analysis contract version.

The selectable artifacts are `summary`, `timestamps`, `transcript`, and
`flashcards`. At least one artifact must be selected. The initial selection is:

- Summary: selected;
- Timestamps: selected;
- Transcript: selected;
- Flashcards: not selected.

Export destinations are not generated artifacts. They are chosen after results
exist and therefore do not participate in intake validation or duplicate
matching.

Output language and applicable presets come from the authenticated user's
persisted profile. The artifact selection above is a domain-level default, not
copy or state embedded inside a visual component. DEN-16 applies changes to the
current intake only and does not overwrite profile preferences.

The approved `Advanced options` row opens a restrained existing Dialog
primitive. It allows changing output language, summary preset, flashcard preset,
and selected artifacts for this intake only. Interface language is not changed.
The dialog uses the existing settings/onboarding selection language and does not
introduce a new visual system. Artifact controls expose clear selected and
unselected states, remain keyboard-operable, and show a validation message if
the user tries to continue with no artifacts selected. Summary and flashcard
presets remain visible only when their corresponding artifact is selected.

## Duplicate fingerprint

Create a canonical JSON representation with fixed property ordering:

```text
youtubeVideoId
outputLocale
sorted unique artifact identifiers
summaryPreset when summary is selected, otherwise null
flashcardPreset when flashcards are selected, otherwise null
analysisContractVersion
```

Hash the UTF-8 canonical representation with SHA-256 on the server. Never use
title, channel, thumbnail, transcript text, user email, timestamps, provider
names, or mutable display copy in the fingerprint.

Duplicate scope is per authenticated user. The same video with a different
output language, summary preset, flashcard preset, artifact selection, or
analysis contract version is a distinct intake when that setting affects a
selected artifact. Changing a hidden or inactive preset does not create a new
fingerprint.

## Persistence

Add an `analysis_intakes` table:

- `id uuid` primary key;
- `user_id uuid` referencing `auth.users` with cascade delete;
- `youtube_video_id text`;
- `canonical_url text`;
- validated metadata fields: title, channel title, duration seconds, thumbnail;
- `transcript_language text`;
- `transcript_segments jsonb` containing validated timestamped segments;
- configuration columns for output locale, summary preset, flashcard preset,
  selected artifacts, and analysis contract version;
- `duplicate_key text` containing the SHA-256 hex digest;
- `attempt integer` starting at one;
- `status text` limited to `ready`, `processing`, `complete`, and `failed`;
- optional `reanalysis_of uuid` referencing the previous intake;
- timestamps.

Enforce uniqueness on `(user_id, duplicate_key, attempt)`. Add indexes for
`(user_id, duplicate_key, created_at desc)` and user history ordering.

RLS permits authenticated users to select, insert, and update only their own
rows. Users cannot set another `user_id`. Transcript and metadata are not
publicly readable.

No usage-ledger or credit row is written in DEN-16. Duplicate reuse returns the
existing row before any new intake insert occurs. A concurrent first submission
that hits a uniqueness conflict re-queries and returns the winning row.

Explicit re-analysis revalidates ownership and configuration, increments the
attempt atomically, links `reanalysis_of`, and creates a new `ready` intake only
after the user confirms.

## Server flow

The New analysis form uses a Server Action and `useActionState`:

1. Authenticate with `supabase.auth.getUser()`.
2. Parse the URL and configuration with Zod.
3. Preserve the raw submitted URL in action state.
4. Retrieve and validate YouTube metadata.
5. Reject private, unavailable, restricted, non-embeddable, livestream-in-
   progress, and unsupported-duration states with stable error codes.
6. Retrieve the native transcript in the requested/default language.
7. Compute the duplicate fingerprint.
8. Query the user's latest matching non-failed intake.
9. If found, return a duplicate state without inserting or consuming usage.
10. Otherwise persist a `ready` intake and redirect to `/app/video/[id]`.

Provider calls occur only after local validation. Duplicate lookup may use the
fingerprint before transcript retrieval when validated metadata/configuration
already identifies an existing reusable intake, avoiding a paid transcript
request. New or explicit re-analysis flows retrieve current transcript data
before insertion.

## UI states

Activate the existing `app.html` beam input without changing its geometry.

Required states:

- idle;
- local validation error;
- checking video and transcript (one combined pending state);
- exact duplicate;
- ready/success redirect;
- recoverable provider failure;
- disabled while pending.

Use text status announcements with `aria-live`; do not communicate status by
the prism line or color alone. Pending state keeps the URL visible and prevents
double submission. By explicit user decision, the opaque Server Action and
`useActionState` architecture uses the single truthful pending announcement
`Checking video and transcript…`. It must not derive or claim individual phases
from timers. Distinct real phases are deferred until a streaming or durable
processing architecture can report them truthfully.

Error copy must distinguish:

- invalid or unsupported YouTube URL;
- video is private or unavailable when YouTube cannot expose it;
- video is restricted or cannot be embedded;
- live video is not ready;
- transcript is unavailable;
- requested transcript language is unavailable;
- provider rate limit or temporary outage;
- session expiry;
- unexpected persistence failure.

Recoverable errors preserve raw URL and advanced configuration. Secrets and
provider response bodies never appear in user copy.

## Duplicate and re-analysis UI

Port the duplicate banner structure from `history.html` without redesign:

- title: `You already analyzed this video.`;
- supporting copy: `No credits will be used.`;
- primary link: `Open saved result` to `/app/video/[existingId]`;
- secondary action: `Analyze again`.

`Analyze again` opens a confirmation Dialog showing the same configuration and
explicitly stating that a new processing attempt will be created. The confirm
button submits the existing intake ID; the server revalidates ownership and
does not trust client-provided metadata or fingerprint values.

## Intake readiness route

`/app/video/[id]` loads an owned intake under the shared shell. Until DEN-17 and
DEN-18, it shows:

- validated title, channel, duration, thumbnail, transcript language;
- configuration summary;
- status `Ready for processing`;
- truthful copy that processing is implemented in the next issue;
- link back to New analysis.

It returns not found for missing or foreign rows. It does not pretend generated
artifacts exist.

## Security and privacy

- Provider keys remain server-only.
- All inputs are validated again on the server.
- URL parsing rejects SSRF-capable arbitrary hosts and redirects; adapters build
  fixed provider URLs from the extracted video ID.
- Provider fetches use fixed origins, timeouts, and bounded response sizes.
- RLS and explicit `user_id` filters enforce ownership.
- Re-analysis never trusts a client-supplied duplicate key or user ID.
- Transcript text is private user data and must not be logged.
- Errors expose stable safe copy rather than upstream bodies.

## Testing and verification

Automated coverage must include:

- supported URL families and hostile/ambiguous URL rejection;
- canonicalization and video ID extraction;
- ISO duration parsing and provider response validation;
- every provider status/error mapping and timeout;
- native mode is always sent and `auto`/`generate` never appears;
- canonical fingerprint stability, artifact sorting, and configuration changes;
- artifact defaults, at-least-one validation, and exclusion of export targets;
- inactive summary/flashcard presets do not change the fingerprint;
- migrations, constraints, indexes, and RLS ownership;
- exact duplicate returns without insert/provider charge where possible;
- concurrent uniqueness recovery;
- explicit re-analysis ownership and attempt increment;
- form input/config preservation after recoverable errors;
- pending double-submit prevention and accessible live status;
- duplicate banner/open-existing/confirmation behavior;
- `/app/video/[id]` ownership and truthful readiness state;
- desktop, 1024px, 980px collapsed rail, 390px mobile, keyboard, touch,
  reduced motion, and no horizontal overflow;
- production build and development/production fixture protection.

Before completion run formatting, linting, type checking, all unit/integration
tests, production build, development E2E, production E2E, and real authenticated
browser verification.

## Dependencies and setup

Required external configuration:

- enable YouTube Data API v3 in the existing Google Cloud project;
- create a restricted server API key for YouTube Data API;
- create a Supadata account and server API key;
- add both values to local and deployment server-only environment variables;
- apply the Supabase migration.

No new production package is required for provider HTTP calls.

## Risks and follow-ups

- YouTube can return no row for private, deleted, or otherwise unavailable
  videos, so user copy may safely group private/unavailable when the upstream
  API cannot distinguish them.
- Supadata is an external paid dependency. The adapter boundary and normalized
  error codes limit lock-in.
- Transcript freshness can change after intake. DEN-17 must process the stored,
  content-hashed snapshot rather than silently refetching it.
- Credit accounting is intentionally absent until DEN-20. Duplicate protection
  prevents duplicate intake/job creation now and must later wrap the usage
  reservation transaction.
- AI transcription remains an explicit future workflow and must not be added to
  this issue as a hidden fallback.

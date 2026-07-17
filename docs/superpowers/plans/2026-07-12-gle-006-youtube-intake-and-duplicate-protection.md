# GLE-006 YouTube Intake and Duplicate Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated user validate a YouTube video, choose the knowledge artifacts they need, store a native transcript snapshot, reuse an exact prior intake, or explicitly create a re-analysis attempt.

**Approved pending-state decision:** Retain the opaque Server Action and
`useActionState` architecture. Its metadata, transcript, duplicate, and save
work shares one combined pending state announced exactly as
`Checking video and transcript…`; do not fabricate phase changes with timers.
Distinct real phases are deferred until a streaming or durable processing
architecture can expose them truthfully.

**Architecture:** Pure domain modules parse URLs, validate intake configuration, normalize artifact-dependent presets, and compute a server-side SHA-256 fingerprint. Fixed-origin YouTube and Supadata adapters feed an orchestration service backed by an RLS-protected Supabase repository; a Server Action exposes stable states to the approved New analysis UI. The saved readiness route remains truthful and contains no generated artifacts.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Zod 4, Supabase SSR/Postgres/RLS, Tailwind/CSS-variable tokens, Vitest/Testing Library, Playwright.

## Global Constraints

- Work only on Linear DEN-16 in branch `den-16-youtube-intake` and preserve the approved `app.html` and `history.html` geometry.
- Never redesign `design/reference-v3/`, `design/screenshots/`, or `/Users/niga/Downloads/gleen-motion-prototype-v2/`; all reference files stay read-only.
- Selectable artifacts are exactly `summary`, `timestamps`, `transcript`, and `flashcards`; defaults are the first three selected and flashcards unselected.
- At least one artifact is required; export targets are excluded from intake configuration and duplicate matching.
- A summary preset affects the fingerprint only when summary is selected; a flashcard preset affects it only when flashcards are selected.
- Native Supadata transcripts only: every transcript request sends `mode=native`; never send `auto` or `generate` and never add an AI fallback.
- Provider keys are server-only, fixed-origin requests use timeouts, and logs never contain keys, cookies, complete transcript text, or upstream response bodies.
- No usage/credit writes, generated artifacts, background workers, billing enforcement, or result workspace in DEN-16.
- No new production dependency is required; use built-in `fetch`, `AbortSignal.timeout`, and `node:crypto`.
- Support desktop, tablet, 390px mobile, keyboard navigation, touch targets, and `prefers-reduced-motion` without horizontal overflow.
- Every task follows red-green-refactor TDD and ends in a focused Conventional Commit.

## File map

- `src/lib/youtube-intake/url.ts`: pure supported-URL parsing and canonicalization.
- `src/lib/youtube-intake/configuration.ts`: artifact/configuration schemas, defaults, and fingerprint normalization.
- `src/lib/youtube-intake/fingerprint.ts`: fixed-order canonical JSON and SHA-256 digest.
- `src/lib/youtube-intake/providers.ts`: provider-facing domain types and stable error codes.
- `src/lib/youtube-intake/youtube-provider.ts`: YouTube Data API adapter and ISO duration conversion.
- `src/lib/youtube-intake/supadata-provider.ts`: native timestamped transcript adapter.
- `src/lib/youtube-intake/repository.ts`: storage contract and orchestration-facing result types.
- `src/lib/youtube-intake/supabase-repository.ts`: Supabase row mapping, ownership filters, duplicate recovery, and re-analysis RPC call.
- `src/lib/youtube-intake/service.ts`: ordered intake and re-analysis workflow.
- `src/lib/youtube-intake/actions.ts`: authenticated Server Actions and safe UI-state mapping.
- `src/components/app-shell/new-analysis-form.tsx`: client form state, artifact Dialog, duplicate banner, and confirmation Dialog.
- `src/components/app-shell/intake-readiness.tsx`: owned ready-intake presentation.
- `src/components/app-shell/new-analysis-home.tsx`: approved shell composition and recent/metrics panels.
- `src/app/app/video/[id]/page.tsx`: protected readiness route.
- `src/env.ts`: public and server-only provider environment validation.
- `supabase/migrations/202607120002_create_analysis_intakes.sql`: table, constraints, indexes, RLS, and atomic attempt RPC.
- `tests/e2e/intake.spec.ts`: responsive, keyboard, reduced-motion, duplicate, and readiness browser flows.

---

### Task 1: Pure URL, Artifact Configuration, and Fingerprint Domain

**Files:**

- Create: `src/lib/youtube-intake/url.ts`
- Create: `src/lib/youtube-intake/url.test.ts`
- Create: `src/lib/youtube-intake/configuration.ts`
- Create: `src/lib/youtube-intake/configuration.test.ts`
- Create: `src/lib/youtube-intake/fingerprint.ts`
- Create: `src/lib/youtube-intake/fingerprint.test.ts`

**Interfaces:**

- Produces: `parseYouTubeUrl(raw: string): YouTubeUrlResult` where success contains `{ videoId, canonicalUrl }`.
- Produces: `intakeConfigurationSchema`, `defaultArtifactSelection`, `normalizeIntakeConfiguration(input): NormalizedIntakeConfiguration`.
- Produces: `createDuplicateKey(videoId, configuration): string`.

- [ ] **Step 1: Write failing URL parser tests**

```ts
import { describe, expect, test } from 'vitest';
import { parseYouTubeUrl } from './url';

describe('parseYouTubeUrl', () => {
  test.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=4', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=value', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('accepts %s', (raw, videoId) => {
    expect(parseYouTubeUrl(`  ${raw}  `)).toEqual({
      ok: true,
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  });

  test.each([
    'http://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com:444/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/playlist?list=PL123',
    'https://youtube.com/watch?v=short',
    'https://youtu.be/dQw4w9WgXcQ?v=aaaaaaaaaaa',
  ])('rejects %s', (raw) => {
    expect(parseYouTubeUrl(raw)).toEqual({ ok: false, code: 'invalid_url' });
  });
});
```

- [ ] **Step 2: Run URL tests and verify the missing-module failure**

Run: `npm test -- src/lib/youtube-intake/url.test.ts`

Expected: FAIL because `./url` does not exist.

- [ ] **Step 3: Implement strict pure URL parsing**

```ts
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const longHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

export type YouTubeUrlResult =
  | Readonly<{ ok: true; videoId: string; canonicalUrl: string }>
  | Readonly<{ ok: false; code: 'invalid_url' }>;

export function parseYouTubeUrl(raw: string): YouTubeUrlResult {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, code: 'invalid_url' };
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    (!longHosts.has(url.hostname) && url.hostname !== 'youtu.be')
  )
    return { ok: false, code: 'invalid_url' };

  const segments = url.pathname.split('/').filter(Boolean);
  const pathId =
    url.hostname === 'youtu.be'
      ? segments.length === 1
        ? segments[0]
        : undefined
      : segments.length === 2 &&
          ['shorts', 'embed', 'live'].includes(segments[0])
        ? segments[1]
        : undefined;
  const queryId =
    longHosts.has(url.hostname) && url.pathname === '/watch'
      ? (url.searchParams.get('v') ?? undefined)
      : undefined;
  const videoId = pathId ?? queryId;
  const conflictingQuery = pathId && url.searchParams.get('v');
  if (
    !videoIdPattern.test(videoId ?? '') ||
    (conflictingQuery && conflictingQuery !== videoId)
  )
    return { ok: false, code: 'invalid_url' };
  return {
    ok: true,
    videoId: videoId!,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
```

- [ ] **Step 4: Write failing configuration and fingerprint tests**

```ts
import { describe, expect, test } from 'vitest';
import {
  defaultArtifactSelection,
  normalizeIntakeConfiguration,
} from './configuration';

describe('intake configuration', () => {
  test('uses the approved artifact defaults', () => {
    expect(defaultArtifactSelection).toEqual([
      'summary',
      'timestamps',
      'transcript',
    ]);
  });

  test('requires at least one artifact and removes duplicates', () => {
    expect(() =>
      normalizeIntakeConfiguration({
        outputLocale: 'en',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
        artifacts: [],
        analysisContractVersion: 1,
      }),
    ).toThrow();
    expect(
      normalizeIntakeConfiguration({
        outputLocale: 'en',
        summaryPreset: 'detailed',
        flashcardPreset: 30,
        artifacts: ['transcript', 'summary', 'summary'],
        analysisContractVersion: 1,
      }),
    ).toMatchObject({
      artifacts: ['summary', 'transcript'],
      flashcardPreset: null,
    });
  });
});
```

```ts
import { describe, expect, test } from 'vitest';
import { createDuplicateKey } from './fingerprint';

const base = {
  outputLocale: 'en' as const,
  summaryPreset: 'balanced' as const,
  flashcardPreset: null,
  artifacts: ['summary', 'transcript'] as const,
  analysisContractVersion: 1,
};

describe('createDuplicateKey', () => {
  test('is stable across artifact order and ignores inactive presets', () => {
    const first = createDuplicateKey('dQw4w9WgXcQ', base);
    const second = createDuplicateKey('dQw4w9WgXcQ', {
      ...base,
      artifacts: ['transcript', 'summary'],
      flashcardPreset: null,
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  test('changes when a selected artifact or active preset changes', () => {
    expect(createDuplicateKey('dQw4w9WgXcQ', base)).not.toBe(
      createDuplicateKey('dQw4w9WgXcQ', { ...base, summaryPreset: 'detailed' }),
    );
    expect(createDuplicateKey('dQw4w9WgXcQ', base)).not.toBe(
      createDuplicateKey('dQw4w9WgXcQ', {
        ...base,
        artifacts: ['flashcards'],
        summaryPreset: null,
        flashcardPreset: 18,
      }),
    );
  });
});
```

- [ ] **Step 5: Implement schemas, normalization, canonical JSON, and digest**

```ts
// configuration.ts
import { z } from 'zod';

export const artifactSchema = z.enum([
  'summary',
  'timestamps',
  'transcript',
  'flashcards',
]);
export const defaultArtifactSelection = [
  'summary',
  'timestamps',
  'transcript',
] as const;
export const intakeConfigurationSchema = z.object({
  outputLocale: z.enum(['uk', 'ru', 'en', 'es', 'de']),
  summaryPreset: z.enum(['balanced', 'detailed']),
  flashcardPreset: z.union([z.literal(18), z.literal(30)]),
  artifacts: z.array(artifactSchema).min(1),
  analysisContractVersion: z.literal(1),
});
export type IntakeConfiguration = z.infer<typeof intakeConfigurationSchema>;
export type NormalizedIntakeConfiguration = Readonly<{
  outputLocale: IntakeConfiguration['outputLocale'];
  summaryPreset: IntakeConfiguration['summaryPreset'] | null;
  flashcardPreset: IntakeConfiguration['flashcardPreset'] | null;
  artifacts: readonly z.infer<typeof artifactSchema>[];
  analysisContractVersion: 1;
}>;
export function normalizeIntakeConfiguration(
  input: unknown,
): NormalizedIntakeConfiguration {
  const parsed = intakeConfigurationSchema.parse(input);
  const artifacts = [...new Set(parsed.artifacts)].sort();
  return {
    ...parsed,
    artifacts,
    summaryPreset: artifacts.includes('summary') ? parsed.summaryPreset : null,
    flashcardPreset: artifacts.includes('flashcards')
      ? parsed.flashcardPreset
      : null,
  };
}
```

```ts
// fingerprint.ts
import { createHash } from 'node:crypto';
import type { NormalizedIntakeConfiguration } from './configuration';

export function createDuplicateKey(
  youtubeVideoId: string,
  configuration: NormalizedIntakeConfiguration,
): string {
  const canonical = JSON.stringify({
    youtubeVideoId,
    outputLocale: configuration.outputLocale,
    artifacts: [...configuration.artifacts].sort(),
    summaryPreset: configuration.summaryPreset,
    flashcardPreset: configuration.flashcardPreset,
    analysisContractVersion: configuration.analysisContractVersion,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
```

- [ ] **Step 6: Run domain tests, then commit**

Run: `npm test -- src/lib/youtube-intake/url.test.ts src/lib/youtube-intake/configuration.test.ts src/lib/youtube-intake/fingerprint.test.ts`

Expected: PASS.

```bash
git add src/lib/youtube-intake
git commit -m "feat(DEN-16): add intake domain validation"
```

### Task 2: Server Environment and Fixed-Origin Provider Adapters

**Files:**

- Modify: `src/env.ts`
- Modify: `src/env.test.ts`
- Create: `src/lib/youtube-intake/providers.ts`
- Create: `src/lib/youtube-intake/youtube-provider.ts`
- Create: `src/lib/youtube-intake/youtube-provider.test.ts`
- Create: `src/lib/youtube-intake/supadata-provider.ts`
- Create: `src/lib/youtube-intake/supadata-provider.test.ts`

**Interfaces:**

- Consumes: canonical URL and video ID from Task 1.
- Produces: `validateProviderEnv(process.env): ProviderEnv`.
- Produces: `VideoMetadataProvider.getVideo(videoId): Promise<VideoMetadataResult>`.
- Produces: `TranscriptProvider.getNativeTranscript(canonicalUrl, preferredLanguage): Promise<TranscriptResult>`.

- [ ] **Step 1: Write failing server-environment tests**

```ts
import { expect, test } from 'vitest';
import { validateProviderEnv } from './env';

test('requires both server-only provider keys', () => {
  expect(() => validateProviderEnv({})).toThrow(
    'YOUTUBE_DATA_API_KEY is required',
  );
  expect(() => validateProviderEnv({ YOUTUBE_DATA_API_KEY: 'yt' })).toThrow(
    'SUPADATA_API_KEY is required',
  );
  expect(
    validateProviderEnv({
      YOUTUBE_DATA_API_KEY: 'yt',
      SUPADATA_API_KEY: 'supadata',
    }),
  ).toEqual({ YOUTUBE_DATA_API_KEY: 'yt', SUPADATA_API_KEY: 'supadata' });
});
```

- [ ] **Step 2: Add isolated server-only validation**

```ts
export type ProviderEnv = Readonly<{
  YOUTUBE_DATA_API_KEY: string;
  SUPADATA_API_KEY: string;
}>;
export function validateProviderEnv(input: NodeJS.ProcessEnv): ProviderEnv {
  const youtube = input.YOUTUBE_DATA_API_KEY?.trim();
  if (!youtube) throw new Error('YOUTUBE_DATA_API_KEY is required');
  const supadata = input.SUPADATA_API_KEY?.trim();
  if (!supadata) throw new Error('SUPADATA_API_KEY is required');
  return Object.freeze({
    YOUTUBE_DATA_API_KEY: youtube,
    SUPADATA_API_KEY: supadata,
  });
}
```

- [ ] **Step 3: Write provider contract and failing adapter tests**

```ts
// providers.ts
export type IntakeErrorCode =
  | 'invalid_url'
  | 'video_unavailable'
  | 'video_restricted'
  | 'live_not_ready'
  | 'unsupported_duration'
  | 'transcript_unavailable'
  | 'transcript_language_unavailable'
  | 'provider_configuration'
  | 'provider_unavailable'
  | 'session_expired'
  | 'persistence_failure';
export type VideoMetadata = Readonly<{
  videoId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  captionAvailable: boolean;
}>;
export type TranscriptSegment = Readonly<{
  text: string;
  offsetMs: number;
  durationMs: number;
}>;
export type VideoMetadataResult =
  | Readonly<{ ok: true; data: VideoMetadata }>
  | Readonly<{
      ok: false;
      code: Extract<
        IntakeErrorCode,
        | 'video_unavailable'
        | 'video_restricted'
        | 'live_not_ready'
        | 'unsupported_duration'
        | 'provider_configuration'
        | 'provider_unavailable'
      >;
    }>;
export type TranscriptResult =
  | Readonly<{
      ok: true;
      language: string;
      segments: readonly TranscriptSegment[];
    }>
  | Readonly<{
      ok: false;
      code: Extract<
        IntakeErrorCode,
        | 'transcript_unavailable'
        | 'transcript_language_unavailable'
        | 'provider_configuration'
        | 'provider_unavailable'
      >;
    }>;
export type VideoMetadataProvider = Readonly<{
  getVideo(videoId: string): Promise<VideoMetadataResult>;
}>;
export type TranscriptProvider = Readonly<{
  getNativeTranscript(
    canonicalUrl: string,
    preferredLanguage?: string,
  ): Promise<TranscriptResult>;
}>;
```

```ts
import { expect, test, vi } from 'vitest';
import {
  createYouTubeProvider,
  parseIsoDurationSeconds,
} from './youtube-provider';

test('maps validated YouTube metadata and uses a fixed videos.list origin', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        items: [
          {
            id: 'dQw4w9WgXcQ',
            snippet: {
              title: 'Title',
              channelTitle: 'Channel',
              thumbnails: { high: { url: 'https://i.ytimg.com/image.jpg' } },
            },
            contentDetails: { duration: 'PT1H2M3S', caption: 'true' },
            status: {
              privacyStatus: 'public',
              embeddable: true,
              uploadStatus: 'processed',
            },
          },
        ],
      }),
      { status: 200 },
    ),
  );
  const result = await createYouTubeProvider('secret', fetcher).getVideo(
    'dQw4w9WgXcQ',
  );
  expect(result).toMatchObject({ ok: true, data: { durationSeconds: 3723 } });
  const calledUrl = new URL(fetcher.mock.calls[0][0]);
  expect(calledUrl.origin).toBe('https://www.googleapis.com');
  expect(calledUrl.pathname).toBe('/youtube/v3/videos');
  expect(parseIsoDurationSeconds('P1D')).toBeNull();
});
```

```ts
import { expect, test, vi } from 'vitest';
import { createSupadataProvider } from './supadata-provider';

test('always requests native timestamped transcript without AI fallback', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        lang: 'en',
        content: [{ text: 'Hello', offset: 0, duration: 1200 }],
      }),
      { status: 200 },
    ),
  );
  const result = await createSupadataProvider(
    'secret',
    fetcher,
  ).getNativeTranscript('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'en');
  expect(result).toMatchObject({ ok: true, language: 'en' });
  const url = new URL(fetcher.mock.calls[0][0]);
  expect(url.origin).toBe('https://api.supadata.ai');
  expect(url.searchParams.get('mode')).toBe('native');
  expect(url.href).not.toMatch(/auto|generate/);
});

test.each([
  [206, 'transcript_unavailable'],
  [401, 'provider_configuration'],
  [402, 'provider_configuration'],
  [429, 'provider_unavailable'],
  [503, 'provider_unavailable'],
])('maps status %i to %s', async (status, code) => {
  const provider = createSupadataProvider(
    'secret',
    vi.fn().mockResolvedValue(new Response('', { status })),
  );
  await expect(
    provider.getNativeTranscript('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ).resolves.toEqual({ ok: false, code });
});
```

- [ ] **Step 4: Implement adapters with Zod validation and bounded timeouts**

Implement `createYouTubeProvider(apiKey, fetcher = fetch)` and `createSupadataProvider(apiKey, fetcher = fetch)` so they:

```ts
const response = await fetcher(fixedUrl, {
  headers: providerHeaders,
  signal: AbortSignal.timeout(10_000),
});
```

Use Zod schemas for every consumed field, reject response text over 5 MB before JSON parsing, map malformed/timeout/5xx responses to `provider_unavailable`, map an empty YouTube `items` array to `video_unavailable`, reject non-public/non-embeddable/live-in-progress states with their stable codes, and parse only `PT#H#M#S` durations into safe integer seconds.

- [ ] **Step 5: Run provider tests and commit**

Run: `npm test -- src/env.test.ts src/lib/youtube-intake/youtube-provider.test.ts src/lib/youtube-intake/supadata-provider.test.ts`

Expected: PASS, including 206/401/402/429/5xx and timeout/malformed-response cases.

```bash
git add src/env.ts src/env.test.ts src/lib/youtube-intake
git commit -m "feat(DEN-16): add YouTube and native transcript adapters"
```

### Task 3: RLS-Protected Intake Persistence and Atomic Re-analysis

**Files:**

- Create: `supabase/migrations/202607120002_create_analysis_intakes.sql`
- Create: `src/lib/youtube-intake/migration.test.ts`
- Create: `src/lib/youtube-intake/repository.ts`
- Create: `src/lib/youtube-intake/supabase-repository.ts`
- Create: `src/lib/youtube-intake/supabase-repository.test.ts`

**Interfaces:**

- Consumes: normalized configuration and provider results from Tasks 1–2.
- Produces: `AnalysisIntake`, `NewAnalysisIntake`, and `IntakeRepository` with `findReusable`, `insertReady`, `findOwned`, and `createReanalysis`.

- [ ] **Step 1: Write failing migration contract tests**

```ts
import fs from 'node:fs';
import { expect, test } from 'vitest';

const sql = fs.readFileSync(
  'supabase/migrations/202607120002_create_analysis_intakes.sql',
  'utf8',
);
test('creates constrained private intake storage and atomic re-analysis', () => {
  expect(sql).toMatch(/create table public\.analysis_intakes/);
  expect(sql).toMatch(/unique \(user_id, duplicate_key, attempt\)/);
  expect(sql).toMatch(/enable row level security/);
  expect(sql).toMatch(/auth\.uid\(\) = user_id/g);
  expect(sql).toMatch(/create function public\.create_analysis_reattempt/);
  expect(sql).toMatch(/for update/);
});
```

- [ ] **Step 2: Add the migration**

Create the table columns from the approved spec with checks for 11-character YouTube IDs, HTTPS canonical URLs, non-empty locale/language/title, positive duration, allowed presets, a non-empty `text[] selected_artifacts` contained by the four allowed identifiers, 64-character lowercase hex duplicate keys, attempts greater than zero, and statuses `ready|processing|complete|failed`. Add the specified indexes and select/insert/update-own RLS policies; DEN-16 must not add deletion. Add `security invoker` RPC `create_analysis_reattempt(source_id uuid, refreshed_snapshot jsonb)` using `SELECT ... FOR UPDATE`, `auth.uid()`, `max(attempt)+1`, and `reanalysis_of = source_id`. The RPC must insert the refreshed provider-validated metadata and transcript snapshot supplied by the server rather than copying stale source content; use that function name and payload consistently in SQL and TypeScript.

- [ ] **Step 3: Define repository types and write failing mapping/concurrency tests**

```ts
export type AnalysisIntake = Readonly<{
  id: string;
  userId: string;
  youtubeVideoId: string;
  canonicalUrl: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  transcriptLanguage: string;
  transcriptSegments: readonly TranscriptSegment[];
  configuration: NormalizedIntakeConfiguration;
  duplicateKey: string;
  attempt: number;
  status: 'ready' | 'processing' | 'complete' | 'failed';
  reanalysisOf: string | null;
  createdAt: string;
}>;
export type NewAnalysisIntake = Omit<
  AnalysisIntake,
  'id' | 'attempt' | 'status' | 'reanalysisOf' | 'createdAt'
>;
export type IntakeRepository = Readonly<{
  findReusable(
    userId: string,
    duplicateKey: string,
  ): Promise<AnalysisIntake | null>;
  insertReady(input: NewAnalysisIntake): Promise<AnalysisIntake>;
  findOwned(userId: string, id: string): Promise<AnalysisIntake | null>;
  createReanalysis(
    userId: string,
    sourceId: string,
    refreshedSnapshot: NewAnalysisIntake,
  ): Promise<AnalysisIntake>;
}>;
```

Test that the Supabase adapter always filters `user_id`, excludes `failed` from reusable rows, orders by attempt descending, maps snake_case rows through Zod, re-queries on Postgres unique violation `23505`, and passes the fresh server-validated snapshot to `create_analysis_reattempt` for re-analysis.

- [ ] **Step 4: Implement the repository adapter**

Use a narrow structural `SupabaseIntakeClient` type instead of importing a generated database type. Map rows in private `parseIntakeRow` and `toInsertRow` functions. Throw a typed `IntakeRepositoryError` with code `persistence_failure` for invalid rows and non-unique database failures; never return raw Supabase messages to the caller.

- [ ] **Step 5: Run persistence tests and commit**

Run: `npm test -- src/lib/youtube-intake/migration.test.ts src/lib/youtube-intake/supabase-repository.test.ts`

Expected: PASS.

```bash
git add supabase/migrations/202607120002_create_analysis_intakes.sql src/lib/youtube-intake
git commit -m "feat(DEN-16): persist protected analysis intakes"
```

### Task 4: Intake Orchestration and Authenticated Server Actions

**Files:**

- Create: `src/lib/youtube-intake/service.ts`
- Create: `src/lib/youtube-intake/service.test.ts`
- Create: `src/lib/youtube-intake/actions.ts`
- Create: `src/lib/youtube-intake/actions.test.ts`

**Interfaces:**

- Consumes: Tasks 1–3 domain, providers, and repository.
- Produces: `createIntakeService(dependencies).submit(input)` and `.reanalyze(userId, sourceId)`.
- Produces: `submitYouTubeIntake(previousState, formData): Promise<IntakeActionState>` and `reanalyzeIntake(previousState, formData)`.

- [ ] **Step 1: Write failing orchestration tests**

```ts
test('reuses an exact intake before requesting a paid transcript', async () => {
  const transcript = vi.fn();
  const service = createIntakeService({
    metadata,
    transcript: { getNativeTranscript: transcript },
    repository,
  });
  repository.findReusable.mockResolvedValue(existing);
  await expect(service.submit(validInput)).resolves.toEqual({
    kind: 'duplicate',
    intake: existing,
  });
  expect(transcript).not.toHaveBeenCalled();
  expect(repository.insertReady).not.toHaveBeenCalled();
});

test('validates providers and stores a transcript snapshot for a new intake', async () => {
  repository.findReusable.mockResolvedValue(null);
  await expect(
    createIntakeService(dependencies).submit(validInput),
  ).resolves.toMatchObject({ kind: 'ready', intake: { status: 'ready' } });
  expect(transcript.getNativeTranscript).toHaveBeenCalledWith(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'en',
  );
  expect(repository.insertReady).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: validInput.userId,
      transcriptSegments: segments,
    }),
  );
});
```

Add separate cases for invalid URL short-circuit, every metadata/transcript error code, duplicate race recovery, and explicit re-analysis ownership failure.

- [ ] **Step 2: Implement ordered service flow**

`submit` must parse URL and configuration, request metadata, compute the normalized fingerprint, query `findReusable`, return the duplicate immediately, otherwise retrieve a native transcript, insert a ready row, and return `{ kind: 'ready', intake }`. `reanalyze` must load the owned source, re-check current metadata and native transcript, construct a refreshed `NewAnalysisIntake` from the owned configuration and validated provider data, then pass that snapshot to the repository atomic method; it must never trust form-provided metadata, user ID, configuration, or duplicate key.

- [ ] **Step 3: Write failing Server Action state tests**

```ts
export type IntakeActionState = Readonly<{
  status: 'idle' | 'error' | 'duplicate' | 'ready';
  rawUrl: string;
  configuration: IntakeConfiguration;
  message?: string;
  existingId?: string;
  redirectTo?: string;
}>;
```

Mock `createServerSupabaseClient`, provider factories, and service creation. Verify session expiry returns safe copy, raw URL/configuration survive validation and provider failures, duplicate exposes only `existingId`, ready returns `/app/video/{id}`, and no upstream error body reaches `message`.

- [ ] **Step 4: Implement action parsing and safe copy mapping**

Parse repeated `artifacts` values with `formData.getAll('artifacts')`, profile-derived defaults on first render, and stable error messages for every `IntakeErrorCode`. Authenticate with `supabase.auth.getUser()` before provider setup. Return data to the client; perform navigation in the client after a `ready` state so action-state tests remain deterministic.

- [ ] **Step 5: Run service/action tests and commit**

Run: `npm test -- src/lib/youtube-intake/service.test.ts src/lib/youtube-intake/actions.test.ts`

Expected: PASS.

```bash
git add src/lib/youtube-intake/service.ts src/lib/youtube-intake/service.test.ts src/lib/youtube-intake/actions.ts src/lib/youtube-intake/actions.test.ts
git commit -m "feat(DEN-16): orchestrate protected video intake"
```

### Task 5: Approved New Analysis Form, Artifact Options, and Duplicate Banner

**Files:**

- Create: `src/components/app-shell/new-analysis-form.tsx`
- Create: `src/components/app-shell/new-analysis-form.test.tsx`
- Modify: `src/components/app-shell/new-analysis-home.tsx`
- Modify: `src/components/app-shell/new-analysis-home.test.tsx`
- Modify: `src/app/app/page.tsx`
- Create: `src/app/app/page.test.tsx`
- Modify: `src/styles/app-shell-reference.css`

**Interfaces:**

- Consumes: `IntakeActionState`, `submitYouTubeIntake`, `reanalyzeIntake`, and persisted onboarding preferences.
- Produces: interactive form embedded in unchanged `.analysis-hero` geometry.

- [ ] **Step 1: Write failing interaction tests**

Render `NewAnalysisForm` with an injected action wrapper and assert:

```ts
expect(screen.getByLabelText('YouTube URL')).toBeEnabled();
expect(screen.getByRole('button', { name: 'Analyze video' })).toBeEnabled();
await user.click(screen.getByRole('button', { name: 'Advanced options' }));
expect(screen.getByRole('checkbox', { name: 'Summary' })).toBeChecked();
expect(screen.getByRole('checkbox', { name: 'Timestamps' })).toBeChecked();
expect(screen.getByRole('checkbox', { name: 'Transcript' })).toBeChecked();
expect(screen.getByRole('checkbox', { name: 'Flashcards' })).not.toBeChecked();
```

Then verify deselecting all artifacts shows `Choose at least one artifact.`, flashcard options appear only after selecting Flashcards, pending state keeps the typed URL and prevents double submit, recoverable error remains in `role=status`, and a duplicate state renders the exact approved copy and links.

- [ ] **Step 2: Implement the client form with existing primitives**

Use `useActionState`, `useFormStatus`, the existing `Dialog`, semantic checkboxes, and `router.push(state.redirectTo)` in an effect. Preserve the `.beam-form.app-beam-form` DOM shape and button geometry. Replace the disabled placeholder copy with an `Advanced options` button and a concise active selection summary. Port the duplicate banner structure and copy from `history.html` exactly:

```tsx
<section className="duplicate-banner" aria-labelledby="duplicate-title">
  <h2 id="duplicate-title">You already analyzed this video.</h2>
  <p>No credits will be used.</p>
  <Link href={`/app/video/${state.existingId}`}>Open saved result</Link>
  <button type="button" onClick={() => setConfirmOpen(true)}>
    Analyze again
  </button>
</section>
```

The confirmation Dialog repeats the normalized configuration and states that a new processing attempt will be created. Its hidden input contains only `sourceId`.

- [ ] **Step 3: Load profile defaults on the server and compose the approved home**

Make `/app` read the authenticated profile through the existing onboarding repository, then pass only output locale and presets to `NewAnalysisHome`. Keep artifact defaults in `configuration.ts`. Do not move recent analyses or monthly metrics into this issue.

- [ ] **Step 4: Add restrained reference-matching states**

Add only token-based CSS selectors for advanced options, focus-visible, error/status text, duplicate banner, selected artifact controls, pending state, and Dialog layout. Preserve existing hero padding, radius, beam line, spectral accents, typography, panel dimensions, responsive breakpoints, and reduced-motion rules. Ensure every touch control is at least 44px under coarse pointers.

- [ ] **Step 5: Run component tests and commit**

Run: `npm test -- src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/new-analysis-home.test.tsx src/app/app/page.test.tsx`

Expected: PASS.

```bash
git add src/components/app-shell src/app/app/page.tsx src/styles/app-shell-reference.css
git commit -m "feat(DEN-16): activate approved YouTube intake form"
```

### Task 6: Owned Intake Readiness Route

**Files:**

- Create: `src/components/app-shell/intake-readiness.tsx`
- Create: `src/components/app-shell/intake-readiness.test.tsx`
- Create: `src/app/app/video/[id]/page.tsx`
- Create: `src/app/app/video/[id]/page.test.tsx`
- Modify: `src/styles/app-shell-reference.css`

**Interfaces:**

- Consumes: `IntakeRepository.findOwned(userId, id)` and authenticated Supabase user.
- Produces: protected `/app/video/[id]` page inside the shared app layout.

- [ ] **Step 1: Write failing readiness and ownership tests**

```ts
render(<IntakeReadiness intake={readyIntake} />);
expect(screen.getByRole('heading', { name: readyIntake.title })).toBeInTheDocument();
expect(screen.getByText(readyIntake.channelTitle)).toBeInTheDocument();
expect(screen.getByText('Ready for processing')).toBeInTheDocument();
expect(screen.getByText(/processing is implemented in the next issue/i)).toBeInTheDocument();
expect(screen.queryByText(/generated summary/i)).not.toBeInTheDocument();
```

Mock the page dependencies and verify a missing session redirects to `/session-expired`, while missing/foreign IDs call `notFound()` and never render row data.

- [ ] **Step 2: Implement the presentation component**

Render validated thumbnail, title, channel, formatted duration, transcript language, selected artifacts, applicable presets, status, truthful next-issue copy, and a link back to `/app`. Never render transcript content or pretend generated artifacts exist.

- [ ] **Step 3: Implement the protected server page**

Read `params` asynchronously, authenticate with `getUser()`, construct the repository, call `findOwned(user.id, id)`, and use `notFound()` for null. Export metadata title from the validated intake title without exposing foreign records.

- [ ] **Step 4: Add reference-aligned responsive CSS, test, and commit**

Use existing panel, eyebrow, typography, border, and token styles; add no generic SaaS cards, large gradients, or glassmorphism.

Run: `npm test -- src/components/app-shell/intake-readiness.test.tsx 'src/app/app/video/[id]/page.test.tsx'`

Expected: PASS.

```bash
git add src/components/app-shell/intake-readiness* 'src/app/app/video/[id]' src/styles/app-shell-reference.css
git commit -m "feat(DEN-16): add intake readiness route"
```

### Task 7: Fixture Safety, Browser Coverage, and Full Verification

**Files:**

- Modify: `src/app/app-shell-fixture/page.tsx`
- Modify: `src/app/app-shell-fixture/page.test.tsx`
- Modify: `tests/e2e/fixtures.ts`
- Create: `tests/e2e/intake.spec.ts`
- Modify: `tests/e2e/ui-production.spec.ts`
- Modify: `README.md`

**Interfaces:**

- Consumes: completed DEN-16 flow.
- Produces: deterministic development-only provider/storage fixtures and production exclusion assertions.

- [ ] **Step 1: Add failing fixture and production-protection tests**

Create deterministic fixture cases selected by a local-only query parameter: new ready intake, exact duplicate, invalid URL, private/unavailable, transcript unavailable, provider outage, and re-analysis. Assert fixture modules throw or return `notFound()` when `NODE_ENV === 'production'`, and add each fixture path to `ui-production.spec.ts` forbidden-route coverage.

- [ ] **Step 2: Implement dependency injection at the action/service boundary**

Keep production actions wired only to real fixed-origin adapters. Expose a development/test factory that supplies in-memory providers and repository without reading provider keys or writing Supabase. Do not branch provider behavior from arbitrary user input in production code.

- [ ] **Step 3: Add end-to-end browser stories**

```ts
test('chooses artifacts, preserves failures, detects duplicates, and opens readiness', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?intake=ready');
  await page.getByLabel('YouTube URL').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Flashcards' }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: 'Save options' }).click();
  await page.getByRole('button', { name: 'Analyze video' }).click();
  await expect(page).toHaveURL(/\/app\/video\//);
  await expect(page.getByText('Ready for processing')).toBeVisible();
});
```

Add separate exact-duplicate/open-existing/re-analysis confirmation, error preservation, keyboard focus order, 44px touch targets, the combined `Checking video and transcript…` aria-live announcement, and pending double-submit stories. Do not use fake timers or assert timer-derived phase changes; pending resets naturally when the Server Action resolves and remains present under reduced motion.

- [ ] **Step 4: Verify all approved viewport and motion variants**

Run Playwright checks at 1440×900, 1024×768, 980×768, and 390×844. At each viewport assert no horizontal overflow; at mobile assert the form, options Dialog, duplicate banner, and readiness route remain usable above the fixed bottom navigation. With reduced motion, assert transitions/animations are `none` while all content remains visible.

- [ ] **Step 5: Document required environment variables and setup**

Add server-only names `YOUTUBE_DATA_API_KEY` and `SUPADATA_API_KEY`, YouTube Data API v3 enablement, restricted key guidance, Supadata native-mode requirement, and migration command to README. Include no credential values and do not create or commit `.env` files.

- [ ] **Step 6: Run the complete verification ladder**

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

Expected: every command exits 0; the full existing suite plus DEN-16 tests passes; fixture routes are unavailable in production.

- [ ] **Step 7: Perform real authenticated browser verification**

With local server-only keys configured outside git and the Supabase migration applied, submit one public captioned YouTube video in a real authenticated session. Verify new ready intake, database ownership, exact duplicate without a second insert or transcript request, open existing, confirmed re-analysis attempt increment, desktop/mobile layout, keyboard navigation, touch targets, reduced motion, no console errors, and no secret/transcript logging.

- [ ] **Step 8: Commit verification assets**

```bash
git add src/app/app-shell-fixture tests/e2e README.md
git commit -m "test(DEN-16): verify YouTube intake flow"
```

Do not mark DEN-16 complete or merge until the full verification ladder and real authenticated provider flow both pass.

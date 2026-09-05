# DEN-118 Adaptive Long-Form Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate complete, non-repetitive summaries whose depth adapts to Compact, Balanced, or Deep mode and whose long-form route is mandatory for videos of at least 20 minutes.

**Architecture:** Introduce one canonical `SummaryMode` boundary shared by profiles, intake, history, and pipeline code, while accepting legacy `detailed` values only at database read and duplicate-lookup boundaries. Keep short videos on a strengthened one-pass generator; route every video with `durationSeconds >= 1200` through an idea-map call followed by composition, deterministic coverage/duplication validation, and at most one repair call. The existing Summary presentation remains title plus one complete visible paragraph per chapter.

**Tech Stack:** TypeScript strict mode, Next.js App Router, React, Zod, Supabase/Postgres migrations, OpenRouter structured output, Vitest, Testing Library, Playwright, Tailwind-compatible shared CSS tokens.

**Spec:** `docs/superpowers/specs/2026-08-19-adaptive-summary-modes-design.md`

## Global Constraints

- A video is long-form when `durationSeconds >= 1200`; 20:00 is inclusive.
- Every long-form video uses the two-pass route regardless of mode or transcript density.
- Section ranges guide composition but never authorize omission of a high-importance idea.
- Generated Summary chapters render only a title and one complete main paragraph.
- Compact uses the shortest useful explanation; Balanced remains complete; Deep preserves full argument structure and significant examples.
- V3 artifacts keep grounded nullable `supportingQuote` and `sourceOffsetMs` values and no more than 20 sections.
- Legacy `detailed` reads as Deep; new writes use only `compact`, `balanced`, or `deep`.
- Provider metadata and logs contain no transcript or generated prose.
- No new production dependency is required.
- Preserve the dark-only “The Prism” UI and existing shared tokens; support desktop, tablet, mobile, keyboard navigation, and `prefers-reduced-motion`.

---

## File Structure

- Create `src/lib/summary-mode.ts`: canonical and legacy-compatible Summary mode schemas and normalization.
- Create `src/lib/analysis-pipeline/summary-policy.ts`: deterministic route and section-range selection.
- Create `src/lib/analysis-pipeline/summary-generation-schemas.ts`: private idea-map and composed-summary structured-output contracts.
- Create `src/lib/analysis-pipeline/summary-quality.ts`: deterministic coverage and duplicate checks.
- Create `supabase/migrations/202608300001_den_118_summary_modes.sql`: additive-compatible constraint change and stored-value migration.
- Modify `src/lib/analysis-pipeline/generators.ts`: mode prompts, two-pass orchestration, repair, grounding, and safe metadata aggregation.
- Modify `src/lib/analysis-pipeline/provider.ts` and provider implementations only to add measured latency to safe response metadata.
- Modify onboarding, intake, history, settings, and localization modules to use canonical modes and expose the account default/per-analysis override.
- Keep `src/components/result-workspace/summary-tab.tsx` behavior from commit `4a187c5`; extend regression coverage instead of redesigning it.

## Assumptions, Dependencies, and Risks

- `analysis_intakes.duration_seconds` is the authoritative duration; caption offsets are not used to decide whether a video is long-form.
- Current transcript enrichment classifies segment type but does not expose topic-boundary counts. The first implementation therefore routes with duration, word count, segment count, and requested mode; the unconditional 20-minute threshold does not depend on the missing signal.
- Two-pass generation increases latency and model cost. Safe per-pass metadata is required so production behavior can be measured without logging content.
- Database constraints temporarily accept legacy `detailed` writes during deployment overlap; all application writes become canonical immediately.
- The Linear connector requires reauthentication. Before implementation is marked complete, compare the restored DEN-118 issue with this approved spec and stop if it contains conflicting scope.

---

### Task 1: Canonical Summary Mode and Backward-Compatible Persistence

**Files:**

- Create: `src/lib/summary-mode.ts`
- Create: `src/lib/summary-mode.test.ts`
- Create: `supabase/migrations/202608300001_den_118_summary_modes.sql`
- Create: `src/lib/youtube-intake/summary-mode-migration.test.ts`
- Modify: `src/lib/onboarding/preferences.ts`
- Modify: `src/lib/onboarding/repository.ts`
- Modify: `src/lib/youtube-intake/configuration.ts`
- Modify: `src/lib/youtube-intake/supabase-repository.ts`
- Modify: `src/lib/youtube-intake/fingerprint.ts`
- Modify: `src/lib/youtube-intake/service.ts`
- Modify: `src/lib/history/repository.ts`
- Modify: `src/lib/history/supabase-repository.ts`
- Test: `src/lib/onboarding/preferences.test.ts`
- Test: `src/lib/onboarding/repository.test.ts`
- Test: `src/lib/youtube-intake/configuration.test.ts`
- Test: `src/lib/youtube-intake/fingerprint.test.ts`
- Test: `src/lib/youtube-intake/service.test.ts`
- Test: `src/lib/youtube-intake/supabase-repository.test.ts`
- Test: `src/lib/history/supabase-repository.test.ts`

**Interfaces:**

- Produces: `summaryModeSchema`, `storedSummaryModeSchema`, `SummaryMode`, and `normalizeStoredSummaryMode(value: unknown): SummaryMode`.
- Produces: `createCompatibleDuplicateKeys(videoId, configuration): readonly string[]`, ordered canonical first and legacy Deep/detailed second.
- Consumes: existing profile and intake rows whose `summary_preset` may equal `detailed`.

- [ ] **Step 1: Write failing canonicalization and duplicate-compatibility tests**

```ts
it.each([
  ['compact', 'compact'],
  ['balanced', 'balanced'],
  ['deep', 'deep'],
  ['detailed', 'deep'],
] as const)('normalizes stored %s to %s', (stored, expected) => {
  expect(normalizeStoredSummaryMode(stored)).toBe(expected);
});

it('looks up the canonical Deep fingerprint and its legacy detailed fingerprint', () => {
  const keys = createCompatibleDuplicateKeys('dQw4w9WgXcQ', {
    ...base,
    summaryPreset: 'deep',
  });
  expect(keys).toHaveLength(2);
  expect(new Set(keys).size).toBe(2);
  expect(keys[0]).toBe(
    createDuplicateKey('dQw4w9WgXcQ', {
      ...base,
      summaryPreset: 'deep',
    }),
  );
});
```

- [ ] **Step 2: Run the focused tests and confirm the missing exports fail**

Run: `npx vitest run src/lib/summary-mode.test.ts src/lib/youtube-intake/fingerprint.test.ts`

Expected: FAIL because the canonical mode module and compatible-key function do not exist.

- [ ] **Step 3: Implement the canonical read/write boundary**

```ts
import { z } from 'zod';

export const summaryModeSchema = z.enum(['compact', 'balanced', 'deep']);
export type SummaryMode = z.infer<typeof summaryModeSchema>;

export const storedSummaryModeSchema = z
  .enum(['compact', 'balanced', 'deep', 'detailed'])
  .transform((value): SummaryMode => (value === 'detailed' ? 'deep' : value));

export function normalizeStoredSummaryMode(value: unknown): SummaryMode {
  return storedSummaryModeSchema.parse(value);
}
```

Use `summaryModeSchema` for form/new-write validation. Use `storedSummaryModeSchema` when parsing profile, intake, and history database rows. Replace all local `'balanced' | 'detailed'` unions with `SummaryMode`; keep the word `detailed` only in compatibility tests, migration SQL, and the stored-value parser.

- [ ] **Step 4: Add the forward migration and its contract test**

```sql
alter table public.profiles
  drop constraint if exists profiles_summary_preset_check;
alter table public.profiles
  add constraint profiles_summary_preset_check
  check (summary_preset in ('compact', 'balanced', 'deep', 'detailed'));

alter table public.analysis_intakes
  drop constraint if exists analysis_intakes_summary_preset_check;
alter table public.analysis_intakes
  add constraint analysis_intakes_summary_preset_check
  check (summary_preset in ('compact', 'balanced', 'deep', 'detailed'));

update public.profiles set summary_preset = 'deep' where summary_preset = 'detailed';
update public.analysis_intakes set summary_preset = 'deep' where summary_preset = 'detailed';
```

Keep `detailed` temporarily accepted by database constraints so an overlapping old deployment can still write; application code stops emitting it. Assert both updates, all three canonical values, and the temporary legacy allowance in `summary-mode-migration.test.ts`.

- [ ] **Step 5: Preserve duplicate reuse across the migrated value**

Refactor fingerprint serialization into a private function accepting a string preset. Return only the canonical key for Compact/Balanced and both hashes for Deep:

```ts
export function createCompatibleDuplicateKeys(
  youtubeVideoId: string,
  configuration: NormalizedIntakeConfiguration,
): readonly string[] {
  const canonical = createDuplicateKey(youtubeVideoId, configuration);
  if (configuration.summaryPreset !== 'deep') return [canonical];
  return [
    canonical,
    hashConfiguration(youtubeVideoId, configuration, 'detailed'),
  ];
}
```

In `submit`, query `repository.findReusable` in key order before transcript acquisition. Continue inserting with `keys[0]`. Add a service test where the first lookup returns `null`, the legacy lookup returns an intake, and the transcript provider/pipeline are not called.

- [ ] **Step 6: Run persistence and intake tests**

Run: `npx vitest run src/lib/summary-mode.test.ts src/lib/onboarding/preferences.test.ts src/lib/onboarding/repository.test.ts src/lib/youtube-intake/configuration.test.ts src/lib/youtube-intake/fingerprint.test.ts src/lib/youtube-intake/service.test.ts src/lib/youtube-intake/supabase-repository.test.ts src/lib/youtube-intake/summary-mode-migration.test.ts src/lib/history/supabase-repository.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the persistence boundary**

```bash
git add src/lib/summary-mode.ts src/lib/summary-mode.test.ts src/lib/onboarding src/lib/youtube-intake src/lib/history/repository.ts src/lib/history/supabase-repository.ts src/lib/history/supabase-repository.test.ts supabase/migrations/202608300001_den_118_summary_modes.sql
git commit -m "feat(DEN-118): add canonical summary modes"
```

---

### Task 2: Account Default, Per-Analysis Override, History, and Localization

**Files:**

- Modify: `src/components/onboarding/onboarding-flow.tsx`
- Modify: `src/components/onboarding/onboarding-flow.test.tsx`
- Modify: `src/components/app-shell/new-analysis-form.tsx`
- Modify: `src/components/app-shell/new-analysis-form.test.tsx`
- Modify: `src/components/app-shell/intake-readiness.tsx`
- Modify: `src/components/app-shell/intake-readiness.test.tsx`
- Modify: `src/components/settings/language-preferences.tsx`
- Modify: `src/components/settings/language-preferences.test.tsx`
- Modify: `src/lib/settings/actions.ts`
- Modify: `src/lib/settings/actions.test.ts`
- Modify: `src/app/app/settings/profile/page.tsx`
- Modify: `src/app/app/settings/profile/page.test.tsx`
- Modify: `src/lib/history/presentation.ts`
- Modify: `src/lib/history/presentation.test.ts`
- Modify: `src/lib/i18n/messages/onboarding.ts`
- Modify: `src/lib/i18n/messages/app.ts`
- Modify: `src/lib/i18n/messages/settings.ts`
- Modify: `src/lib/i18n/messages/history.ts`
- Modify: locale catalog tests adjacent to each catalog

**Interfaces:**

- Consumes: `SummaryMode` and `summaryModeSchema` from Task 1.
- Produces: `setSummaryMode(previousState, formData)` returning success with a canonical `mode` or `invalid_summary_mode`, `profile_update_failed`, or `session_expired`.
- Produces: localized `compact`, `balanced`, and `deep` labels/descriptions in all five locales.

- [ ] **Step 1: Write failing UI/action tests for all three modes**

```ts
it('saves a canonical account summary mode', async () => {
  const formData = new FormData();
  formData.set('summaryMode', 'deep');
  await expect(setSummaryMode({ status: 'idle' }, formData)).resolves.toEqual({
    status: 'success',
    mode: 'deep',
  });
  expect(upsert).toHaveBeenCalledWith(
    { user_id: 'user-1', summary_preset: 'deep' },
    { onConflict: 'user_id' },
  );
});

it('submits Compact as a per-analysis override', async () => {
  await user.selectOptions(screen.getByLabelText('Summary mode'), 'compact');
  expect(screen.getByDisplayValue('Compact')).toHaveValue('compact');
  expect(document.querySelector('input[name="summaryPreset"]')).toHaveValue(
    'compact',
  );
});
```

Add catalog assertions that every locale exposes exactly `compact`, `balanced`, and `deep` presentation keys. Extend `SettingsErrorCode` and every Settings catalog with native `invalid_summary_mode` copy; keep storage/auth failures mapped to the existing safe codes.

- [ ] **Step 2: Run the focused UI and localization tests**

Run: `npx vitest run src/lib/settings/actions.test.ts src/components/settings/language-preferences.test.tsx src/components/onboarding/onboarding-flow.test.tsx src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/intake-readiness.test.tsx src/lib/history/presentation.test.ts src/lib/i18n/messages/onboarding.test.ts src/lib/i18n/messages/app.test.ts src/lib/i18n/messages/settings.test.ts src/lib/i18n/messages/history.test.ts`

Expected: FAIL on missing Compact/Deep controls and old Detailed labels.

- [ ] **Step 3: Replace two-mode selectors with three canonical modes**

Render Compact, Balanced, and Deep in onboarding. In New Analysis keep the existing accessible `<select>`, initialize it from `profileDefaults.summaryPreset`, and submit the selected value through the existing hidden `summaryPreset` field:

```tsx
{
  (['compact', 'balanced', 'deep'] as const).map((mode) => (
    <option key={mode} value={mode}>
      {copy.newAnalysis.advanced.summaryModes[mode].title}
    </option>
  ));
}
```

Use the same message map for duplicate/readiness labels and remove the current binary conditional that chooses Detailed for `detailed` and Balanced for every other value.

- [ ] **Step 4: Add the account-default control to Settings**

Extend `LanguagePreferences` props with `summaryMode: SummaryMode` and add a third existing-style `settings-section`. Post `name="summaryMode"` to `setSummaryMode`, display the localized native descriptions, preserve keyboard-native select behavior, and do not add motion or one-off colors.

```tsx
<select
  name="summaryMode"
  value={summaryMode}
  onChange={(event) => setSummaryModeValue(event.target.value as SummaryMode)}
>
  {summaryModes.map((mode) => (
    <option key={mode} value={mode}>
      {copy.summary.modes[mode].title}
    </option>
  ))}
</select>
```

Pass `preferences.summaryPreset` from `src/app/app/settings/profile/page.tsx`.

- [ ] **Step 5: Localize mode promises and history labels**

For `uk`, `ru`, `en`, `es`, and `de`, add native labels plus short descriptions matching the spec: Compact is shortest useful, Balanced is complete/default, Deep is study-ready. Replace History's `balanced/detailed` map with `compact/balanced/deep` and index it directly with the canonical row value.

- [ ] **Step 6: Run focused tests and the locale-key audit**

Run: `npx vitest run src/lib/settings/actions.test.ts src/components/settings/language-preferences.test.tsx src/components/onboarding/onboarding-flow.test.tsx src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/intake-readiness.test.tsx src/lib/history/presentation.test.ts src/lib/i18n/locales.test.ts src/lib/i18n/catalog.test.ts src/lib/i18n/editorial-audit.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the mode experience**

```bash
git add src/components/onboarding src/components/app-shell src/components/settings src/lib/settings src/app/app/settings/profile src/lib/history/presentation.ts src/lib/history/presentation.test.ts src/lib/i18n/messages
git commit -m "feat(DEN-118): expose adaptive summary modes"
```

---

### Task 3: Deterministic Summary Routing Policy

**Files:**

- Create: `src/lib/analysis-pipeline/summary-policy.ts`
- Create: `src/lib/analysis-pipeline/summary-policy.test.ts`
- Modify: `src/lib/analysis-pipeline/generators.ts`

**Interfaces:**

- Consumes: `SummaryMode`, `durationSeconds`, and transcript segment text/offset metadata.
- Produces: `selectSummaryPolicy(input): SummaryGenerationPolicy` where policy has `route`, `sectionRange`, and non-content `signals`.

- [ ] **Step 1: Write table-driven boundary and range tests**

```ts
function input(
  overrides: Partial<SummaryPolicyInput> & { wordCount?: number } = {},
): SummaryPolicyInput {
  const { wordCount = 20, ...policyOverrides } = overrides;
  return {
    durationSeconds: 600,
    mode: 'balanced',
    transcriptSegments: [
      {
        text: Array.from({ length: wordCount }, () => 'word').join(' '),
        offsetMs: 0,
        durationMs: 1_000,
      },
    ],
    ...policyOverrides,
  };
}

it.each([
  [1199, 'one-pass'],
  [1200, 'two-pass'],
  [1201, 'two-pass'],
] as const)('routes %s seconds through %s', (durationSeconds, route) => {
  expect(selectSummaryPolicy(input({ durationSeconds })).route).toBe(route);
});

it.each([
  [1200, { min: 8, max: 12 }],
  [2700, { min: 10, max: 16 }],
  [5400, { min: 14, max: 20 }],
] as const)(
  'uses duration guidance at %s seconds',
  (durationSeconds, range) => {
    expect(
      selectSummaryPolicy(input({ durationSeconds })).sectionRange,
    ).toEqual(range);
  },
);

it('may escalate a dense 19:59 transcript without weakening the 20-minute rule', () => {
  expect(
    selectSummaryPolicy(input({ durationSeconds: 1199, wordCount: 12_000 }))
      .route,
  ).toBe('two-pass');
});
```

- [ ] **Step 2: Run the policy test and confirm it fails**

Run: `npx vitest run src/lib/analysis-pipeline/summary-policy.test.ts`

Expected: FAIL because `selectSummaryPolicy` does not exist.

- [ ] **Step 3: Implement pure route selection**

```ts
export type SummaryPolicyInput = Readonly<{
  durationSeconds: number;
  mode: SummaryMode;
  transcriptSegments: readonly TranscriptSegment[];
}>;

export type SummaryGenerationPolicy = Readonly<{
  route: 'one-pass' | 'two-pass';
  sectionRange: Readonly<{ min: number; max: number }>;
  signals: Readonly<{
    durationSeconds: number;
    wordCount: number;
    segmentCount: number;
  }>;
}>;

export function selectSummaryPolicy(
  input: SummaryPolicyInput,
): SummaryGenerationPolicy {
  const wordCount = input.transcriptSegments.reduce(
    (count, segment) =>
      count + segment.text.trim().split(/\s+/u).filter(Boolean).length,
    0,
  );
  const longForm = input.durationSeconds >= 1200;
  const denseShortVideo =
    wordCount >= 10_000 || input.transcriptSegments.length >= 1_000;
  const deepEscalation = input.mode === 'deep' && wordCount >= 4_000;
  return {
    route:
      longForm || denseShortVideo || deepEscalation ? 'two-pass' : 'one-pass',
    sectionRange: sectionRangeForDuration(input.durationSeconds),
    signals: {
      durationSeconds: input.durationSeconds,
      wordCount,
      segmentCount: input.transcriptSegments.length,
    },
  };
}
```

Implement `sectionRangeForDuration` with `<1200 => 4–8`, `<2700 => 8–12`, `<5400 => 10–16`, and `>=5400 => 14–20`. Keep thresholds server-owned in this module and do not log text.

- [ ] **Step 4: Run the policy suite**

Run: `npx vitest run src/lib/analysis-pipeline/summary-policy.test.ts`

Expected: PASS for 19:59, 20:00, 20:01, all duration ranges, and dense-short escalation.

- [ ] **Step 5: Commit the policy**

```bash
git add src/lib/analysis-pipeline/summary-policy.ts src/lib/analysis-pipeline/summary-policy.test.ts
git commit -m "feat(DEN-118): classify long-form summaries"
```

---

### Task 4: Private Idea-Map and Composition Contracts

**Files:**

- Create: `src/lib/analysis-pipeline/summary-generation-schemas.ts`
- Create: `src/lib/analysis-pipeline/summary-generation-schemas.test.ts`
- Modify: `src/lib/analysis-pipeline/artifact-schemas.ts`
- Test: `src/lib/analysis-pipeline/artifact-schemas.test.ts`

**Interfaces:**

- Produces: `summaryIdeaMapSchema`, `summaryIdeaMapJsonSchema`, `composedSummarySchema`, `composedSummaryJsonSchema`, `SummaryIdeaMap`, and `ComposedSummary`.
- Produces: `SummaryArtifactV3` from `src/lib/analysis-pipeline/artifact-schemas.ts` for the private-to-public mapper.
- Consumes: public V3 artifact fields from `summaryArtifactV3Schema`.
- Guarantees: private coverage IDs are validated during generation and stripped before artifact persistence.

- [ ] **Step 1: Write failing schema tests**

```ts
it('accepts grounded idea clusters with stable identifiers', () => {
  expect(
    summaryIdeaMapSchema.parse({
      ideas: [
        {
          id: 'idea-1',
          importance: 'high',
          topic: 'Cooperation',
          claim: 'Repeated interaction changes incentives.',
          evidence: ['Future encounters reward cooperation.'],
          caveats: ['This depends on recognizing the other participant.'],
          relationships: [],
          sourceOffsetsMs: [60_000],
        },
      ],
    }),
  ).toBeDefined();
});

it('requires each composed section to declare covered idea IDs', () => {
  expect(() =>
    composedSummarySchema.parse({
      schemaVersion: 3,
      title: 'Title',
      outcome: 'Outcome',
      sections: [
        {
          title: 'Section',
          summary: 'Distinct thesis.',
          details: 'A complete explanation with evidence and caveats.',
          supportingQuote: null,
          sourceOffsetMs: null,
        },
      ],
    }),
  ).toThrow();
});
```

- [ ] **Step 2: Run the schema tests and confirm missing contracts fail**

Run: `npx vitest run src/lib/analysis-pipeline/summary-generation-schemas.test.ts src/lib/analysis-pipeline/artifact-schemas.test.ts`

Expected: FAIL because private generation schemas do not exist.

- [ ] **Step 3: Implement strict private structured-output schemas**

Define idea fields exactly as exercised above, with 1–60 ideas, unique IDs, nonempty text arrays, and valid nonnegative source offsets. Define composed sections as the V3 section fields plus `coveredIdeaIds: string[]` with at least one ID. Keep the public `summaryArtifactV3Schema` validation unchanged, export `type SummaryArtifactV3 = z.infer<typeof summaryArtifactV3Schema>`, and export a mapper:

```ts
export function toSummaryArtifact(value: ComposedSummary): SummaryArtifactV3 {
  return {
    schemaVersion: 3,
    title: value.title,
    outcome: value.outcome,
    sections: value.sections.map(
      ({ coveredIdeaIds: _covered, ...section }) => section,
    ),
  };
}
```

Create matching strict JSON Schema objects for OpenRouter. Add refinements for unique idea IDs and unique coverage IDs within each section.

- [ ] **Step 4: Run schema suites**

Run: `npx vitest run src/lib/analysis-pipeline/summary-generation-schemas.test.ts src/lib/analysis-pipeline/artifact-schemas.test.ts`

Expected: PASS, including the unchanged V1/V2/V3 compatibility tests.

- [ ] **Step 5: Commit generation contracts**

```bash
git add src/lib/analysis-pipeline/summary-generation-schemas.ts src/lib/analysis-pipeline/summary-generation-schemas.test.ts src/lib/analysis-pipeline/artifact-schemas.ts src/lib/analysis-pipeline/artifact-schemas.test.ts
git commit -m "feat(DEN-118): add summary coverage contracts"
```

---

### Task 5: Coverage and Duplicate Quality Validation

**Files:**

- Create: `src/lib/analysis-pipeline/summary-quality.ts`
- Create: `src/lib/analysis-pipeline/summary-quality.test.ts`

**Interfaces:**

- Consumes: `SummaryIdeaMap`, `ComposedSummary`, and `SummaryGenerationPolicy`.
- Produces: `validateComposedSummary(input): SummaryQualityFinding[]` with codes `missing_high_importance`, `duplicate_section_text`, `duplicate_adjacent_section`, and `structural_range`.
- Produces: `requiresRepair(findings): boolean`.

- [ ] **Step 1: Write failing validation tests**

```ts
const policy: SummaryGenerationPolicy = {
  route: 'two-pass',
  sectionRange: { min: 8, max: 12 },
  signals: {
    durationSeconds: 1_200,
    wordCount: 4_000,
    segmentCount: 400,
  },
};
const ideaMap: SummaryIdeaMap = {
  ideas: [
    {
      id: 'idea-critical',
      importance: 'high',
      topic: 'Critical topic',
      claim: 'Critical claim',
      evidence: ['Grounded evidence'],
      caveats: [],
      relationships: [],
      sourceOffsetsMs: [0],
    },
    {
      id: 'idea-secondary',
      importance: 'medium',
      topic: 'Secondary topic',
      claim: 'Secondary claim',
      evidence: ['Secondary evidence'],
      caveats: [],
      relationships: [],
      sourceOffsetsMs: [1_000],
    },
  ],
};
const summary: ComposedSummary = {
  schemaVersion: 3,
  title: 'Title',
  outcome: 'Outcome',
  sections: [
    {
      title: 'Different topic',
      summary: 'A distinct short thesis.',
      details: 'A complete explanation that does not cover the critical idea.',
      supportingQuote: null,
      sourceOffsetMs: null,
      coveredIdeaIds: ['idea-secondary'],
    },
  ],
};

it('rejects an omitted high-importance idea even when section count is in range', () => {
  expect(validateComposedSummary({ ideaMap, summary, policy })).toContainEqual(
    expect.objectContaining({
      code: 'missing_high_importance',
      ideaIds: ['idea-critical'],
    }),
  );
});

it('flags normalized thesis/detail repetition', () => {
  const repeatedSummary: ComposedSummary = {
    ...summary,
    sections: [
      {
        ...summary.sections[0],
        summary:
          'Repeated normalized section text with enough comparison tokens.',
        details:
          'Repeated normalized section text with enough comparison tokens.',
        coveredIdeaIds: ['idea-critical'],
      },
    ],
  };
  const findings = validateComposedSummary({
    ideaMap,
    summary: repeatedSummary,
    policy,
  });
  expect(findings.map(({ code }) => code)).toContain('duplicate_section_text');
});
```

Add a separate adjacent-section test by cloning the section twice with different titles and the same `details`. Add the over-range coverage test by generating 13 high-importance ideas and 13 matching sections with `Array.from`; assert no `structural_range` finding because reducing to the policy maximum of 12 would lose required coverage.

- [ ] **Step 2: Run the quality tests and confirm they fail**

Run: `npx vitest run src/lib/analysis-pipeline/summary-quality.test.ts`

Expected: FAIL because the validator does not exist.

- [ ] **Step 3: Implement deterministic normalized comparison and coverage checks**

Normalize with NFKC, lowercase, punctuation removal, whitespace collapse, and a token set. Treat exact normalized equality or Jaccard overlap `>= 0.82` as near-duplicate when both sides have at least eight tokens. Require every high-importance ID to occur in `coveredIdeaIds`; reject unknown IDs. Treat section ranges as a warning only when all high-importance ideas would still fit within the range, so coverage always wins.

```ts
export type SummaryQualityFinding = Readonly<{
  code:
    | 'missing_high_importance'
    | 'duplicate_section_text'
    | 'duplicate_adjacent_section'
    | 'structural_range';
  sectionIndexes?: readonly number[];
  ideaIds?: readonly string[];
}>;
```

- [ ] **Step 4: Run the quality suite**

Run: `npx vitest run src/lib/analysis-pipeline/summary-quality.test.ts`

Expected: PASS for exact duplicates, near duplicates, distinct explanations, missing coverage, unknown IDs, and range guidance.

- [ ] **Step 5: Commit quality validation**

```bash
git add src/lib/analysis-pipeline/summary-quality.ts src/lib/analysis-pipeline/summary-quality.test.ts
git commit -m "feat(DEN-118): validate summary coverage"
```

---

### Task 6: One-Pass and Two-Pass Summary Generation

**Files:**

- Modify: `src/lib/analysis-pipeline/generators.ts`
- Modify: `src/lib/analysis-pipeline/generators.test.ts`
- Modify: `src/lib/analysis-pipeline/provider.ts`
- Modify: `src/lib/analysis-pipeline/openrouter-provider.ts`
- Modify: `src/lib/analysis-pipeline/openrouter-provider.test.ts`
- Modify: `src/lib/analysis-pipeline/deterministic-provider.ts`

**Interfaces:**

- Consumes: policy from Task 3, schemas from Task 4, and validator from Task 5.
- Produces: `generateSummary(provider, context)` with public V3 `value` and safe metadata containing `route`, `repairCount`, and per-pass request/model/usage/latency data.
- Preserves: existing quote and offset grounding cleanup.

- [ ] **Step 1: Write failing route, prompt, coverage, repair, and failure tests**

In `generators.test.ts`, create `shortProvider` with a valid `gleen_summary_v3` fixture; create `longProvider` with valid `gleen_summary_idea_map_v1` and `gleen_summary_compose_v3` fixtures matching Task 4; and create `repairProvider` with an invalid composition plus a valid `gleen_summary_repair_v3` fixture. Each provider is local to its test so request counts cannot leak between cases.

```ts
function contextWithDuration(durationSeconds: number): GeneratorContext {
  return { ...context, durationSeconds, summaryPreset: 'balanced' };
}

it('uses one call at 19:59 and mandatory idea-map plus composition at 20:00', async () => {
  await generateSummary(shortProvider, contextWithDuration(1199));
  expect(shortProvider.requests.map(({ name }) => name).toEqual(['gleen_summary_v3']);

  const result = await generateSummary(longProvider, contextWithDuration(1200));
  expect(longProvider.requests.map(({ name }) => name).toEqual([
    'gleen_summary_idea_map_v1',
    'gleen_summary_compose_v3',
  ]);
  expect(result.metadata.route).toBe('two-pass');
});

it('asks a 90-minute Balanced composition for 14–20 complete sections', async () => {
  await generateSummary(provider, contextWithDuration(5400));
  expect(provider.requests[1]?.system).toContain('14–20');
  expect(provider.requests[1]?.system).toContain('must not omit high-importance');
});

it('repairs one invalid composition and never makes a second repair call', async () => {
  const result = await generateSummary(
    repairProvider,
    contextWithDuration(1200),
  );
  expect(repairProvider.requests.map(({ name }) => name)).toEqual([
    'gleen_summary_idea_map_v1',
    'gleen_summary_compose_v3',
    'gleen_summary_repair_v3',
  ]);
  expect(result.metadata.repairCount).toBe(1);
});
```

Also test that an invalid repaired result rejects with `ProviderError('invalid_provider_response', true)` and that Compact/Balanced/Deep prompts contain their exact coverage/depth promises.

- [ ] **Step 2: Run generator/provider tests and confirm they fail**

Run: `npx vitest run src/lib/analysis-pipeline/generators.test.ts src/lib/analysis-pipeline/openrouter-provider.test.ts`

Expected: FAIL because generation still always makes one unconstrained call.

- [ ] **Step 3: Strengthen the short-video one-pass contract**

Build mode instructions from a typed record. Include requested mode, the selected section range, grounded offsets, important-caveat preservation, no repeated thesis/details, and “one complete main paragraph per section.” Keep `gleen_summary_v3` for the one-pass request and run the existing grounding sanitizer before return.

```ts
const MODE_INSTRUCTIONS: Record<SummaryMode, string> = {
  compact:
    'Compress aggressively, but preserve every main conclusion and material caveat.',
  balanced:
    'Preserve conclusions, arguments, important context, representative examples, and caveats.',
  deep: 'Preserve full argument structure, causal links, significant examples, exceptions, and practical implications.',
};
```

- [ ] **Step 4: Implement mandatory long-form idea mapping and composition**

For `two-pass`, call `gleen_summary_idea_map_v1` with the transcript, locale, and instructions to cluster semantically related facts without discarding distinct claims. Then call `gleen_summary_compose_v3` with the transcript plus serialized idea map, mode promise, range, and explicit requirement that all high-importance IDs appear in `coveredIdeaIds`.

If more than 20 critical clusters exist, tell the composer to combine related clusters inside broader sections while retaining their claims, evidence, caveats, examples, and relationships in `details`.

- [ ] **Step 5: Add one bounded evidence-preserving repair**

Run `validateComposedSummary`. If repair is needed, call `gleen_summary_repair_v3` once with the original transcript, idea map, candidate composition, and serialized finding codes/indices/IDs. Revalidate the repaired result. If it still fails, throw:

```ts
throw new ProviderError('invalid_provider_response', true);
```

Never silently fall back from two-pass to one-pass and never publish a knowingly incomplete or duplicated composition.

- [ ] **Step 6: Measure safe provider latency and aggregate pass metadata**

In both providers, measure elapsed milliseconds around the request and add `latencyMs: number` to `GenerationResult.metadata`. In `generateSummary`, return:

```ts
metadata: {
  route: policy.route,
  repairCount,
  passes: passResults.map(({ name, result }) => ({
    name,
    requestId: result.metadata.requestId,
    model: result.metadata.model,
    usage: result.metadata.usage,
    latencyMs: result.metadata.latencyMs,
  })),
}
```

Do not include transcript, idea-map prose, or generated text.

- [ ] **Step 7: Run generator and provider suites**

Run: `npx vitest run src/lib/analysis-pipeline/summary-policy.test.ts src/lib/analysis-pipeline/summary-generation-schemas.test.ts src/lib/analysis-pipeline/summary-quality.test.ts src/lib/analysis-pipeline/generators.test.ts src/lib/analysis-pipeline/openrouter-provider.test.ts`

Expected: PASS with exactly one call below the threshold, two calls for a valid long result, and no more than three calls when repair is required.

- [ ] **Step 8: Commit adaptive generation**

```bash
git add src/lib/analysis-pipeline/generators.ts src/lib/analysis-pipeline/generators.test.ts src/lib/analysis-pipeline/provider.ts src/lib/analysis-pipeline/openrouter-provider.ts src/lib/analysis-pipeline/openrouter-provider.test.ts src/lib/analysis-pipeline/deterministic-provider.ts
git commit -m "feat(DEN-118): generate complete long-form summaries"
```

---

### Task 7: Pipeline Observability and Summary Presentation Regression

**Files:**

- Modify: `src/lib/analysis-pipeline/workflow.ts`
- Modify: `src/lib/analysis-pipeline/workflow.test.ts`
- Modify: `src/components/result-workspace/result-workspace.test.tsx`
- Modify: `src/lib/result-workspace/presentation.test.ts`
- Modify: `tests/e2e/result-workspace.spec.ts`
- Modify: `tests/e2e/result-workspace.visual.spec.ts` only if the existing fixture needs a long multi-section artifact

**Interfaces:**

- Consumes: safe Summary generation metadata from Task 6.
- Produces: one `analysis_events` completion record for Summary generation with route, repair count, and pass metadata.
- Preserves: title plus one visible full paragraph, synchronized Summary editing, Copy behavior, and legacy rendering.

- [ ] **Step 1: Write failing workflow metadata and presentation regression tests**

Extend the existing `harness()` deterministic fixtures with valid `gleen_summary_idea_map_v1`, `gleen_summary_compose_v3`, and `gleen_summary_repair_v3` values from Task 4 so the 20-minute workflow case reaches persistence.

```ts
it('records safe two-pass metadata without generated content', async () => {
  const { repository, provider, ledger } = harness();
  await executeAnalysisPipeline({
    jobId: 'job-id',
    repository,
    provider,
    ledger,
    context: { ...context, durationSeconds: 1_200 },
  });
  expect(repository.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      idempotencyKey: 'attempt-1:summary:generation',
      stage: 'artifacts',
      status: 'completed',
      metadata: expect.objectContaining({ route: 'two-pass', repairCount: 0 }),
    }),
  );
  expect(JSON.stringify(repository.recordEvent.mock.calls)).not.toContain(
    'Transcript',
  );
});

it('renders each v3 chapter as title plus one complete paragraph', () => {
  const summaryTab = model.tabs.summary;
  if (summaryTab.status !== 'ready')
    throw new Error('Summary fixture required');
  renderWorkspace({
    ...model,
    tabs: {
      ...model.tabs,
      summary: {
        status: 'ready',
        data: {
          ...summaryTab.data,
          schemaVersion: 3,
          sections: [
            {
              title: 'Complete chapter',
              summary: 'Short thesis that must stay hidden.',
              details:
                'Complete explanation with claims, evidence, caveats, and examples.',
              supportingQuote: null,
              sourceOffsetMs: null,
            },
          ],
          keyPoints: [
            {
              text: 'Short thesis that must stay hidden.',
              sourceOffsetMs: null,
            },
          ],
        },
      },
    },
  });
  expect(
    screen.getByText(
      'Complete explanation with claims, evidence, caveats, and examples.',
    ),
  ).toBeVisible();
  expect(
    screen.queryByText('Short thesis that must stay hidden.'),
  ).not.toBeInTheDocument();
});
```

Add a legacy V1/V2 case that shows the key point once, a Copy assertion for the full paragraph, and an edit/save/reload assertion that `summary`, `details`, and compatible key-point text remain synchronized.

- [ ] **Step 2: Run workflow and workspace tests**

Run: `npx vitest run src/lib/analysis-pipeline/workflow.test.ts src/lib/result-workspace/presentation.test.ts src/components/result-workspace/result-workspace.test.tsx`

Expected: workflow metadata test fails; existing simplified chapter behavior should pass or reveal a regression to correct without changing the approved UI.

- [ ] **Step 3: Record safe generation metadata**

After `generateSummary` succeeds and before saving the artifact, call `repository.recordEvent` with the stable idempotency key above. Store only `route`, `repairCount`, and pass name/requestId/model/usage/latency. Keep flashcard and timestamp behavior unchanged. Update workflow call-count assertions to include this single Summary event.

- [ ] **Step 4: Preserve the approved two-block Summary rendering**

Retain `getSectionMainText(details || summary)`, title-only disclosure headers, full-paragraph Copy, and synchronized edits from commit `4a187c5`. Change production code only if the new regression tests expose a mismatch; do not reintroduce thesis or quote paragraphs.

- [ ] **Step 5: Add desktop/mobile and reduced-motion browser assertions**

Use the deterministic result fixture with at least 14 sections. At desktop and mobile widths, open first/middle/last chapters, assert exactly one body paragraph per open chapter, confirm keyboard activation of the disclosure, and verify no horizontal overflow. Under reduced motion, assert the same functional state without relying on animation timing.

- [ ] **Step 6: Run focused integration and browser tests**

Run: `npx vitest run src/lib/analysis-pipeline/workflow.test.ts src/lib/result-workspace/presentation.test.ts src/components/result-workspace/result-workspace.test.tsx`

Run: `npx playwright test tests/e2e/result-workspace.spec.ts --project=chromium`

Expected: PASS on desktop/mobile fixtures with one paragraph per chapter and safe workflow event metadata.

- [ ] **Step 7: Commit pipeline integration**

```bash
git add src/lib/analysis-pipeline/workflow.ts src/lib/analysis-pipeline/workflow.test.ts src/components/result-workspace/result-workspace.test.tsx src/lib/result-workspace/presentation.test.ts tests/e2e/result-workspace.spec.ts tests/e2e/result-workspace.visual.spec.ts
git commit -m "test(DEN-118): verify adaptive summary flow"
```

---

### Task 8: Full Quality Gates and Browser Acceptance

**Files:**

- Modify only files implicated by failures in the commands below.
- Verify: `docs/superpowers/specs/2026-08-19-adaptive-summary-modes-design.md`

**Interfaces:**

- Consumes: completed Tasks 1–7.
- Produces: a clean, buildable branch with evidence for all repository completion gates.

- [ ] **Step 1: Scan for stale two-mode assumptions**

Run: `rg -n "'detailed'|\"detailed\"|\.detailed|balanced.*detailed|detailed.*balanced" src tests --glob '!**/*.snap'`

Expected: matches only explicit legacy compatibility fixtures/parsers; no live UI or new-write branch emits `detailed`.

- [ ] **Step 2: Format and verify formatting**

Run: `npm run format`

Run: `npm run format:check`

Expected: PASS.

- [ ] **Step 3: Run lint and strict type checking**

Run: `npm run lint`

Run: `npm run typecheck`

Expected: PASS with no warnings promoted to failures and no type errors.

- [ ] **Step 4: Run all unit and integration tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: PASS and generate the App Router production output.

- [ ] **Step 6: Verify the affected browser flows**

Run: `npx playwright test tests/e2e/intake.spec.ts tests/e2e/history.spec.ts tests/e2e/result-workspace.spec.ts --project=chromium`

Expected: PASS for account default initialization, per-analysis override, History label, 14+ section navigation, Copy/edit behavior, desktop/mobile layout, keyboard use, reduced motion, and no horizontal overflow.

- [ ] **Step 7: Inspect the final diff and commit any verification-only fixes**

Run: `git diff --check && git status --short && git log --oneline --decorate -10`

If verification required tracked corrections, review `git diff` to confirm every change belongs to DEN-118, then commit the already tracked corrections:

```bash
git add -u
git commit -m "fix(DEN-118): satisfy adaptive summary quality gates"
```

Expected: clean worktree after the commit. Do not include `.env` files, credentials, test videos, or generated Playwright reports.

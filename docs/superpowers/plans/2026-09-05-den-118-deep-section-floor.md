# DEN-118 Deep Long-Form Section Floor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 14–18 sections a strict success condition for Deep summaries from 45 through 89:59 minutes.

**Architecture:** Add an explicit lower-bound enforcement mode to the summary policy, consume it in deterministic quality validation, and make both idea-map and composition prompts state the strict contract. Keep the existing single bounded repair and return the existing retryable typed quality error when repaired output remains outside the range.

**Tech Stack:** TypeScript strict mode, Zod structured output, Vitest, Next.js.

**Spec:** `docs/superpowers/specs/2026-09-05-den-118-deep-section-floor-addendum.md`

## Global Constraints

- Only Deep summaries with `2700 <= durationSeconds < 5400` use the strict 14–18 range.
- Compact, Balanced, shorter videos, and videos at or above 90 minutes keep current behavior.
- No second repair call and no new production dependency.
- No duplicate, cosmetic split, or ungrounded section may satisfy the floor.
- Existing stored summaries are unchanged.

---

### Task 1: Express strict enforcement in the policy

**Files:**

- Modify: `src/lib/analysis-pipeline/summary-policy.ts`
- Test: `src/lib/analysis-pipeline/summary-policy.test.ts`

**Interfaces:**

- Produces: `SummaryGenerationPolicy.sectionRangeEnforcement: 'adaptive' | 'strict'`.
- Consumes: existing `durationSeconds`, `mode`, and `sectionRange` policy inputs.

- [ ] **Step 1: Write the failing boundary test**

Add assertions equivalent to:

```ts
it.each([2_700, 2_883, 5_399])(
  'strictly enforces the Deep long-form range at %is',
  (durationSeconds) => {
    expect(
      selectSummaryPolicy(input({ durationSeconds, mode: 'deep' })),
    ).toMatchObject({
      sectionRange: { min: 14, max: 18 },
      sectionRangeEnforcement: 'strict',
    });
  },
);

it.each([
  [2_699, 'deep'],
  [2_883, 'balanced'],
  [5_400, 'deep'],
] as const)('keeps %s/%s adaptive', (durationSeconds, mode) => {
  expect(selectSummaryPolicy(input({ durationSeconds, mode }))).toMatchObject({
    sectionRangeEnforcement: 'adaptive',
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/lib/analysis-pipeline/summary-policy.test.ts`

Expected: fail because `sectionRangeEnforcement` does not exist.

- [ ] **Step 3: Add the policy field**

Extend the type and returned object:

```ts
sectionRangeEnforcement:
  input.mode === 'deep' &&
  input.durationSeconds >= 2_700 &&
  input.durationSeconds < 5_400
    ? 'strict'
    : 'adaptive',
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npx vitest run src/lib/analysis-pipeline/summary-policy.test.ts`

Commit: `fix(DEN-118): mark deep long-form range strict`

---

### Task 2: Reject undersized strict compositions

**Files:**

- Modify: `src/lib/analysis-pipeline/summary-quality.ts`
- Test: `src/lib/analysis-pipeline/summary-quality.test.ts`

**Interfaces:**

- Consumes: `SummaryGenerationPolicy.sectionRangeEnforcement`.
- Preserves: adaptive lower-bound behavior and upper-bound set-cover behavior.

- [ ] **Step 1: Write failing strict/adaptive tests**

Add a strict policy fixture and prove 12/13 fail even with only two idea-map
ids, while 14 passes:

```ts
const strictPolicy = {
  ...policy,
  sectionRange: { min: 14, max: 18 },
  sectionRangeEnforcement: 'strict' as const,
};

it.each([12, 13])(
  'rejects %i sections for a strict 14-section floor',
  (count) => {
    const candidate = {
      ...summary,
      sections: Array.from({ length: count }, (_, index) =>
        section(index % 2 === 0 ? 'idea-critical' : 'idea-secondary', index),
      ),
    };
    expect(
      validateComposedSummary({
        ideaMap,
        summary: candidate,
        policy: strictPolicy,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'structural_range' }),
      ]),
    );
  },
);
```

Update the existing policy fixture with `sectionRangeEnforcement: 'adaptive'`
and retain its current insufficient-ideas expectation.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/lib/analysis-pipeline/summary-quality.test.ts`

Expected: strict 12/13 tests fail because the validator suppresses the finding
when the idea map contains fewer than 14 ids.

- [ ] **Step 3: Implement the strict lower-bound branch**

In `shouldReportStructuralRange`:

```ts
if (sectionCount < min) {
  if (input.policy.sectionRangeEnforcement === 'strict') return true;
  const distinctIdeaCount = new Set(input.ideaMap.ideas.map(({ id }) => id))
    .size;
  return distinctIdeaCount >= min;
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npx vitest run src/lib/analysis-pipeline/summary-quality.test.ts`

Commit: `fix(DEN-118): enforce deep section floor`

---

### Task 3: Align prompts and bounded repair with the strict contract

**Files:**

- Modify: `src/lib/analysis-pipeline/generators.ts`
- Test: `src/lib/analysis-pipeline/generators.test.ts`

**Interfaces:**

- Consumes: `SummaryGenerationPolicy.sectionRangeEnforcement`.
- Preserves: two-pass generation and exactly one repair request.

- [ ] **Step 1: Write failing prompt and repair tests**

Use a 2,883-second Deep context. Assert the idea-map request asks for at least
14 grounded distinctions and composition says the range is mandatory. Provide
a 12-section composition followed by a valid 14-section repair and assert the
request order:

```ts
expect(provider.requests.map(({ name }) => name)).toEqual([
  'gleen_summary_idea_map_v1',
  'gleen_summary_compose_v3',
  'gleen_summary_repair_v3',
]);
expect(provider.requests[0]?.system).toContain('at least 14');
expect(provider.requests[1]?.system).toContain('mandatory');
expect(provider.requests[2]?.input).toContain('structural_range');
expect(result.value.sections).toHaveLength(14);
```

Add a second test where repair still has 13 sections and assert a retryable
`SummaryGenerationError` with `findingCounts.structural_range === 1`.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/lib/analysis-pipeline/generators.test.ts`

Expected: prompt assertions and repair invocation fail under the current soft
lower-bound behavior.

- [ ] **Step 3: Generate policy-aware instructions**

Replace the static idea-map prompt with a function and branch only for strict
policies:

```ts
function ideaMapInstructions(policy: SummaryGenerationPolicy): string {
  const floor = policy.sectionRange.min;
  return [
    IDEA_MAP_SYSTEM_PROMPT,
    policy.sectionRangeEnforcement === 'strict'
      ? `Identify at least ${floor} distinct grounded chapter candidates by separating claims, evidence, examples, caveats, consequences, and practical conclusions when the transcript supports them. Do not invent or cosmetically split ideas.`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' ');
}
```

In summary/composition instructions, replace “guidance” with a mandatory-range
sentence only when enforcement is strict. Leave adaptive copy unchanged.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npx vitest run src/lib/analysis-pipeline/summary-policy.test.ts \
  src/lib/analysis-pipeline/summary-quality.test.ts \
  src/lib/analysis-pipeline/generators.test.ts
```

Commit: `fix(DEN-118): require complete deep chapter structure`

---

### Task 4: Full verification and delivery

**Files:**

- Modify only if evidence requires it: existing DEN-118 fixture tests.

- [ ] Run `npm run format:check` and `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run the production build with the repository's documented non-secret fixture environment.
- [ ] Run the long-summary Playwright fixture on desktop, mobile, keyboard, and reduced motion with a valid 14–18 section Deep result.
- [ ] Inspect `git diff --check`, `git status --short`, and the final diff for scope.
- [ ] Commit any test-only fixture update as `test(DEN-118): verify strict deep section range`.
- [ ] Push the DEN-118 branch and deploy only after every gate is green.

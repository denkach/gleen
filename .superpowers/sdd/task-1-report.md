# Task 1 report

## Status

DONE_WITH_CONCERNS

## Files changed

- `src/lib/analysis-pipeline/artifact-schemas.ts`
- `src/lib/analysis-pipeline/artifact-schemas.test.ts`
- `src/lib/analysis-pipeline/generators.ts`
- `src/lib/analysis-pipeline/generators.test.ts`
- `src/lib/result-workspace/presentation.ts`
- `src/lib/result-workspace/presentation.test.ts`

## Commit

- `f4c23cd feat(den-18): normalize versioned result artifacts`

## RED evidence

- `npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts`
  - Exit 1.
  - 2 failed, 4 passed.
  - Failed because `summaryArtifactV1Schema` and `summaryArtifactV2Schema` did not exist.
- `npm test -- src/lib/result-workspace/presentation.test.ts`
  - Exit 1.
  - Suite failed to resolve the not-yet-created `./presentation` module.

## Verification

- `npm test -- src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.test.ts src/lib/result-workspace/presentation.test.ts`
  - Exit 0; 3 files passed, 15 tests passed.
- `npm run typecheck`
  - Exit 0; `tsc --noEmit` reported no errors.
- `npm test -- src/lib/analysis-pipeline/workflow.test.ts`
  - Exit 0; 1 file passed, 4 tests passed.
- `npm run lint`
  - Exit 0; ESLint reported no errors.
- `npx prettier --write src/lib/analysis-pipeline/artifact-schemas.ts src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.ts src/lib/analysis-pipeline/generators.test.ts src/lib/result-workspace/presentation.ts src/lib/result-workspace/presentation.test.ts`
  - Exit 0; scoped files formatted.
- `git diff --check`
  - Exit 0; no whitespace errors before commit.

## Self-review

- V1 summary parsing remains intact through an explicitly exported v1 schema.
- New generation requests JSON schema v2 with optional non-negative integer source offsets grounded by the prompt in transcript segment offsets.
- The stable provider request name remains unchanged to preserve pipeline/provider fixture compatibility; the requested payload schema is explicitly asserted as v2.
- Presentation parsing validates each artifact independently, so malformed or failed artifacts do not hide valid tabs.
- Legacy summary key points normalize to null source offsets; valid v2 offsets are retained through the inclusive duration boundary and out-of-range offsets retain text while normalizing the link to null.
- No dependencies, environment files, `next-env.d.ts`, or unrelated files were changed.

## Concerns

- The existing workflow persists `schemaVersion: 1` as artifact-row metadata for every generated kind, even when the newly generated summary content carries `schemaVersion: 2`. Updating `workflow.ts` was outside the Task 1 prescribed file scope, so a later integration task should make persisted summary row metadata follow the generated payload version.
- Browser/build verification was not applicable to this server-side contract/model-only task; the prescribed focused tests, integration compatibility test, lint, and strict typecheck were run.

## Review fix: persist generated artifact schema versions

### RED evidence

- `npm test -- src/lib/analysis-pipeline/workflow.test.ts`
  - Exit 1; 1 failed, 4 passed.
  - The new workflow assertion expected summary row metadata `schemaVersion: 2` but received `schemaVersion: 1`; transcript, flashcards, and timestamps remained version 1.

### Files changed

- `src/lib/analysis-pipeline/workflow.ts`
- `src/lib/analysis-pipeline/workflow.test.ts`

### Commit

- `fix(den-18): persist artifact schema versions`

### Verification

- `npm test -- src/lib/analysis-pipeline/workflow.test.ts`
  - Exit 0; 1 file passed, 5 tests passed.
- `npm test -- src/lib/analysis-pipeline/workflow.test.ts src/lib/analysis-pipeline/artifact-schemas.test.ts src/lib/analysis-pipeline/generators.test.ts`
  - Exit 0; 3 files passed, 14 tests passed.
- `npm run typecheck`
  - Exit 0; `tsc --noEmit` reported no errors.
- `npx prettier --write src/lib/analysis-pipeline/workflow.ts src/lib/analysis-pipeline/workflow.test.ts`
  - Exit 0; both files were already formatted.
- `git diff --check`
  - Exit 0; no whitespace errors.

### Self-review

- The workflow now persists the schema version from each validated generator payload instead of assigning a shared constant.
- The regression test uses summary v2 output and proves its row metadata is version 2 while transcript, flashcards, and timestamps remain version 1.
- No repository change is needed because the repository already persists the workflow-supplied version directly.
- No unrelated files or dependencies were changed.

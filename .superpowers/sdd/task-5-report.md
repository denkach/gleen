# Task 5 report

## Status

Implemented and scoped for commit. Focused Task 5 tests, typecheck, lint, and production build pass. The full test suite remains blocked by three pre-existing `src/lib/analysis-pipeline/workflow.test.ts` failures described below. Browser verification was attempted, but the in-app browser backend was unavailable and the authenticated routes cannot be exercised with placeholder Supabase credentials.

## Files

- `src/lib/youtube-intake/supabase-repository.ts`
- `src/lib/analysis-pipeline/repository.ts`
- `src/lib/analysis-pipeline/supabase-repository.ts`
- `src/lib/analysis-pipeline/supabase-repository.test.ts`
- `src/app/app/page.tsx`
- `src/app/app/page.test.tsx`
- `src/app/app/history/page.tsx`
- `src/app/app/history/page.test.tsx`
- `src/components/app-shell/new-analysis-home.tsx`
- `src/components/app-shell/new-analysis-form.tsx`
- `src/components/app-shell/new-analysis-form.test.tsx`

The two component files/tests were necessary to implement the brief's single-use continuation auto-submit and owned initial snapshot handoff. No schema, dependency, environment, credential, or unrelated product changes were made.

## RED

Command:

`npm test -- src/lib/youtube-intake/supabase-repository.test.ts src/lib/analysis-pipeline/supabase-repository.test.ts src/app/app/page.test.tsx src/app/app/history/page.test.tsx`

Result: expected failure, 6 failed / 16 passed. Failures were missing `findMostRecentOwnedActive`, missing `listOwnedHistory`, missing explicit/fallback/continuation page resolution, and placeholder History rendering.

## Implementation and security notes

- Added `AnalysisHistoryRow`, `findMostRecentOwnedActive`, and `listOwnedHistory` read contracts.
- Active selection is owned, limited to `queued`/`running`, ordered by `updated_at desc`, and limited to one.
- History is owned, ordered by `updated_at desc`, and capped at 50.
- New job/intake relationship reads carry explicit owner filters; owned snapshot child reads also carry explicit `user_id` filters. Calls use the existing authenticated server Supabase client, preserving RLS context; no service role or metadata authorization is used.
- `/app` resolution order is explicit owned active analysis, validated continuation, newest owned active analysis, then idle.
- Invalid/unowned/terminal explicit analysis IDs are ignored safely.
- Continuation uses the existing canonical YouTube parser, removes query data from browser history before dispatch, submits once via a ref guard, and retains default Summary/Timestamps/Transcript with Flashcards opt-in.
- History uses semantic links and Processing/Partial/Complete/Failed text labels without introducing another spectral processing surface.

## Exact verification

- Focused verification: 5 files passed, 37 tests passed.
- `npm run typecheck`: pass.
- `npm run lint`: pass, zero warnings/errors.
- `git diff --check`: pass.
- `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3017 NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test npm run build`: pass; 21 pages generated and `/app` plus `/app/history` compiled as dynamic routes.
- Full `npm test`: fail in pre-existing `src/lib/analysis-pipeline/workflow.test.ts` only (3 failures: expected Summary v2 save absent; expected 5 events received 4; expected ready summary received failed). Task 5 focused suites pass.
- Browser: local server reached Ready on port 3025. In-app browser discovery returned no available browser backends, so desktop/mobile/reduced-motion browser inspection could not be completed. Placeholder Supabase values also cannot provide an authenticated session.

## Commit

`45f595fc8a4881fecffa71f67c28b7f5668827ca` (`feat: restore active analyses from history`).

## Self-review

- Confirmed continuation cannot outrank an explicit owned active analysis.
- Confirmed terminal snapshots are not restored into inline processing.
- Confirmed new reads have owner predicates and deterministic ordering.
- Confirmed no `next-env.d.ts`, environment, reports from other tasks, or credentials are staged.

## Concerns

- Full-suite workflow failures are outside Task 5 and predate these changes.
- Browser verification remains incomplete because no browser backend/authenticated test session was available.

## Fix wave — independent review findings

### RED

Command:

`npm test -- src/lib/analysis-pipeline/supabase-repository.test.ts`

Result: expected failure, 3 failed / 5 passed. The active and History query tests each reported that `analysis_id desc` was never ordered, and the race regression received a hydrated `complete` snapshot instead of `null`.

### GREEN

- Added `analysis_id desc` as the deterministic secondary order after `updated_at desc` for both newest-active selection and capped History, with nth-call assertions proving order precedence.
- Revalidated the fully hydrated snapshot status in `findMostRecentOwnedActive`; a candidate that changes from queued/running to any terminal state now returns `null` and is not handed to the inline processing UI.
- Repository regression after implementation: 1 file passed, 8 tests passed.
- Focused Task 5 command: `npm test -- src/lib/youtube-intake/supabase-repository.test.ts src/lib/analysis-pipeline/supabase-repository.test.ts src/app/app/page.test.tsx src/app/app/history/page.test.tsx src/components/app-shell/new-analysis-form.test.tsx` — 5 files passed, 38 tests passed.
- `npm run typecheck` — pass.
- `npx eslint src/lib/analysis-pipeline/supabase-repository.ts src/lib/analysis-pipeline/supabase-repository.test.ts` — pass with no output.
- `git diff --check` — pass with no output.

### Security self-review

- Both reads still use the authenticated Supabase client and remain subject to RLS; no service-role path was added.
- The active candidate and History parent queries retain explicit `analysis_jobs.user_id = userId` and `analysis_intakes.user_id = userId` filters.
- Hydration retains explicit ownership filters on the job, events, artifacts, and usage reservation reads.
- The fix does not use user metadata for authorization and does not alter credentials, environment files, dependencies, or schema.

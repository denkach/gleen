# Task 5 report — DEN-16

## Status

Implemented and committed the approved active YouTube intake form, artifact Advanced options, profile-derived defaults, pending/error/redirect action states, exact duplicate banner copy and links, and confirmed reanalysis using a `sourceId`-only form payload.

## TDD evidence

### RED

Command:

`npm test -- src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/new-analysis-home.test.tsx src/app/app/page.test.tsx`

Observed exit 1:

- `new-analysis-form.test.tsx`: failed to resolve `./new-analysis-form` because the feature module did not exist.
- `new-analysis-home.test.tsx`: expected the YouTube URL input to be enabled, received disabled.
- `page.test.tsx`: expected the YouTube URL input to be enabled, received disabled.

### GREEN

Required scoped command:

`npm test -- src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/new-analysis-home.test.tsx src/app/app/page.test.tsx`

Output: `Test Files 3 passed (3)`, `Tests 7 passed (7)`, exit 0.

Related action regression command:

`npm test -- src/lib/youtube-intake/actions.test.ts src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/new-analysis-home.test.tsx src/app/app/page.test.tsx`

Output: `Test Files 4 passed (4)`, `Tests 26 passed (26)`, exit 0.

## Verification

- Scoped Prettier check: all matched files use Prettier code style.
- `npm run lint`: exit 0, zero warnings/errors on final run.
- `npm run typecheck`: exit 0.
- Production build with documented public environment placeholders: compiled successfully, generated 18/18 static pages, exit 0.
- `git diff --check`: exit 0.
- Browser verification: not run because the in-app browser reported no available browser sessions. Desktop/mobile/reduced-motion CSS states are covered structurally but remain visually unverified.
- Repository-wide `npm run format:check` remains blocked by the pre-existing unformatted `docs/superpowers/plans/2026-07-12-gle-006-youtube-intake-and-duplicate-protection.md`; scoped changed-file formatting passes.

## Changed files

- `src/components/app-shell/new-analysis-form.tsx`
- `src/components/app-shell/new-analysis-form.test.tsx`
- `src/components/app-shell/new-analysis-home.tsx`
- `src/components/app-shell/new-analysis-home.test.tsx`
- `src/app/app/page.tsx`
- `src/app/app/page.test.tsx`
- `src/styles/app-shell-reference.css`
- `src/lib/youtube-intake/action-state.ts`
- `src/lib/youtube-intake/actions.ts`
- `src/lib/youtube-intake/actions.test.ts`

The action-state factory was separated from the file-level `use server` module because Next.js rejects synchronous exports from Server Action modules; action behavior is unchanged and its existing regression suite passes.

## Commit

`1e5f754 feat(DEN-16): activate approved YouTube intake form`

## Concerns

- Visual browser verification is outstanding due to unavailable in-app browser infrastructure.
- Full-repository format check has the pre-existing plan-file formatting warning noted above.

## Fix Review

### RED

Command:

`npm test -- src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/new-analysis-home.test.tsx src/app/app/page.test.tsx`

Observed exit 1: `Test Files 2 failed | 1 passed (3)`, `Tests 4 failed | 5 passed (9)`.

- The beam still contained `.analysis-options`.
- No `Advanced options` dialog existed, so Escape/focus return could not work.
- A failed reanalysis did not expose a `role=status` announcement inside the confirmation dialog.
- `.app-beam-form` still declared `flex-wrap`, and new component styles still contained literal shadow/rgba values.

### GREEN

Required scoped command:

`npm test -- src/components/app-shell/new-analysis-form.test.tsx src/components/app-shell/new-analysis-home.test.tsx src/app/app/page.test.tsx`

Output: `Test Files 3 passed (3)`, `Tests 9 passed (9)`, exit 0.

Additional verification:

- `npm run lint`: exit 0.
- `npm run typecheck`: exit 0.
- `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example npm run build`: compiled successfully, generated 18/18 static pages, exit 0.
- `git diff --check`: exit 0.
- The initial unconfigured `npm run build` exited 1 with the expected `NEXT_PUBLIC_APP_URL is required`; the documented public placeholders were then supplied for the successful build above.

### Files

- `src/components/app-shell/new-analysis-form.tsx`
- `src/components/app-shell/new-analysis-form.test.tsx`
- `src/components/app-shell/new-analysis-home.test.tsx`
- `src/styles/app-shell-reference.css`
- `src/app/globals.css`
- `.superpowers/sdd/task-5-report.md`

### Commit

`05b13f0 fix(DEN-16): preserve intake beam geometry`

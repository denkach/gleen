# DEN-25 Task 12 report — mobile study navigation

## Outcome

Implemented the approved mobile result-workspace study flow without adding a second player instance or changing the desktop/tablet artifact workspace:

- the global application bottom navigation is hidden only on real and fixture result-video routes at the mobile shell breakpoint;
- mobile result navigation provides Overview, Summary, Flashcards, Timestamps, and More, with Transcript and Export in a Radix-backed bottom sheet;
- a controller-backed mini-player appears after less than 40% of the full player is visible and reuses the existing player controller for play/pause, chapter access, and expansion;
- mobile Chapters uses the same bottom-sheet primitive, seeks the shared controller, starts playback, and restores focus after close;
- mini-player, mobile navigation, chapter trigger, and Chapters sheet mount only while the result media query is at or below 620px; moving above the breakpoint closes an open sheet, releases its scroll lock, and restores focus to the stable result workspace;
- ordinary More and Chapters closes restore their visible mobile trigger with `focus({ preventScroll: true })`; responsive teardown for either sheet restores the stable result workspace instead, without changing scroll position or the artifact hash;
- per-analysis, per-artifact scroll positions are stored in session storage, restored in `requestAnimationFrame`, and clamped without rewriting the artifact hash;
- horizontal swipe navigation uses the approved 56 px / 1.4 ratio and rejects form controls, buttons, sliders, swipe guards, horizontal scrollers, and active text selections;
- safe-area, reduced-motion, keyboard focus, and 44 px touch-target behavior is covered by the reference stylesheet and tests.

No production dependency was added. The existing Radix Dialog primitive is reused for both sheets. Draft ownership, autosave state, and the single player lifecycle remain in their existing owners.

## Changed files

- `src/components/app-shell/app-shell.tsx`
- `src/components/app-shell/app-shell.test.tsx`
- `src/styles/app-shell-reference.css`
- `src/components/result-workspace/result-workspace.tsx`
- `src/components/result-workspace/result-workspace.test.tsx`
- `src/components/result-workspace/source-panel.tsx`
- `src/components/result-workspace/chapter-sheet.tsx`
- `src/components/result-workspace/mobile-mini-player.tsx`
- `src/components/result-workspace/mobile-result-navigation.tsx`
- `src/components/result-workspace/result-sheet.tsx`
- `src/components/result-workspace/use-artifact-swipe.ts`
- `src/components/result-workspace/use-artifact-swipe.test.tsx`
- `src/components/result-workspace/use-mobile-result-layout.ts`
- `src/components/result-workspace/use-player-visibility.ts`
- `src/components/result-workspace/use-player-visibility.test.tsx`
- `src/components/result-workspace/use-result-scroll-memory.ts`
- `src/components/result-workspace/use-result-scroll-memory.test.tsx`
- `src/components/ui/dialog.tsx`
- `src/styles/result-workspace-reference.css`
- `src/styles/result-workspace-reference.test.ts`
- `tests/e2e/result-workspace.spec.ts`

## Verification

- Focused hook and AppShell tests: 4 files, 20 tests passed.
- Related hooks, AppShell, and result stylesheet suites: 5 files, 33 tests passed.
- Complete result-workspace unit/integration suite: 63 tests passed.
- Full Vitest suite: 103 files, 799 tests passed.
- `npm run format:check`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run typecheck`: passed.
- Production build with placeholder public build-time values: compiled, typechecked, and generated 23/23 routes. No `.env` file was created; generated `next-env.d.ts` was restored.
- External Playwright `mobile-chrome` durable result flow: passed from a clean server on port 3063. The test uses the visible five-item mobile result navigation, confirms the desktop tab is hidden on mobile, and asserts one source iframe.
- External Playwright Chromium reduced-motion result flow: passed.
- `git diff --check`: passed.

The plain `npm run build` first stopped at the repository's intentional required-public-environment validation (`NEXT_PUBLIC_APP_URL is required`). It was rerun successfully with the documented placeholder public values.

## Browser verification note

The in-app browser sandbox was intentionally skipped per the task brief. Verification used external Playwright instead.

The earlier combined desktop/tablet/mobile geometry attempt on port 3017 resolved a legacy `.source-panel` DOM even though this worktree renders `.result-source-column`, consistent with a stale reused local server. That stale-port result is not counted as passing evidence in this report. The review-requested mobile durable flow passed again on clean port 3063 after the final focus changes. Unit, focused integration, reduced-motion browser, clean-port mobile browser, lint, type, format, and production build checks are green.

## React review

Reviewed the edited TSX surface against the React best-practices checklist: hooks remain unconditional, effects have cleanup, player state uses the existing external-store selectors, mobile-only navigation is removed from desktop document semantics, list keys are stable, controls are labeled, and no new client data-fetching or dependency boundary was introduced.

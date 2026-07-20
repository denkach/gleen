# DEN-25 Task 13 report — secure Favorite and public Share

## Outcome

- Added authenticated owner-only Share creation and revocation while retaining the existing optimistic, persistent Favorite behavior.
- Added cryptographically unpredictable 32-byte base64url bearer tokens with strict 43-character validation, active-token reuse, and token rotation after revocation.
- Added an uncached, anonymous `/share/[token]` route backed by a server-only Supabase secret client and a hand-built safe projection.
- Public results expose only safe source metadata and ready artifact content. They omit owner identity/private IDs, Favorite, editing, autosave, review/progress state, private recommendations, and Share management.
- Malformed, missing, revoked, foreign-owner, and query-error cases converge on the same localized neutral unavailable experience.
- Share analytics contain only `created`, `copied`, or `revoked` lifecycle values; tokens and public URLs are not included.
- No production dependency was added.

## Security review follow-up

- Added CLI-generated migration `20260719070301_den_25_atomic_result_shares.sql` after the 2026 Supabase explicit-grants review superseded the original no-migration conclusion.
- Owner Share create/revoke now use authenticated `SECURITY INVOKER` RPCs with `search_path = ''`, `auth.uid()` ownership, and the same transaction-scoped advisory lock. Create uses one `INSERT ... ON CONFLICT DO UPDATE` so concurrent first-create and revoked-token rotations converge; revoke is atomic and idempotent, including double revoke.
- Function execution is revoked from `PUBLIC`, `anon`, and `service_role`, then granted only to `authenticated`. No `SECURITY DEFINER` function was introduced.
- The secret-key client receives explicit least-privilege `service_role` table grants: intake `SELECT`; jobs `SELECT, UPDATE`; job events `SELECT, INSERT`; artifacts `SELECT, UPDATE`; usage reservations `SELECT, UPDATE`; shares `SELECT`. No sequence or privileged RPC grant is needed by the inspected workflow.
- `/share/:path*` now emits `Referrer-Policy: no-referrer` through Next configuration. The route remains `force-dynamic`, noindex/nofollow, and never publicly cacheable.
- Malformed tokens are rejected at the route boundary before the privileged Supabase client is initialized.

## Supabase boundary and migration decision

- Centralized privileged access in `src/lib/supabase/admin.ts`, marked it `server-only`, disabled session persistence/refresh/URL detection, and reused it from the analysis workflow.
- Added strict `SUPABASE_SECRET_KEY` validation and an unmistakable server-only warning in `.env.example`.
- Owner mutations use the authenticated server client, validate the analysis UUID before authentication, and delegate to RPCs that derive the owner only from `auth.uid()` and verify the matching `analysis_intakes` row.
- Anonymous lookup validates before querying, matches the exact token plus `revoked_at is null`, then re-applies the Share's analysis/owner pair to source and artifact queries. Artifact selection is restricted to `status = ready` and explicit columns; no `select('*')` is used.
- Task 2 migration `20260718144057_den_25_result_state_and_shares.sql` provides the token-format check, one-row-per-analysis/owner uniqueness, ownership RLS, authenticated grants, anonymous/PUBLIC revokes, and active-token index. The new atomic migration builds on those constraints and adds RPC/grant contracts.
- A live Supabase project and local Docker stack were not available in this agent environment. `npx supabase db lint --local --schema public --level warning --fail-on error` was attempted and returned `LegacyDbConnectError: Failed to connect`, so runtime RLS/concurrency queries and Supabase advisors remain staging verification items. Static migration/security tests and deferred/reordered repository tests cover the boundary locally.

## TDD evidence

The work proceeded RED → GREEN across the secret client, environment validation, token/repository rules, Server Actions, public route, workspace public mode, owner dialog, and fixture browser flow. The RED assertions covered:

- secret-key configuration and client-import isolation;
- 32-byte token format/uniqueness and malformed-token rejection;
- owner-only create/revoke, active reuse, revoked rotation, and exact owner/token filters;
- safe ready-only public projection and neutral failure behavior;
- authenticated action validation and validated public URL construction;
- noindex/uncached owner-independent public metadata;
- removal of owner editing, Favorite, Share, progress, and recommendations;
- create/copy/revoke UI with token-free analytics.

Security review RED: 8 expected failures and 22 passes across the missing migration, client-side mutation race, and missing header contract. The security slice then passed 30/30; the related regression passed 10 files and 146/146 tests.

## Browser verification

`PLAYWRIGHT_PORT=3074 npx playwright test tests/e2e/result-share.spec.ts --project=chromium` passed 1/1 after the security follow-up. It verifies the real malformed-token 404/referrer/non-public-cache response plus owner creation → anonymous open → read-only controls → owner revocation → identical neutral unavailable state, absence of owner email, and public-link exclusion from analytics.

The prescribed port 3017 was already occupied by a stale unrelated Next.js server, causing Playwright's `reuseExistingServer` to attach to a route set that returned 404. The unchanged test passed on clean port 3073, confirming this was an environment collision rather than an application failure.

## Verification

- `npm run format:check`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- Focused Vitest suite: PASS — 8 files, 133/133 tests.
- `npm test`: PASS — 106 files, 829/829 tests. The repository's existing jsdom `window.scrollTo` warnings remained non-failing.
- Dedicated Chromium Share/header flow: PASS — 1/1.
- Production build: PASS with the safe public placeholder values used by browser/CI verification; compilation, TypeScript, 23/23 static pages, and dynamic `/share/[token]` route generation completed.
- `git diff --check`: PASS.
- Generated `next-env.d.ts` was restored after the build.

## React best-practices review

- Hook order is unconditional, async mutations have controlled pending/error states, and lifecycle-keyed workspace state remains isolated per result.
- Share uses the existing Radix dialog boundary with localized title, description, close label, native buttons, read-only link input, and polite status announcements.
- Public mode removes mutation callbacks at the workspace boundary instead of relying on disabled visual controls.
- Existing keyboard, responsive, and reduced-motion behavior remains intact; the dedicated public fixture uses the same production workspace composition.

## Changed areas

- Server/env: `.env.example`, `src/env.ts`, `src/lib/supabase/admin.ts`, analysis workflow reuse, and their tests.
- Share domain: `src/lib/result-workspace/share.ts`, repository, Server Actions, and tests.
- Public route: `src/app/share/[token]/page.tsx`, neutral not-found route, and route tests.
- Owner/public UI: workspace/artifact read-only mode, localized Share dialog, dialog close label, tokenized styling, and component tests.
- Browser fixture: deterministic owner/public/revoked fixture state and `tests/e2e/result-share.spec.ts`.
- Test support: a Vitest-only `server-only` shim/alias so Next's server boundary can be exercised without weakening production imports.

## Remaining risk

The remaining risk is environment-specific Supabase verification: apply the generated migration to the target project, exercise concurrent owner/foreign/anonymous/revoked requests with real Auth/RLS, and run the Supabase security/performance advisors before release. Local database lint could not connect because no local Postgres/Docker stack was available.

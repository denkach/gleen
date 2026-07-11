# GLE-004 Account Access and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver DEN-14 account access, session protection, recovery states, and three-step preference onboarding with Supabase while exactly porting the approved Prism prototype.

**Architecture:** Supabase Auth is the only identity provider and Supabase Postgres owns application preferences. Next.js server actions and route handlers call focused Supabase server modules; browser components contain presentation and pending state only. A `proxy.ts` session refresh boundary protects the minimal authenticated verification route and onboarding routes.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Supabase Auth/Postgres, Zod 4, CSS variables, Vitest, Testing Library, Playwright

## Global Constraints

- The visual source is read-only: `/Users/niga/Downloads/gleen-motion-prototype-v2/screen-map.html`, `sign-in.html`, `sign-up.html`, `settings.html`, `styles.css`, `design-tokens.json`, `app.js`, and `previews/signin-desktop-render.png`.
- Do not modify `design/reference-v3/`, `design/screenshots/`, or `gleen-motion-prototype-v2/`.
- Do not implement video intake, processing, billing, or the DEN-15 application shell.
- Use Supabase Auth and Supabase Postgres; do not add Clerk, Neon, Auth.js, or a second user model.
- Keep service credentials and session mutation outside client components.
- Preserve desktop, tablet, mobile, keyboard, and `prefers-reduced-motion` behavior.
- Add only `@supabase/supabase-js@2.110.2`, `@supabase/ssr@0.12.0`, and `zod@4.4.3` as production dependencies.

---

## File map

- `src/env.ts`: validate public Supabase configuration without exposing secrets.
- `src/lib/supabase/browser.ts`: lazy browser client.
- `src/lib/supabase/server.ts`: cookie-backed server client.
- `src/lib/supabase/proxy.ts`: refresh session cookies in Next proxy.
- `src/lib/auth/*`: validation, safe redirects, server actions, and auth result types.
- `src/app/(auth)/*`: approved access, recovery, verification, and expired-session screens.
- `src/components/auth/*`: shared Prism visual, access shell, forms, and status messages.
- `src/styles/auth-reference.css`: literal scoped port of approved auth/settings styles.
- `src/app/auth/callback/route.ts`: OAuth, magic-link, and recovery callback exchange.
- `src/app/onboarding/*`: protected three-step preference flow.
- `src/lib/onboarding/*`: validated preference model and persistence boundary.
- `supabase/migrations/*`: profile table, constraints, trigger, and RLS policies.
- `proxy.ts`: public/protected route session boundary.
- `tests/e2e/auth.spec.ts`: responsive, keyboard, state, and route coverage.

### Task 1: Install and validate the Supabase boundary

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/env.ts`
- Modify: `src/env.test.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/proxy.ts`
- Create: `src/lib/supabase/clients.test.ts`

**Interfaces:**

- Produces: `validatePublicEnv`, `createBrowserSupabaseClient`, `createServerSupabaseClient`, and `updateSupabaseSession`.

- [ ] **Step 1: Add failing environment and client-boundary tests**

Test that `NEXT_PUBLIC_SUPABASE_URL` is HTTPS, the publishable key is required,
the browser module never reads a service-role key, and the server client adapts
Next cookies through `getAll`/`setAll`.

```ts
expect(() => validatePublicEnv({ NEXT_PUBLIC_APP_URL: appUrl })).toThrow(
  'NEXT_PUBLIC_SUPABASE_URL is required',
);
expect(source).not.toMatch(/SERVICE_ROLE/);
expect(cookieStore.getAll).toHaveBeenCalled();
```

- [ ] **Step 2: Run tests and verify RED**

Run `npm test -- src/env.test.ts src/lib/supabase/clients.test.ts`.

Expected: FAIL because Supabase configuration and clients do not exist.

- [ ] **Step 3: Install the approved dependencies**

Run:

```bash
npm install --save-exact @supabase/supabase-js@2.110.2 @supabase/ssr@0.12.0 zod@4.4.3
```

- [ ] **Step 4: Implement lazy Supabase clients**

Expose public configuration from `validatePublicEnv`. Use `createBrowserClient`
only inside `createBrowserSupabaseClient()`. Use `await cookies()` and
`createServerClient` inside `createServerSupabaseClient()`. Catch cookie writes
only where Server Components cannot write; route handlers and server actions
must propagate unexpected failures.

- [ ] **Step 5: Verify GREEN and commit**

Run `npm test -- src/env.test.ts src/lib/supabase/clients.test.ts`.

Expected: all selected tests pass.

Commit: `feat(DEN-14): add Supabase client boundary`.

### Task 2: Define profile preferences and Row Level Security

**Files:**

- Create: `supabase/migrations/202607120001_create_profiles.sql`
- Create: `src/lib/onboarding/preferences.ts`
- Create: `src/lib/onboarding/preferences.test.ts`
- Create: `src/lib/onboarding/repository.ts`
- Create: `src/lib/onboarding/repository.test.ts`

**Interfaces:**

- Produces: `interfaceLocaleSchema`, `outputLocaleSchema`, `outputPreferencesSchema`, `saveOnboardingStep`, and `getOnboardingState`.

- [ ] **Step 1: Write failing validation and ownership tests**

```ts
expect(interfaceLocaleSchema.parse('uk')).toBe('uk');
expect(() => interfaceLocaleSchema.parse('fr')).toThrow();
expect(migration).toMatch(/auth\.uid\(\) = user_id/);
expect(migration).toMatch(/enable row level security/i);
```

- [ ] **Step 2: Verify RED**

Run `npm test -- src/lib/onboarding`.

Expected: FAIL because the schemas, repository, and migration do not exist.

- [ ] **Step 3: Add the migration and typed model**

Create `public.profiles` keyed by `auth.users(id) on delete cascade` with:

```sql
interface_locale text not null default 'en',
output_locale text not null default 'en',
summary_preset text not null default 'balanced',
flashcard_preset integer not null default 18,
onboarding_step integer not null default 1,
onboarding_completed_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Add exact check constraints for `uk|ru|en|es|de`,
`balanced|detailed`, `18|30`, and steps `1|2|3`. Enable RLS and add select,
insert, and update policies requiring `auth.uid() = user_id`.

- [ ] **Step 4: Implement repository operations**

Require an authenticated `user.id`, validate every write with Zod, and upsert
only the authenticated user's row. Return discriminated results:

```ts
type PreferenceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: 'unauthorized' | 'validation' | 'storage' };
```

- [ ] **Step 5: Verify GREEN and commit**

Run `npm test -- src/lib/onboarding`.

Commit: `feat(DEN-14): persist onboarding preferences`.

### Task 3: Port the approved authentication shell

**Files:**

- Create: `src/components/auth/auth-shell.tsx`
- Create: `src/components/auth/auth-prism.tsx`
- Create: `src/components/auth/auth-status.tsx`
- Create: `src/components/auth/auth-shell.test.tsx`
- Create: `src/styles/auth-reference.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**

- Produces: `AuthShell`, `AuthPrism`, and `AuthStatus` shared by every access route.

- [ ] **Step 1: Write failing structure and source-parity tests**

Assert `.auth-page`, `.auth-visual`, `.auth-prism`, `.auth-panel`, `.auth-card`,
brand, eyebrow, heading, supporting copy, language control, and live status.
Assert the CSS contains the approved 1.08fr/.92fr desktop split, 440px card,
980px stacking breakpoint, 720px mobile values, calm auth rays, and reduced
motion overrides.

- [ ] **Step 2: Verify RED**

Run `npm test -- src/components/auth/auth-shell.test.tsx`.

- [ ] **Step 3: Port markup and styles literally**

Translate the prototype HTML to semantic React. Reuse local font packages and
repository tokens. Scope CSS under `.auth-reference`. Preserve exact geometry,
copy, prism paths, rays, borders, color values, and breakpoint behavior. Do not
port the marketing custom cursor into authenticated/application UI.

- [ ] **Step 4: Add restrained reveal behavior**

Use CSS classes and a tiny client initializer for staggered glow-to-sharp entry.
All content remains visible without JavaScript and with reduced motion.

- [ ] **Step 5: Verify GREEN and commit**

Run `npm test -- src/components/auth/auth-shell.test.tsx`.

Commit: `feat(DEN-14): port approved authentication shell`.

### Task 4: Implement validation, safe redirects, and auth server actions

**Files:**

- Create: `src/lib/auth/schemas.ts`
- Create: `src/lib/auth/redirects.ts`
- Create: `src/lib/auth/actions.ts`
- Create: `src/lib/auth/auth.test.ts`

**Interfaces:**

- Produces: `emailSchema`, `passwordSchema`, `safeInternalRedirect`, `signInWithGoogle`, `sendMagicLink`, `signUpWithPassword`, `signInWithPassword`, `sendPasswordReset`, `updatePassword`, and `signOut`.

- [ ] **Step 1: Write failing security and error-result tests**

```ts
expect(safeInternalRedirect('/onboarding?step=2')).toBe('/onboarding?step=2');
expect(safeInternalRedirect('https://evil.example')).toBe('/onboarding');
expect(safeInternalRedirect('//evil.example')).toBe('/onboarding');
expect(passwordSchema.safeParse('short').success).toBe(false);
```

Assert Supabase errors map to stable UI codes and submitted email is returned in
error state while password is never returned.

- [ ] **Step 2: Verify RED**

Run `npm test -- src/lib/auth/auth.test.ts`.

- [ ] **Step 3: Implement validated actions**

Every action parses `FormData`, calls the server Supabase client, supplies an
allowlisted callback URL derived from `NEXT_PUBLIC_APP_URL`, and returns:

```ts
type AuthActionState = {
  status: 'idle' | 'success' | 'error';
  code?: string;
  message?: string;
  email?: string;
};
```

Google uses `signInWithOAuth`; magic link uses `signInWithOtp` with account
creation matching the route intent; password flows use `signUp`,
`signInWithPassword`, `resetPasswordForEmail`, and `updateUser`.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm test -- src/lib/auth/auth.test.ts`.

Commit: `feat(DEN-14): implement secure auth actions`.

### Task 5: Build access, verification, recovery, and expiry routes

**Files:**

- Create: `src/app/(auth)/sign-in/page.tsx`
- Create: `src/app/(auth)/sign-up/page.tsx`
- Create: `src/app/(auth)/verify-email/page.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Create: `src/app/(auth)/session-expired/page.tsx`
- Create: `src/components/auth/access-form.tsx`
- Create: `src/components/auth/password-fields.tsx`
- Create: `src/components/auth/auth-routes.test.tsx`

**Interfaces:**

- Consumes: Task 3 shell and Task 4 actions.
- Produces: complete public access and recovery UI.

- [ ] **Step 1: Write failing route-state tests**

Cover Google, magic-link, password toggle, preserved email, validation errors,
verification success, resend action, password recovery, reset confirmation,
expired-session recovery, terms/privacy links, accessible labels, and live
status.

- [ ] **Step 2: Verify RED**

Run `npm test -- src/components/auth/auth-routes.test.tsx`.

- [ ] **Step 3: Implement routes from approved screens**

Sign-in and sign-up preserve the prototype's exact copy and hierarchy. Password
mode replaces only the email action area and keeps the same card geometry.
Verification, recovery, reset, and expiry screens reuse `AuthShell` and the same
control styles; they do not introduce generic cards or new visual language.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm test -- src/components/auth/auth-routes.test.tsx`.

Commit: `feat(DEN-14): add account access and recovery routes`.

### Task 6: Exchange callbacks and protect routes

**Files:**

- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/callback/route.test.ts`
- Create: `proxy.ts`
- Create: `src/lib/auth/protection.ts`
- Create: `src/lib/auth/protection.test.ts`
- Create: `src/app/protected/page.tsx`

**Interfaces:**

- Consumes: Supabase session clients and safe redirects.
- Produces: callback exchange, refreshed cookies, and protected-route redirects.

- [ ] **Step 1: Write failing callback and route-protection tests**

Cover valid code exchange, missing/invalid code, recovery callback, safe internal
`next`, unauthenticated redirect, expired-session redirect, authenticated access,
and completed/incomplete onboarding routing.

- [ ] **Step 2: Verify RED**

Run `npm test -- src/app/auth/callback/route.test.ts src/lib/auth/protection.test.ts`.

- [ ] **Step 3: Implement callback and proxy**

Use `exchangeCodeForSession`, refreshed response cookies, and validated internal
destinations. Proxy matches protected and onboarding routes while excluding
static assets and public auth pages. `/protected` renders only a minimal session
verification screen and link; it is not an app shell.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm test -- src/app/auth/callback/route.test.ts src/lib/auth/protection.test.ts`.

Commit: `feat(DEN-14): protect authenticated routes`.

### Task 7: Implement three-step onboarding

**Files:**

- Create: `src/app/onboarding/page.tsx`
- Create: `src/components/onboarding/onboarding-flow.tsx`
- Create: `src/components/onboarding/onboarding-flow.test.tsx`
- Create: `src/lib/onboarding/actions.ts`
- Create: `src/styles/onboarding-reference.css`

**Interfaces:**

- Consumes: Task 2 repository and Task 6 protection.
- Produces: resumable interface-language, output-language, and output-default flow.

- [ ] **Step 1: Write failing flow tests**

Cover the three exact steps, five languages, independent interface/output
selection, balanced/detailed summary, 18/30 flashcards, skip on non-essential
steps, back/next keyboard behavior, saved resume step, completion, and accessible
radio semantics.

- [ ] **Step 2: Verify RED**

Run `npm test -- src/components/onboarding/onboarding-flow.test.tsx`.

- [ ] **Step 3: Port settings controls into onboarding**

Reuse the prototype's `.language-option`, `.select-card`, active dot, typography,
borders, and responsive grids inside the auth panel composition. Add only a
three-step mono progress indicator and Back/Continue actions using existing
button patterns.

- [ ] **Step 4: Persist and resume progress**

Server actions validate and save each step. Skip preserves defaults and advances
progress. Completion sets `onboarding_completed_at` and redirects to
`/protected`. Reloading resumes from the persisted step.

- [ ] **Step 5: Verify GREEN and commit**

Run `npm test -- src/components/onboarding/onboarding-flow.test.tsx src/lib/onboarding`.

Commit: `feat(DEN-14): add preference onboarding flow`.

### Task 8: Add browser coverage and production verification

**Files:**

- Create: `tests/e2e/auth.spec.ts`
- Modify: `playwright.config.ts` only if deterministic test-mode Supabase boundary configuration is required.
- Modify: `README.md` with Supabase local setup and redirect URLs.

**Interfaces:**

- Verifies the complete DEN-14 user-visible contract.

- [ ] **Step 1: Add failing E2E tests**

Cover 1440x900, 1024x768, and 390x844 auth geometry; no horizontal overflow;
password toggle; preserved email error; keyboard focus order; recovery and expiry
screens; protected redirect; three onboarding steps; reduced motion; no console
error or Next overlay.

- [ ] **Step 2: Verify RED, then complete deterministic test boundary**

Run `npm run test:e2e -- --grep "account access|onboarding"`.

Expected: initial FAIL until deterministic test state is wired. Do not contact a
production Supabase project from tests. Use controlled module boundaries or a
local Supabase environment; never add production credentials to fixtures.

- [ ] **Step 3: Visually compare against the approved prototype**

Capture desktop and mobile screenshots to `/tmp`, compare with
`previews/signin-desktop-render.png`, and verify exact computed geometry for the
two-panel split, 440px form, breakpoints, prism, and controls.

- [ ] **Step 4: Run the full repository gate**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run build
npm run test:e2e
npm run test:e2e:production
```

Expected: every command exits 0; desktop/mobile and reduced-motion checks pass;
`git diff -- design/reference-v3 design/screenshots` is empty; the external
prototype remains unchanged.

- [ ] **Step 5: Commit and prepare publication**

Commit: `test(DEN-14): verify account access and onboarding`.

Review the full diff, push `den-14-account-onboarding`, and open a draft PR only
after verification.

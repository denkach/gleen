# OAuth Callback Cookie Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the Supabase session cookies created by a successful OAuth PKCE exchange on the callback redirect response.

**Architecture:** Introduce a callback-only Supabase client factory whose cookie adapter is bound to the incoming `NextRequest` and the exact outgoing `NextResponse`. Update the callback route to exchange the code through this factory and return the same response containing the session cookies.

**Tech Stack:** Next.js App Router, TypeScript strict mode, `@supabase/ssr`, Vitest.

## Global Constraints

- Keep Supabase secrets server-only.
- Do not change OAuth provider configuration, redirect destinations, onboarding policy, or UI.
- Do not add dependencies.
- Keep the user’s unrelated `next-env.d.ts` modification untouched.

---

### Task 1: Bind OAuth cookies to the callback response

**Files:**

- Create: `src/lib/supabase/callback.ts`
- Modify: `src/app/auth/callback/route.ts`
- Test: `src/app/auth/callback/route.test.ts`

**Interfaces:**

- Produces: `createCallbackSupabaseClient(request: NextRequest, response: NextResponse)`
- Consumes: the callback request cookies and the exact successful redirect response

- [x] **Step 1: Write the failing callback cookie test**

Mock `createCallbackSupabaseClient` in `route.test.ts`. During `exchangeCodeForSession`, write a representative cookie to the supplied response and assert the successful route response contains it:

```ts
const createCallbackSupabaseClient = vi.fn(
  async (_request: NextRequest, response: NextResponse) => ({
    auth: {
      exchangeCodeForSession: vi.fn(async () => {
        response.cookies.set('sb-session', 'authenticated');
        return { error: null };
      }),
    },
  }),
);

expect(response.headers.get('set-cookie')).toContain(
  'sb-session=authenticated',
);
```

- [x] **Step 2: Verify the regression test fails**

Run:

```bash
npm test -- src/app/auth/callback/route.test.ts
```

Expected: FAIL because the current route does not create or pass the returned response to a callback-specific client.

- [x] **Step 3: Implement the response-bound callback client**

Create `src/lib/supabase/callback.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

import { validatePublicEnv } from '@/env';

export function createCallbackSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  const env = validatePublicEnv(process.env);

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
```

Update the route to accept `NextRequest`, construct the successful redirect before the exchange, pass the request and response into `createCallbackSupabaseClient`, and return that same response when no error occurs.

- [x] **Step 4: Verify the focused tests pass**

Run:

```bash
npm test -- src/app/auth/callback/route.test.ts
```

Expected: all callback tests pass and the successful test observes `Set-Cookie`.

- [x] **Step 5: Run repository verification**

Run formatting on the three task files, then run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all commands exit successfully.

- [x] **Step 6: Verify the real OAuth flow and commit**

With the staging server on `http://127.0.0.1:3017`, sign in through Google and confirm the callback reaches `/onboarding`, `/auth/v1/user` returns `200`, and the user no longer returns to `/sign-in`. Commit only the scoped files:

```bash
git add src/lib/supabase/callback.ts src/app/auth/callback/route.ts src/app/auth/callback/route.test.ts docs/superpowers/plans/2026-07-18-oauth-callback-cookie.md
git commit -m "fix(den-17): persist oauth callback session"
```

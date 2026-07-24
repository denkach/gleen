# OAuth Callback Cookie Persistence Fix

## Problem

Google OAuth completes successfully in Supabase and the PKCE token exchange returns `200`, but the protected `/onboarding` route receives no authenticated session and redirects back to `/sign-in`.

The callback currently creates a Supabase server client backed by the generic Next.js cookie store, exchanges the code, and then creates a separate `NextResponse.redirect`. In a Route Handler this does not guarantee that cookies written during the exchange are attached to the returned redirect response.

## Design

Add a callback-specific Supabase client factory that accepts the exact `NextResponse` that the route will return. Its cookie adapter reads request cookies and writes every cookie produced by `exchangeCodeForSession` directly to that response.

The callback route will:

1. validate the authorization code and destination;
2. create the successful redirect response;
3. exchange the code through the callback-specific client bound to that response;
4. return an error redirect when exchange fails;
5. otherwise return the same response containing the session cookies.

The generic server client used by Server Components and Server Actions remains unchanged.

## Verification

Extend the callback route test so the mocked exchange writes a representative session cookie through the supplied response-bound client. The successful callback must return `/onboarding` and expose that cookie in `Set-Cookie`. Verify the test fails against the current implementation before changing production code, then run auth tests, lint, strict type checking, the full test suite, production build, and a real Google OAuth browser flow.

## Scope and risk

No provider configuration, OAuth destination, authorization policy, onboarding behavior, or UI changes. The main risk is coupling callback code to response mutation; keeping the factory callback-specific makes that behavior explicit and prevents accidental use in Server Components.

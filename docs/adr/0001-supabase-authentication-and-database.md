# ADR 0001: Supabase authentication and database

- Date: 2026-07-12
- Status: Accepted

## Context

DEN-14 requires Google OAuth, email magic links, email/password access,
verification and recovery states, sessions, protected routes, safe identity
linking, and persisted onboarding preferences. Gleen also needs a relational
store for later history, usage, billing, and processing domains.

## Decision

Use Supabase Auth as the only authentication provider and Supabase Postgres as
the application database. Use `@supabase/ssr` for cookie-backed Next.js App
Router sessions and `@supabase/supabase-js` for typed Supabase clients.

Persist application preferences in an application-owned profile table keyed by
the Supabase user UUID. Enforce ownership with Row Level Security. Keep service
credentials server-only and never expose them to client components.

## Alternatives considered

- Clerk with Neon Postgres: strong managed authentication, but introduces two
  vendors and requires synchronization between identity and application data.
- Clerk with Supabase Postgres: duplicates user models and adds JWT/RLS
  integration complexity.
- Auth.js with Postgres: offers control, but requires more session, adapter,
  email, and account-linking implementation within DEN-14.

## Consequences

- Authentication and user data share one platform and one stable user UUID.
- Gleen retains a custom UI that can match the approved prototype exactly.
- Cookie refresh, redirect allowlists, email templates, OAuth configuration,
  migrations, and RLS policies must be configured and tested explicitly.
- Future provider replacement requires migrating both identities and database
  access, so Supabase-specific code must remain behind focused server modules.

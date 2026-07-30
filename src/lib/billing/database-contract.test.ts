import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260729234541_den_20_billing_usage.sql',
);

const sql = readFileSync(migrationPath, 'utf8');

const runtimeFixMigrationName =
  '20260730004621_den_20_reservation_conflict_runtime_fix.sql';
const runtimeFixMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  runtimeFixMigrationName,
);
const runtimeFixSql = readFileSync(runtimeFixMigrationPath, 'utf8');

const readBetween = (start: string, end: string) => {
  const startIndex = sql.indexOf(start);
  const endIndex = sql.indexOf(end, startIndex + start.length);

  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(
    0,
  );
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);

  return sql.slice(startIndex, endIndex);
};

describe('DEN-20 billing and usage migration', () => {
  it('defines the required secure database surface', () => {
    expect(sql).toContain('create table public.billing_plans');
    expect(sql).toContain('create table public.billing_prices');
    expect(sql).toContain('create table public.billing_entitlement_periods');
    expect(sql).toContain('create table public.usage_ledger');
    expect(sql).toContain('unique (stripe_event_id)');
    expect(sql).toContain('with (security_invoker = true)');
    expect(sql).toContain('(select auth.uid()) = user_id');
    expect(sql).toContain('for update');
    expect(sql).toContain('usage_limit_reached');
    expect(sql).toContain('revoke all');
    expect(sql).toContain('grant select');
  });

  it('uses one cascading entitlement deletion graph for usage children', () => {
    expect(sql).toContain(
      'entitlement_period_id uuid references public.billing_entitlement_periods(id) on delete cascade',
    );
    expect(sql).toContain(
      'entitlement_period_id uuid not null references public.billing_entitlement_periods(id) on delete cascade',
    );
    expect(sql).not.toContain(
      'references public.billing_entitlement_periods(id) on delete restrict',
    );
  });

  it('grandfathers completed legacy usage and preserves active reservations', () => {
    const backfill = readBetween(
      'insert into public.billing_entitlement_periods (',
      'alter table public.analysis_usage_reservations',
    );

    expect(backfill).toContain("reservation.status = 'reserved'");
    expect(backfill).toContain("reservation.status in ('settled', 'released')");
    expect(backfill).toContain("'migration'");
    expect(backfill).toContain("else 'migration'");
    expect(backfill).toContain(") - interval '1 month'");
    expect(backfill).toMatch(/plan\.analysis_limit,\s*false,\s*'migration'/);
    expect(backfill).toContain('plan.analysis_limit');
    expect(backfill).not.toMatch(/\n\s*3,\n/);
    expect(sql).toContain(
      "source in ('free', 'migration') and subscription_id is null",
    );
  });

  it('derives every Free limit snapshot from the authoritative catalog', () => {
    const freeEntitlement = readBetween(
      'create function private.get_or_create_free_entitlement',
      'create function private.reserve_analysis_usage',
    );

    expect(freeEntitlement).toContain('plan.analysis_limit');
    expect(freeEntitlement).not.toMatch(/\n\s*3,\n/);
  });

  it('uses null-safe service-role guards', () => {
    expect(sql).toContain("caller_role is distinct from 'service_role'");
    expect(sql).toMatch(
      /pg_catalog\.current_setting\(\s*'request\.jwt\.claim\.role',\s*true\s*\) is distinct from 'service_role'/,
    );
    expect(sql).not.toContain("caller_role <> 'service_role'");
    expect(sql).not.toContain(
      "pg_catalog.current_setting('request.jwt.claim.role', true) <> 'service_role'",
    );
  });

  it('excludes unpaid Stripe periods from the billing overview', () => {
    const overview = readBetween(
      'create view public.billing_subscription_overview',
      'create view public.billing_usage_activity',
    );

    expect(overview).toContain(
      "(entitlement.source = 'stripe' and entitlement.is_paid_through)",
    );
    expect(overview).toContain("or entitlement.source = 'free'");
  });

  it('allows zero-cost retry only while its reservation remains active', () => {
    const retry = readBetween(
      'create function private.retry_analysis_pipeline',
      'create or replace function public.retry_analysis_pipeline',
    );

    expect(retry).toContain('for update;');
    expect(retry).toContain(
      "if reservation.status is distinct from 'reserved' then",
    );
    expect(retry).toContain("raise exception 'usage_reservation_not_active'");
    expect(retry).toMatch(
      /where analysis_job\.analysis_id = intake\.id;\s+if not found then/,
    );
    expect(retry.indexOf('usage_reservation_not_active')).toBeLessThan(
      retry.indexOf('update public.analysis_jobs'),
    );
  });

  it('keeps applied billing history immutable and orders the runtime fix later', () => {
    expect(
      createHash('sha256').update(sql).digest('hex'),
      'the applied DEN-20 migration must remain byte-for-byte immutable',
    ).toBe('5c97039a521468227f1480a40f3e41f443784e4de0bb1985260eeff4b286d40b');
    expect(
      runtimeFixMigrationName.localeCompare(
        '20260729234541_den_20_billing_usage.sql',
      ),
    ).toBeGreaterThan(0);
  });

  it('targets the reservation analysis uniqueness constraint without ambiguity', () => {
    expect(runtimeFixSql).toContain(
      'add constraint analysis_usage_reservations_analysis_id_key',
    );
    expect(runtimeFixSql).toContain(
      'unique using index usage_reservations_analysis_idx',
    );
    expect(runtimeFixSql).toContain(
      'create or replace function private.reserve_analysis_usage(analysis_id uuid)',
    );
    expect(runtimeFixSql).toContain(
      'on conflict on constraint analysis_usage_reservations_analysis_id_key do nothing',
    );
    expect(runtimeFixSql).toContain(
      'analysis_intake.id = reserve_analysis_usage.analysis_id',
    );
    expect(runtimeFixSql).not.toContain('plpgsql.variable_conflict');
    expect(runtimeFixSql).not.toContain('on conflict (analysis_id)');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260729234541_den_20_billing_usage.sql',
);

const sql = readFileSync(migrationPath, 'utf8');

it('defines the DEN-20 billing and usage database contract', () => {
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

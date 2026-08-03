import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260802153500_den_20_billing_race_safety.sql',
  ),
  'utf8',
);

describe('DEN-20 billing race safety migration', () => {
  it('distinguishes completed webhook duplicates from active leases', () => {
    expect(sql).toContain("return 'processed'");
    expect(sql).toContain("return 'in_progress'");
    expect(sql).toContain('billing_webhook_claim_state_invalid');
  });

  it('preserves the last paid entitlement through past-due and unpaid upgrades', () => {
    expect(sql).toContain(
      'paid_entitlement public.billing_entitlement_periods%rowtype',
    );
    expect(sql).toContain("target_status in ('active', 'past_due')");
    expect(sql).toContain('plan_id = paid_entitlement.plan_id');
    expect(sql).toContain('is_paid_through = true');
    expect(sql).toContain('paid_entitlement.period_end');
  });

  it('moves plan entitlement only after a paid invoice', () => {
    expect(sql).toContain('if target_advance_paid_through');
    expect(sql).toContain('plan_id = paid_plan.id');
    expect(sql).toContain('analysis_limit = paid_plan.analysis_limit');
    expect(sql).toContain(
      'subscription.current_period_start = target_period_start',
    );
    expect(sql).toContain(
      'subscription.current_period_end = target_period_end',
    );
  });

  it('serializes Checkout attempts and rotates only after the old session is replaced', () => {
    expect(sql).toContain('create table public.billing_checkout_attempts');
    expect(sql).toContain('for update');
    expect(sql).toContain(
      'target_replace_session_id = attempt.stripe_session_id',
    );
    expect(sql).toContain('billing_checkout_attempt_conflict');
  });
});

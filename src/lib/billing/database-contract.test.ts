import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
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
const repositoryBoundaryMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260730015211_den_20_billing_repository_boundaries.sql',
);
const repositoryBoundarySql = readFileSync(
  repositoryBoundaryMigrationPath,
  'utf8',
);
const viewPrivilegeMigrationName =
  '20260730022802_den_20_billing_view_privilege_hardening.sql';
const viewPrivilegeMigrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  viewPrivilegeMigrationName,
);
const viewPrivilegeSql = readFileSync(viewPrivilegeMigrationPath, 'utf8');
const usageLabelsSql = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260730041101_den_20_billing_usage_labels.sql',
  ),
  'utf8',
);
const migrationsDirectory = join(process.cwd(), 'supabase', 'migrations');
const migrationNames = readdirSync(migrationsDirectory);
const usageViewAclCorrectionMigrationName = migrationNames.find((name) =>
  name.endsWith('_den_20_fix_billing_usage_view_privileges.sql'),
);
const usageViewAclCorrectionSql =
  usageViewAclCorrectionMigrationName === undefined
    ? ''
    : readFileSync(
        join(migrationsDirectory, usageViewAclCorrectionMigrationName),
        'utf8',
      );
const protectedUsageViews = [
  'billing_usage_summary',
  'billing_usage_activity',
] as const;
const normalizeSqlForAclContract = (sql: string) =>
  sql
    .replace(/--[^\r\n]*(?:\r?\n|$)/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const findReplacementAclViolations = (
  migrations: ReadonlyArray<{ name: string; sql: string }>,
) =>
  migrations.flatMap(({ name, sql: migrationSql }) => {
    const normalizedSql = normalizeSqlForAclContract(migrationSql);

    return protectedUsageViews.flatMap((view) => {
      const qualifiedView = `public\\s*\\.\\s*${view}`;
      const replacementPattern = new RegExp(
        `\\bcreate\\s+or\\s+replace\\s+view\\s+${qualifiedView}\\b`,
        'g',
      );
      const replacementMatches = [
        ...normalizedSql.matchAll(replacementPattern),
      ];

      if (replacementMatches.length === 0) {
        return [];
      }

      const replacementIndex =
        replacementMatches.at(-1)?.index ?? normalizedSql.length;
      const replacementAndFollowingSql = normalizedSql.slice(replacementIndex);
      const revokeIndex = replacementAndFollowingSql.search(
        new RegExp(
          `\\brevoke\\s+all\\s+on\\s+${qualifiedView}\\s+from\\s+` +
            'public\\s*,\\s*anon\\s*,\\s*authenticated\\s*,\\s*service_role\\s*;',
        ),
      );
      const grantIndex = replacementAndFollowingSql.search(
        new RegExp(
          `\\bgrant\\s+select\\s+on\\s+${qualifiedView}\\s+to\\s+` +
            'authenticated\\s*,\\s*service_role\\s*;',
        ),
      );

      return revokeIndex > 0 && grantIndex > revokeIndex
        ? []
        : [`${name}:${view}`];
    });
  });
const replacementAclViolations = findReplacementAclViolations(
  migrationNames.map((name) => ({
    name,
    sql: readFileSync(join(migrationsDirectory, name), 'utf8'),
  })),
);
const exactWebhookPriceMigrationName = migrationNames.find((name) =>
  name.endsWith('_den_20_exact_webhook_price_projection.sql'),
);
const exactWebhookPriceSql =
  exactWebhookPriceMigrationName === undefined
    ? ''
    : readFileSync(
        join(migrationsDirectory, exactWebhookPriceMigrationName),
        'utf8',
      );
const secretKeyRpcCompatibilityMigrationName = migrationNames.find((name) =>
  name.endsWith('_den_20_secret_key_rpc_compatibility.sql'),
);
const secretKeyRpcCompatibilitySql =
  secretKeyRpcCompatibilityMigrationName === undefined
    ? ''
    : readFileSync(
        join(migrationsDirectory, secretKeyRpcCompatibilityMigrationName),
        'utf8',
      );
const invoicePaidMigrationName =
  '20260730031822_den_20_invoice_paid_projection.sql';
const invoicePaidSql = readFileSync(
  join(migrationsDirectory, invoicePaidMigrationName),
  'utf8',
);
const invoicePaidGreatestFixMigrationName = migrationNames.find((name) =>
  name.endsWith('_den_20_fix_invoice_paid_greatest.sql'),
);
const invoicePaidGreatestFixSql =
  invoicePaidGreatestFixMigrationName === undefined
    ? ''
    : readFileSync(
        join(migrationsDirectory, invoicePaidGreatestFixMigrationName),
        'utf8',
      );
const invoicePaidForwardChainSql = migrationNames
  .filter((name) => name > invoicePaidMigrationName)
  .sort()
  .map((name) => readFileSync(join(migrationsDirectory, name), 'utf8'))
  .join('\n');
const den20QualifiedSpecialFormViolations = migrationNames
  .filter(
    (name) =>
      name.includes('_den_20_') &&
      name.endsWith('.sql') &&
      name !== invoicePaidMigrationName,
  )
  .flatMap((name) => {
    const migrationSql = readFileSync(join(migrationsDirectory, name), 'utf8');
    return [
      ...migrationSql.matchAll(/\bpg_catalog\.(coalesce|greatest)\s*\(/gi),
    ].map((match) => `${name}:${match[0]}`);
  });

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

describe('DEN-20 billing repository database boundaries', () => {
  it('keeps the applied repository boundary migration immutable and orders the ACL fix later', () => {
    expect(
      createHash('sha256').update(repositoryBoundarySql).digest('hex'),
      'the staged Task 4 migration must remain byte-for-byte immutable',
    ).toBe('40522551b0158c68c0a8166f1e58b6a9cc27bb8922d73c250702c48653c8a1c2');
    expect(
      viewPrivilegeMigrationName.localeCompare(
        '20260730015211_den_20_billing_repository_boundaries.sql',
      ),
    ).toBeGreaterThan(0);
  });

  it('provides a complete owner-readable usage split', () => {
    expect(repositoryBoundarySql).toContain(
      'create view public.billing_usage_summary',
    );
    expect(repositoryBoundarySql).toContain('with (security_invoker = true)');
    expect(repositoryBoundarySql).toContain("reservation.status = 'settled'");
    expect(repositoryBoundarySql).toContain("reservation.status = 'reserved'");
    expect(repositoryBoundarySql).toContain(
      'grant select on public.billing_usage_summary',
    );
  });

  it('aggregates only positive owner-scoped adjustment and refund credits', () => {
    expect(usageLabelsSql).toContain(
      "ledger.event_type in ('manual_adjustment', 'refund')",
    );
    expect(usageLabelsSql).toContain('ledger.quantity > 0');
    expect(usageLabelsSql).toContain('ledger.user_id = entitlement.user_id');
    expect(usageLabelsSql).toContain('as extra_credits');
    expect(usageLabelsSql).not.toMatch(
      /event_type in \([^)]*technical_retry[^)]*\)/,
    );
    expect(usageLabelsSql).not.toMatch(
      /event_type in \([^)]*period_renewal[^)]*\)/,
    );
  });

  it('provides atomic service-role projection RPCs', () => {
    expect(repositoryBoundarySql).toContain('claim_billing_webhook_event');
    expect(repositoryBoundarySql).toContain(
      'apply_billing_subscription_projection',
    );
    expect(repositoryBoundarySql).toContain('apply_billing_invoice_projection');
    expect(repositoryBoundarySql).toContain('mark_billing_webhook_processed');
    expect(repositoryBoundarySql).toContain('mark_billing_webhook_failed');
    expect(repositoryBoundarySql).toContain("is distinct from 'service_role'");
    expect(repositoryBoundarySql).toContain('revoke all on function');
  });

  it('keeps projection RPCs compatible with Supabase secret keys', () => {
    expect(secretKeyRpcCompatibilityMigrationName).toBeDefined();
    expect(secretKeyRpcCompatibilitySql).toContain(
      'create function public.claim_billing_webhook_event_service_role',
    );
    expect(secretKeyRpcCompatibilitySql).toMatch(
      /set_config\(\s*'request\.jwt\.claim\.role',\s*'service_role',\s*true\s*\)/,
    );
    expect(secretKeyRpcCompatibilitySql).toContain(
      'revoke all on function public.claim_billing_webhook_event_service_role',
    );
    expect(secretKeyRpcCompatibilitySql).toContain(
      'grant execute on function public.claim_billing_webhook_event_service_role',
    );
  });

  it('leases webhook claims without admitting concurrent fresh processing', () => {
    const claimStart = repositoryBoundarySql.indexOf(
      'create function public.claim_billing_webhook_event',
    );
    const claimEnd = repositoryBoundarySql.indexOf(
      'create function public.apply_billing_subscription_projection',
    );
    const claim = repositoryBoundarySql.slice(claimStart, claimEnd);

    expect(claim).toContain("webhook.processing_status = 'failed'");
    expect(claim).toContain("webhook.processing_status = 'processing'");
    expect(claim).toContain("interval '5 minutes'");
    expect(claim).toContain('webhook.updated_at <=');
    expect(claim).toContain(
      'processing_attempts = webhook.processing_attempts + 1',
    );
    expect(claim).not.toContain(
      "webhook.processing_status in ('failed', 'processing')",
    );
  });
});

describe('DEN-20 exact historical webhook Price projection', () => {
  it('adds a forward-only RPC that verifies the exact known Price without requiring it to remain active', () => {
    expect(exactWebhookPriceMigrationName).toBeDefined();
    expect(exactWebhookPriceSql).toContain('target_external_price_id text');
    expect(exactWebhookPriceSql).toContain(
      'price.stripe_price_id = target_external_price_id',
    );
    expect(exactWebhookPriceSql).toContain(
      'price.billing_interval = target_interval',
    );
    expect(exactWebhookPriceSql).toContain('price.plan_id = plan.id');
    expect(exactWebhookPriceSql).not.toContain('price.is_active');
    expect(exactWebhookPriceSql).not.toContain('billing_plan.is_active');
  });
});

describe('DEN-20 invoice paid projection SQL correction', () => {
  it('replaces the boolean overload without schema-qualifying GREATEST', () => {
    expect(
      createHash('sha256').update(invoicePaidSql).digest('hex'),
      'the applied invoice-paid migration must remain byte-for-byte immutable',
    ).toBe('8e9e5d6ce85dfc074fe94a0ed3a840e58d5ead8e174d732bbb6ce7bde9c2f617');
    expect(invoicePaidSql).toContain('pg_catalog.greatest');
    expect(invoicePaidGreatestFixMigrationName).toBeDefined();
    expect(invoicePaidForwardChainSql).not.toContain('pg_catalog.greatest');
    expect(invoicePaidGreatestFixSql).toContain(
      'create or replace function public.apply_billing_invoice_projection(',
    );
    expect(invoicePaidGreatestFixSql).toContain('greatest(');
    expect(invoicePaidGreatestFixSql).toContain('security invoker');
    expect(invoicePaidGreatestFixSql).toContain("set search_path = ''");
    expect(invoicePaidGreatestFixSql).toContain(
      'if target_advance_paid_through',
    );
    expect(invoicePaidGreatestFixSql).toMatch(
      /latest_stripe_event_created_at\s*<= target_event_created_at/,
    );
    expect(invoicePaidGreatestFixSql).toContain(
      'revoke all on function public.apply_billing_invoice_projection(',
    );
    expect(invoicePaidGreatestFixSql).toContain(
      'grant execute on function public.apply_billing_invoice_projection(',
    );
    expect(invoicePaidGreatestFixSql).toContain(') to service_role;');
  });

  it('does not schema-qualify parser-level COALESCE or GREATEST in DEN-20 forward migrations', () => {
    expect(den20QualifiedSpecialFormViolations).toEqual([]);
  });
});

describe('DEN-20 billing view privilege hardening', () => {
  const views = [
    'billing_usage_summary',
    'billing_customer_overview',
    'billing_payment_summary',
  ] as const;

  it.each(views)(
    'revokes defaults before granting exact read access on %s',
    (view) => {
      const revoke =
        `revoke all on public.${view} ` +
        'from public, anon, authenticated, service_role;';
      const grant = `grant select on public.${view} to authenticated, service_role;`;

      expect(viewPrivilegeSql).toContain(revoke);
      expect(viewPrivilegeSql).toContain(grant);
      expect(viewPrivilegeSql.indexOf(revoke)).toBeLessThan(
        viewPrivilegeSql.indexOf(grant),
      );
    },
  );

  it('contains no non-select grant', () => {
    expect(viewPrivilegeSql.match(/\bgrant\s+(?!select\b)/g)).toBeNull();
    expect(viewPrivilegeSql.match(/\bgrant\s+select\b/g)).toHaveLength(3);
  });

  it('detects an uppercase protected view replacement without local ACL hardening', () => {
    expect(
      findReplacementAclViolations([
        {
          name: 'uppercase.sql',
          sql: `
            CREATE OR REPLACE VIEW public.billing_usage_activity AS
            SELECT 1;
          `,
        },
      ]),
    ).toEqual(['uppercase.sql:billing_usage_activity']);
  });

  it('detects a multiline commented protected view replacement without local ACL hardening', () => {
    expect(
      findReplacementAclViolations([
        {
          name: 'multiline.sql',
          sql: `
            create /* preserve owner scope */
              or
              replace
              view
              public.billing_usage_summary
            as select 1;
          `,
        },
      ]),
    ).toEqual(['multiline.sql:billing_usage_summary']);
  });

  it('accepts a whitespace-variant replacement with local revoke-then-grant hardening', () => {
    expect(
      findReplacementAclViolations([
        {
          name: 'compliant.sql',
          sql: `
            CREATE
              OR REPLACE VIEW public.billing_usage_activity
            AS SELECT 1;

            REVOKE ALL ON public.billing_usage_activity
              FROM PUBLIC, anon, authenticated, service_role;
            GRANT SELECT ON public.billing_usage_activity
              TO authenticated, service_role;
          `,
        },
      ]),
    ).toEqual([]);
  });

  it('records only the applied usage-label replacement as awaiting forward ACL correction', () => {
    expect(
      createHash('sha256').update(usageLabelsSql).digest('hex'),
      'the applied usage-label migration must remain byte-for-byte immutable',
    ).toBe('6b19284c6f028d67b83ffc13ad97a08a6ef38c9a4344d8f1c867319c4cb07a01');
    expect(replacementAclViolations).toEqual([
      '20260730041101_den_20_billing_usage_labels.sql:billing_usage_summary',
      '20260730041101_den_20_billing_usage_labels.sql:billing_usage_activity',
    ]);
  });

  it('repairs both replaced usage views with exact read-only privileges', () => {
    expect(usageViewAclCorrectionMigrationName).toBeDefined();
    expect(
      usageViewAclCorrectionMigrationName?.localeCompare(
        '20260730041101_den_20_billing_usage_labels.sql',
      ),
    ).toBeGreaterThan(0);

    expect(
      usageViewAclCorrectionSql
        .split(';')
        .map((statement) => statement.trim().replace(/\s+/g, ' '))
        .filter(Boolean),
    ).toEqual([
      'revoke all on public.billing_usage_activity from public, anon, authenticated, service_role',
      'grant select on public.billing_usage_activity to authenticated, service_role',
      'revoke all on public.billing_usage_summary from public, anon, authenticated, service_role',
      'grant select on public.billing_usage_summary to authenticated, service_role',
    ]);
  });
});

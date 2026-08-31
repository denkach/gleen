import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, it } from 'vitest';

const readMigration = (name: string) =>
  readFileSync(join(process.cwd(), 'supabase', 'migrations', name), 'utf8');

it('defines owned RLS policies and atomic pipeline RPCs', () => {
  const sql = readMigration('202607170001_create_analysis_pipeline.sql');

  expect(sql).toContain('create function public.create_analysis_pipeline');
  expect(sql).toContain('create function public.retry_analysis_pipeline');
  expect(sql).toContain('analysis_jobs_select_own');
  expect(sql).toContain('analysis_artifacts_select_own');
  expect(sql).toContain('analysis_job_events_insert_own');
  expect(sql).toContain('analysis_usage_reservations_update_own');
  expect(sql).toContain(
    'alter publication supabase_realtime add table public.analysis_jobs',
  );
});

it('explicitly exposes only the owned application API to authenticated users', () => {
  const sql = readMigration(
    '20260717212607_grant_analysis_data_api_access.sql',
  );

  expect(sql).toContain('grant select, insert, update on public.profiles');
  expect(sql).toContain(
    'grant select, insert, update on public.analysis_intakes',
  );
  expect(sql).toContain('grant select, insert, update on public.analysis_jobs');
  expect(sql).toContain(
    'grant select, insert, update on public.analysis_artifacts',
  );
  expect(sql).toContain(
    'grant execute on function public.create_analysis_pipeline(uuid)',
  );
  expect(sql).toContain(
    'grant execute on function public.retry_analysis_pipeline(uuid)',
  );
  expect(sql).toContain('revoke all on public.analysis_jobs from anon');
  expect(sql).toContain(
    'revoke execute on function public.create_analysis_pipeline(uuid) from public, anon',
  );
});

it('passes retry analysis ids positionally to avoid composite-row ambiguity', () => {
  const sql = readMigration(
    '20260802140000_den_20_fix_retry_analysis_parameter_ambiguity.sql',
  );

  expect(sql).toContain('select private.retry_analysis_pipeline($1);');
  expect(sql).toContain(
    'update public.analysis_artifacts as analysis_artifact',
  );
  expect(sql).toContain('where analysis_artifact.analysis_id = intake.id');
  expect(sql).not.toContain(
    'select private.retry_analysis_pipeline(analysis_id);',
  );
});

it('supports usage transitions from modern Supabase secret keys', () => {
  const sql = readMigration(
    '20260802140500_den_20_secret_key_usage_transition.sql',
  );

  expect(sql).toContain(
    'create function public.transition_analysis_usage_service_role',
  );
  expect(sql).toMatch(
    /set_config\(\s*'request\.jwt\.claim\.role',\s*'service_role',\s*true\s*\)/,
  );
  expect(sql).toContain('return public.transition_analysis_usage(');
  expect(sql).toContain(
    'grant execute on function public.transition_analysis_usage_service_role',
  );
});

it('keeps Summary generation metrics server-only and immune to owner idempotency pre-insertion', () => {
  const sql = readMigration('202608300001_den_118_summary_modes.sql');

  expect(sql).toContain(
    'create table public.analysis_summary_generation_metrics',
  );
  expect(sql).toContain('unique (job_id, attempt)');
  expect(sql).toContain(
    'alter table public.analysis_summary_generation_metrics enable row level security',
  );
  expect(sql).toContain(
    'revoke all on table public.analysis_summary_generation_metrics from PUBLIC, anon, authenticated, service_role',
  );
  expect(sql).toContain(
    'grant select, insert on table public.analysis_summary_generation_metrics to service_role',
  );
  expect(sql).not.toMatch(
    /create policy[\s\S]+on public\.analysis_summary_generation_metrics/i,
  );
  expect(sql).not.toMatch(
    /grant (?:select|insert|update|delete)[^;]+analysis_summary_generation_metrics[^;]+authenticated/i,
  );
});

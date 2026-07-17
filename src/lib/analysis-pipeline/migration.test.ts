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

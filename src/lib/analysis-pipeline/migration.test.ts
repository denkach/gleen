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
  expect(sql).toContain(
    'alter publication supabase_realtime add table public.analysis_jobs',
  );
});

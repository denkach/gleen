import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/202608300001_den_118_summary_modes.sql',
);

async function readSummaryModeMigration() {
  return readFile(migrationPath, 'utf8');
}

describe('DEN-118 summary mode migration', () => {
  it('migrates legacy values while allowing deployment-overlap writes', async () => {
    const migration = await readSummaryModeMigration();

    expect(migration).toMatch(
      /profiles_summary_preset_check[\s\S]*\('compact', 'balanced', 'deep', 'detailed'\)/i,
    );
    expect(migration).toMatch(
      /analysis_intakes_summary_preset_check[\s\S]*\('compact', 'balanced', 'deep', 'detailed'\)/i,
    );
    expect(migration).toMatch(
      /update public\.profiles set summary_preset = 'deep' where summary_preset = 'detailed'/i,
    );
    expect(migration).toMatch(
      /update public\.analysis_intakes set summary_preset = 'deep' where summary_preset = 'detailed'/i,
    );
  });

  it('atomically treats Deep and detailed as one semantic intake identity during overlap', async () => {
    const migration = await readSummaryModeMigration();

    expect(migration).toContain(
      'create unique index analysis_intakes_semantic_identity_attempt_idx',
    );
    expect(migration).toMatch(
      /case\s+when 'summary' = any \(selected_artifacts\)[\s\S]*summary_preset in \('deep', 'detailed'\)[\s\S]*then 'deep'/i,
    );
    for (const artifact of [
      'summary',
      'timestamps',
      'transcript',
      'flashcards',
    ]) {
      expect(migration).toContain(`('${artifact}' = any (selected_artifacts))`);
    }
    expect(migration).toMatch(
      /case\s+when 'flashcards' = any \(selected_artifacts\)[\s\S]*flashcard_preset[\s\S]*else 0/i,
    );
    expect(migration).toMatch(/analysis_contract_version,[\s\n]*attempt/i);
  });

  it('executes on PostgreSQL and enforces the Deep compatibility identity', async () => {
    const database = new PGlite();
    try {
      await database.exec(`
          create role anon nologin;
          create role authenticated nologin;
          create role service_role nologin;

          create table public.profiles (
            user_id uuid primary key,
            summary_preset text constraint profiles_summary_preset_check
              check (summary_preset in ('balanced', 'detailed'))
          );
          create table public.analysis_intakes (
            user_id uuid not null,
            youtube_video_id text not null,
            output_locale text not null,
            selected_artifacts text[] not null,
            summary_preset text constraint analysis_intakes_summary_preset_check
              check (summary_preset in ('balanced', 'detailed')),
            flashcard_preset integer,
            analysis_contract_version integer not null,
            attempt integer not null
          );
          create table public.analysis_jobs (
            id uuid primary key
          );
        `);

      await database.exec(await readSummaryModeMigration());

      const installed = await database.query<{ relation: string | null }>(`
          select to_regclass('public.analysis_summary_generation_metrics')::text as relation
        `);
      expect(installed.rows).toEqual([
        { relation: 'analysis_summary_generation_metrics' },
      ]);

      await database.exec(`
          insert into public.analysis_intakes (
            user_id,
            youtube_video_id,
            output_locale,
            selected_artifacts,
            summary_preset,
            flashcard_preset,
            analysis_contract_version,
            attempt
          ) values (
            '11111111-1111-4111-8111-111111111111',
            'dQw4w9WgXcQ',
            'en',
            array['summary'],
            'deep',
            null,
            1,
            1
          );
        `);

      await expect(
        database.exec(`
            insert into public.analysis_intakes (
              user_id,
              youtube_video_id,
              output_locale,
              selected_artifacts,
              summary_preset,
              flashcard_preset,
              analysis_contract_version,
              attempt
            ) values (
              '11111111-1111-4111-8111-111111111111',
              'dQw4w9WgXcQ',
              'en',
              array['summary'],
              'detailed',
              null,
              1,
              1
            );
          `),
      ).rejects.toMatchObject({ code: '23505' });
    } finally {
      await database.close();
    }
  }, 20_000);
});

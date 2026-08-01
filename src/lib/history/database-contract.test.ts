import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationDirectory = join(process.cwd(), 'supabase', 'migrations');
const uniqueMigrationName = (suffix: string) => {
  const matches = readdirSync(migrationDirectory).filter((name) =>
    name.endsWith(suffix),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one migration ending with ${suffix}, found ${matches.length}`,
    );
  }
  return matches[0]!;
};
const migrationPath = join(
  migrationDirectory,
  uniqueMigrationName('_den_19_history_search.sql'),
);
const sql = readFileSync(migrationPath, 'utf8');
const normalizedSql = sql.replace(/\s+/g, ' ').trim();

describe('DEN-19 History database contract', () => {
  it('defines the secure indexed History read model', () => {
    expect(sql).toContain('add column if not exists history_search tsvector');
    expect(sql).toContain('using gin (history_search)');
    expect(normalizedSql).toContain("to_tsvector( 'simple',");
    expect(sql).toContain(
      "coalesce(title, '') || ' ' ||\n" +
        "      coalesce(channel_title, '') || ' ' ||\n" +
        "      coalesce(canonical_url, '') || ' ' ||\n" +
        "      coalesce(youtube_video_id, '') || ' ' ||\n" +
        "      coalesce(output_locale, '') || ' ' ||\n" +
        "      coalesce(transcript_language, '')",
    );
    expect(sql).not.toContain('concat_ws');
    expect(normalizedSql).toContain(
      'on public.analysis_intakes (user_id, created_at desc, id desc)',
    );
    expect(normalizedSql).toContain(
      'on public.analysis_result_states ( user_id, last_opened_at desc nulls last, analysis_id desc )',
    );
    expect(normalizedSql).toContain(
      'on public.analysis_intakes (user_id, lower(title), id)',
    );
    expect(sql).toContain(
      'add column if not exists last_opened_at timestamptz',
    );
    expect(sql).toContain('with (security_invoker = true)');
    expect(normalizedSql).not.toContain('intake.summary_preset');
    expect(normalizedSql).toContain(
      'job.analysis_id = intake.id and job.user_id = intake.user_id',
    );
    expect(normalizedSql).toContain(
      'result_state.analysis_id = intake.id and result_state.user_id = intake.user_id',
    );
    expect(normalizedSql).toContain(
      'artifact.analysis_id = intake.id and artifact.user_id = intake.user_id',
    );
    expect(sql).toContain(
      'revoke all on public.analysis_history from public, anon',
    );
    expect(sql).toContain(
      'grant select on public.analysis_history to authenticated',
    );
    expect(sql).toContain('for delete to authenticated');
    expect(sql).toContain('(select auth.uid()) = user_id');
    expect(sql.toLowerCase()).not.toContain('security definer');
  });

  it('appends the persisted summary preset in a forward-compatible view migration', () => {
    const forwardMigration = uniqueMigrationName('_den_19_history_preset.sql');

    const forwardSql = readFileSync(
      join(migrationDirectory, forwardMigration),
      'utf8',
    );
    const normalizedForwardSql = forwardSql.replace(/\s+/g, ' ').trim();
    const baseColumns = normalizedSql.match(
      /as select (.+?) from public\.analysis_intakes as intake/u,
    )?.[1];
    const forwardColumns = normalizedForwardSql.match(
      /as select (.+?) from public\.analysis_intakes as intake/u,
    )?.[1];

    expect(normalizedForwardSql).toContain(
      'create or replace view public.analysis_history with (security_invoker = true) as select',
    );
    expect(baseColumns).toBeDefined();
    expect(forwardColumns).toBe(`${baseColumns}, intake.summary_preset`);
    expect(forwardSql).toContain(
      'revoke all on public.analysis_history from public, anon',
    );
    expect(forwardSql).toContain(
      'grant select on public.analysis_history to authenticated',
    );
    expect(forwardSql.toLowerCase()).not.toContain('security definer');
  });
});

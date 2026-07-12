import fs from 'node:fs';

import { expect, test } from 'vitest';

const migrationPath =
  'supabase/migrations/202607120002_create_analysis_intakes.sql';
const sql = fs.existsSync(migrationPath)
  ? fs.readFileSync(migrationPath, 'utf8')
  : '';

test('creates constrained private intake storage and atomic re-analysis', () => {
  expect(sql).toMatch(/create table public\.analysis_intakes/);
  expect(sql).toMatch(/unique \(user_id, duplicate_key, attempt\)/);
  expect(sql).toMatch(
    /youtube_video_id[\s\S]*?char_length\(youtube_video_id\) = 11/,
  );
  expect(sql).toMatch(/canonical_url[\s\S]*?\^https:\/\//);
  expect(sql).toMatch(
    /selected_artifacts[\s\S]*?cardinality\(selected_artifacts\) > 0/,
  );
  expect(sql).toMatch(
    /selected_artifacts <@ array\['summary', 'timestamps', 'transcript', 'flashcards'\]::text\[\]/,
  );
  expect(sql).toMatch(/duplicate_key[\s\S]*?\^\[0-9a-f\]\{64\}\$/);
  expect(sql).toMatch(
    /create index analysis_intakes_user_duplicate_created_idx/,
  );
  expect(sql).toMatch(/create index analysis_intakes_user_created_idx/);
  expect(sql).toMatch(/enable row level security/);
  expect(sql.match(/auth\.uid\(\) = user_id/g)).toHaveLength(5);
  expect(sql).not.toMatch(/for delete/);
  expect(sql).toMatch(
    /create function public\.create_analysis_reattempt\(\s*source_id uuid,\s*refreshed_snapshot jsonb\s*\)/,
  );
  expect(sql).toMatch(/security invoker/);
  expect(sql).toMatch(/for update/);
  expect(sql).toMatch(/pg_advisory_xact_lock/);
  expect(sql).toMatch(/max\(attempt\) \+ 1/);
  expect(sql).toMatch(/'ready',\s*source_id\s*\)/);
  expect(sql).toMatch(/refreshed_snapshot ->> 'title'/);
  expect(sql).toMatch(/refreshed_snapshot -> 'transcript_segments'/);
});

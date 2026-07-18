import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260718144057_den_25_result_state_and_shares.sql',
);

const sql = readFileSync(migrationPath, 'utf8');

describe('DEN-25 result persistence migration', () => {
  it('defines the constrained result state, flashcard review, and share tables', () => {
    expect(sql).toContain('create table public.analysis_result_states');
    expect(sql).toContain('create table public.analysis_flashcard_reviews');
    expect(sql).toContain('create table public.analysis_shares');
    expect(sql).toContain(
      "check (last_artifact in ('overview','summary','flashcards','timestamps','transcript','export'))",
    );
    expect(sql).toContain(
      "check (last_study_action in ('summary_opened','flashcards_reviewed','transcript_used'))",
    );
    expect(sql).toContain("check (rating in ('again','hard','got_it'))");
    expect(sql).toContain("check (token ~ '^[A-Za-z0-9_-]{43}$')");
  });

  it('enables RLS and requires authenticated intake ownership for writes', () => {
    expect(sql).toContain(
      'alter table public.analysis_result_states enable row level security',
    );
    expect(sql).toContain(
      'alter table public.analysis_flashcard_reviews enable row level security',
    );
    expect(sql).toContain(
      'alter table public.analysis_shares enable row level security',
    );
    expect(sql).toContain('using ((select auth.uid()) = user_id)');
    expect(sql).toContain('with check ((select auth.uid()) = user_id');
    expect(sql).toContain('from public.analysis_intakes');
    expect(sql).toContain('analysis_intakes.user_id = (select auth.uid())');
  });

  it('grants owner-scoped CRUD only to authenticated users', () => {
    expect(sql).toContain(
      'grant select, insert, update, delete on public.analysis_result_states to authenticated',
    );
    expect(sql).toContain(
      'grant select, insert, update, delete on public.analysis_flashcard_reviews to authenticated',
    );
    expect(sql).toContain(
      'grant select, insert, update, delete on public.analysis_shares to authenticated',
    );
    expect(sql).toContain(
      'revoke all on public.analysis_result_states from anon',
    );
    expect(sql).toContain(
      'revoke all on public.analysis_flashcard_reviews from anon',
    );
    expect(sql).toContain('revoke all on public.analysis_shares from anon');
    expect(sql).not.toMatch(/grant .*analysis_result_states.* to anon/);
    expect(sql).not.toMatch(/grant .*analysis_flashcard_reviews.* to anon/);
    expect(sql).not.toMatch(/grant .*analysis_shares.* to anon/);
  });

  it('adds mutable-row triggers and query indexes', () => {
    expect(sql).toContain(
      'for each row execute function public.set_updated_at()',
    );
    expect(sql).toContain('analysis_result_states_user_id_idx');
    expect(sql).toContain('analysis_result_states_analysis_id_idx');
    expect(sql).toContain('analysis_flashcard_reviews_user_id_idx');
    expect(sql).toContain('analysis_flashcard_reviews_analysis_id_idx');
    expect(sql).toContain('analysis_shares_user_id_idx');
    expect(sql).toContain('analysis_shares_analysis_id_idx');
    expect(sql).toContain('analysis_shares_active_token_idx');
  });
});

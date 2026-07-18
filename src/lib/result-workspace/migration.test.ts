import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260718144057_den_25_result_state_and_shares.sql',
);

const sql = readFileSync(migrationPath, 'utf8');

const tableNames = [
  'analysis_result_states',
  'analysis_flashcard_reviews',
  'analysis_shares',
] as const;

type TableName = (typeof tableNames)[number];
type PolicyOperation = 'select' | 'insert' | 'update' | 'delete';

const readTable = (table: TableName) => {
  const match = sql.match(
    new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`),
  );

  expect(match, `missing ${table} table`).not.toBeNull();
  return match?.[1] ?? '';
};

const readPolicy = (table: TableName, operation: PolicyOperation) => {
  const match = sql.match(
    new RegExp(
      `create policy "[^"]+"\\non public\\.${table} for ${operation}\\n[\\s\\S]*?;`,
    ),
  );

  expect(match, `missing ${operation} policy for ${table}`).not.toBeNull();
  return match?.[0] ?? '';
};

const expectOwnedIntakePredicate = (fragment: string, table: TableName) => {
  expect(fragment).toContain('(select auth.uid()) = user_id');
  expect(fragment).toContain('exists (');
  expect(fragment).toContain('from public.analysis_intakes');
  expect(fragment).toContain(`analysis_intakes.id = ${table}.analysis_id`);
  expect(fragment).toContain('analysis_intakes.user_id = (select auth.uid())');
};

describe('DEN-25 result persistence migration', () => {
  it('defines the exact constrained result state schema', () => {
    const table = readTable('analysis_result_states');

    expect(table).toContain(
      'analysis_id uuid not null references public.analysis_intakes(id) on delete cascade',
    );
    expect(table).toContain(
      'user_id uuid not null references auth.users(id) on delete cascade',
    );
    expect(table).toContain('favorite boolean not null default false');
    expect(table).toContain(
      'playback_position_ms bigint not null default 0 check (playback_position_ms >= 0)',
    );
    expect(table).toContain(
      "check (last_artifact in ('overview','summary','flashcards','timestamps','transcript','export'))",
    );
    expect(table).toContain(
      "check (last_study_action in ('summary_opened','flashcards_reviewed','transcript_used'))",
    );
    expect(table).toContain('primary key (analysis_id, user_id)');
  });

  it('defines the exact constrained flashcard review schema', () => {
    const table = readTable('analysis_flashcard_reviews');

    expect(table).toContain(
      'analysis_id uuid not null references public.analysis_intakes(id) on delete cascade',
    );
    expect(table).toContain(
      'user_id uuid not null references auth.users(id) on delete cascade',
    );
    expect(table).toContain(
      'card_index integer not null check (card_index >= 0)',
    );
    expect(table).toContain("check (rating in ('again','hard','got_it'))");
    expect(table).toContain(
      'primary key (analysis_id, user_id, artifact_revision, card_index)',
    );
  });

  it('defines the exact constrained share schema', () => {
    const table = readTable('analysis_shares');

    expect(table).toContain(
      "token text primary key check (token ~ '^[A-Za-z0-9_-]{43}$')",
    );
    expect(table).toContain(
      'analysis_id uuid not null references public.analysis_intakes(id) on delete cascade',
    );
    expect(table).toContain(
      'user_id uuid not null references auth.users(id) on delete cascade',
    );
    expect(table).toContain('unique (analysis_id, user_id)');
  });

  it.each(tableNames)('enables RLS on public.%s', (table) => {
    expect(sql).toContain(
      `alter table public.${table} enable row level security`,
    );
  });

  it.each(tableNames)(
    'requires authenticated intake ownership in every policy for public.%s',
    (table) => {
      for (const operation of ['select', 'insert', 'delete'] as const) {
        const policy = readPolicy(table, operation);

        expect(policy).toContain('to authenticated');
        expectOwnedIntakePredicate(policy, table);
      }

      const updatePolicy = readPolicy(table, 'update');
      const usingStart = updatePolicy.indexOf('using (');
      const withCheckStart = updatePolicy.indexOf('with check (');

      expect(updatePolicy).toContain('to authenticated');
      expect(usingStart).toBeGreaterThan(-1);
      expect(withCheckStart).toBeGreaterThan(usingStart);
      expectOwnedIntakePredicate(
        updatePolicy.slice(usingStart, withCheckStart),
        table,
      );
      expectOwnedIntakePredicate(updatePolicy.slice(withCheckStart), table);
    },
  );

  it.each(tableNames)(
    'resets public.%s privileges before granting authenticated CRUD only',
    (table) => {
      const revoke = `revoke all on public.${table} from PUBLIC, anon, authenticated;`;
      const grant = `grant select, insert, update, delete on public.${table} to authenticated;`;
      const grants = sql.match(
        new RegExp(`grant [^;]+ on public\\.${table} to [^;]+;`, 'g'),
      );

      expect(sql).toContain(revoke);
      expect(grants).toEqual([grant]);
      expect(sql.indexOf(revoke)).toBeLessThan(sql.indexOf(grant));
    },
  );

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

describe('DEN-25 ordered playback migration', () => {
  it('uses an authenticated security-invoker RPC with strictly monotonic writes', () => {
    const migrationsDirectory = join(process.cwd(), 'supabase', 'migrations');
    const filename = readdirSync(migrationsDirectory).find((entry) =>
      entry.endsWith('_den_25_ordered_playback_position.sql'),
    );

    expect(filename).toBeDefined();
    const orderedSql = readFileSync(
      join(migrationsDirectory, filename!),
      'utf8',
    );

    expect(orderedSql).toContain(
      'add column playback_revision bigint not null default 0',
    );
    expect(orderedSql).toContain('check (playback_revision >= 0)');
    expect(orderedSql).toContain(
      'create or replace function public.save_owned_playback_position',
    );
    expect(orderedSql).toContain('security invoker');
    expect(orderedSql).toContain('values (p_analysis_id, (select auth.uid())');
    expect(orderedSql).toContain(
      'excluded.playback_revision > analysis_result_states.playback_revision',
    );
    expect(orderedSql).toContain(
      'revoke all on function public.save_owned_playback_position(uuid, bigint, bigint) from PUBLIC, anon;',
    );
    expect(orderedSql).toContain(
      'grant execute on function public.save_owned_playback_position(uuid, bigint, bigint) to authenticated;',
    );
  });

  it('guards every direct playback update with a strict revision trigger', () => {
    const migrationsDirectory = join(process.cwd(), 'supabase', 'migrations');
    const filename = readdirSync(migrationsDirectory).find((entry) =>
      entry.endsWith('_den_25_ordered_playback_position.sql'),
    );
    const orderedSql = readFileSync(
      join(migrationsDirectory, filename!),
      'utf8',
    );

    expect(orderedSql).toContain(
      'create or replace function public.enforce_monotonic_playback_position()',
    );
    expect(orderedSql).toContain('security invoker');
    expect(orderedSql).toContain("set search_path = ''");
    expect(orderedSql).toContain(
      'if NEW.playback_revision <= OLD.playback_revision then',
    );
    expect(orderedSql).toContain("errcode = '23514'");
    expect(orderedSql).toContain(
      "constraint = 'analysis_result_states_playback_revision_monotonic'",
    );
    expect(orderedSql).toContain(
      'before update of playback_position_ms, playback_revision',
    );
    expect(orderedSql).toContain('on public.analysis_result_states');
    expect(orderedSql).toContain(
      'execute function public.enforce_monotonic_playback_position()',
    );
    expect(orderedSql).toContain(
      '-- Inserts have no prior row to compare; the nonnegative column check governs initial revisions.',
    );
  });
});

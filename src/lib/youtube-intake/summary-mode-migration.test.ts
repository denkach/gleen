import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('DEN-118 summary mode migration', () => {
  it('migrates legacy values while allowing deployment-overlap writes', async () => {
    const migration = await readFile(
      join(
        process.cwd(),
        'supabase/migrations/202608300001_den_118_summary_modes.sql',
      ),
      'utf8',
    );

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
    const migration = await readFile(
      join(
        process.cwd(),
        'supabase/migrations/202608300001_den_118_summary_modes.sql',
      ),
      'utf8',
    );

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
});

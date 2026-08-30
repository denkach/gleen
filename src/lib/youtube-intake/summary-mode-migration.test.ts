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
});

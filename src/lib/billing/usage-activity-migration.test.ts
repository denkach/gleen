import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('billing usage activity label migration', () => {
  it('joins labels through matching ledger, job, and intake owners', () => {
    const migrationDirectory = resolve(process.cwd(), 'supabase/migrations');
    const sql = readdirSync(migrationDirectory)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => readFileSync(resolve(migrationDirectory, file), 'utf8'))
      .join('\n')
      .toLowerCase();

    expect(sql).toContain('ledger.source');
    expect(sql).toContain('intake.title as analysis_title');
    expect(sql).toContain('intake.channel_title');
    expect(sql).toMatch(/job\.user_id\s*=\s*ledger\.user_id/);
    expect(sql).toMatch(/intake\.user_id\s*=\s*ledger\.user_id/);
    expect(sql).not.toContain('intake.canonical_url as');
  });
});

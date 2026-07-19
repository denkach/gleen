import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

import { createAdminSupabaseClient } from './admin';

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(path);
      return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
    }),
  );
  return nested.flat();
}

describe('Supabase admin client boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://gleen.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
    createClient.mockReturnValue({ privileged: true });
  });

  it('creates a direct non-persistent server client with the secret key', () => {
    expect(createAdminSupabaseClient()).toEqual({ privileged: true });
    expect(createClient).toHaveBeenCalledWith(
      'https://gleen.supabase.co',
      'sb_secret_test',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  });

  it('is explicitly server-only and unreachable from client module imports', async () => {
    const root = process.cwd();
    const adminSource = await readFile(
      join(root, 'src/lib/supabase/admin.ts'),
      'utf8',
    );
    expect(adminSource).toContain("import 'server-only'");
    expect(adminSource).not.toContain('@supabase/ssr');

    const files = await collectSourceFiles(join(root, 'src'));
    const clientSources = await Promise.all(
      files.map(async (path) => ({
        path,
        source: await readFile(path, 'utf8'),
      })),
    );
    const violations = clientSources
      .filter(({ source }) => /^['\"]use client['\"];?/m.test(source))
      .filter(({ source }) =>
        /(?:supabase\/admin|SUPABASE_SECRET_KEY)/.test(source),
      )
      .map(({ path }) => path.slice(root.length + 1));
    expect(violations).toEqual([]);
  });
});

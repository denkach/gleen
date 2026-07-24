import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('browser Supabase environment', () => {
  it('uses direct public env references that Next.js can inline in the client bundle', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/supabase/browser.ts'),
      'utf8',
    );

    expect(source).not.toContain('validatePublicEnv(process.env)');
    expect(source).toContain('process.env.NEXT_PUBLIC_APP_URL');
    expect(source).toContain('process.env.NEXT_PUBLIC_SUPABASE_URL');
    expect(source).toContain(
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  });
});

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const browserClientPath = join(process.cwd(), 'src/lib/supabase/browser.ts');
const serverClientPath = join(process.cwd(), 'src/lib/supabase/server.ts');

describe('Supabase client boundaries', () => {
  it('keeps privileged credentials out of the browser client', async () => {
    const source = await readFile(browserClientPath, 'utf8');

    expect(source).toContain('createBrowserClient');
    expect(source).not.toMatch(/SERVICE_ROLE|service_role/i);
  });

  it('adapts Next cookies through getAll and setAll', async () => {
    const source = await readFile(serverClientPath, 'utf8');

    expect(source).toContain('createServerClient');
    expect(source).toMatch(/getAll\(\)/);
    expect(source).toMatch(/setAll\(cookiesToSet\)/);
  });
});

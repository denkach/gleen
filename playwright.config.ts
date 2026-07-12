import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3000';
const testSupabaseUrl = 'https://gleen-test.supabase.co';
const testSupabaseKey = 'sb_publishable_test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: 'ui-production.spec.ts',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1',
    env: {
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_SUPABASE_URL: testSupabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: testSupabaseKey,
    },
    reuseExistingServer: !process.env.CI,
    url: baseURL,
  },
});

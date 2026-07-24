import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '3000';
const baseURL = `http://127.0.0.1:${port}`;
const testSupabaseUrl = 'https://gleen-test.supabase.co';
const testSupabaseKey = 'sb_publishable_test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: 'ui-production.spec.ts',
  snapshotPathTemplate:
    '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  retries: process.env.CI ? 2 : 0,
  expect: {
    toHaveScreenshot: {
      // Keep local design review strict while allowing only the stable font
      // rasterization delta between macOS baselines and Ubuntu CI Chromium.
      maxDiffPixelRatio: process.env.CI ? 0.025 : 0.002,
      threshold: 0.25,
    },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      grep: /durable/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_SUPABASE_URL: testSupabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: testSupabaseKey,
    },
    reuseExistingServer: !process.env.CI,
    url: baseURL,
  },
});

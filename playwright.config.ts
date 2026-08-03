import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '3000';
const baseURL = `http://127.0.0.1:${port}`;
const testSupabaseUrl = 'https://gleen-test.supabase.co';
const testSupabaseKey = 'sb_publishable_test';
const billingAuthFixtureToken =
  process.env.PLAYWRIGHT_AUTH_FIXTURE_TOKEN ??
  randomBytes(32).toString('base64url');
process.env.PLAYWRIGHT_AUTH_FIXTURE_TOKEN = billingAuthFixtureToken;

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: 'ui-production.spec.ts',
  // The shared development-fixture server and pixel baselines are deliberately
  // serialized so the repository gate exercises deterministic browser state.
  workers: 1,
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
      testIgnore: /billing\.visual\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_SUPABASE_URL: testSupabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: testSupabaseKey,
      PLAYWRIGHT_AUTH_FIXTURE_MODE: '1',
      PLAYWRIGHT_AUTH_FIXTURE_TOKEN: billingAuthFixtureToken,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_den20_fixture',
      STRIPE_SECRET_KEY: 'sk_test_den20_fixture',
      STRIPE_WEBHOOK_SECRET: 'whsec_den20_fixture',
      STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_test_den20_fixture',
      SUPABASE_SECRET_KEY: 'sb_secret_den20_fixture',
    },
    reuseExistingServer: !process.env.CI,
    url: baseURL,
  },
});

import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'ui-production.spec.ts',
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
    command:
      'npm run build && npm run start -- --hostname 127.0.0.1 --port 3100',
    env: {
      NEXT_PUBLIC_APP_URL: baseURL,
    },
    reuseExistingServer: false,
    timeout: 180_000,
    url: baseURL,
  },
});

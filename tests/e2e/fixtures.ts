import { expect, test as base } from '@playwright/test';

export { expect } from '@playwright/test';

const expectedBrowserDiagnostics = [
  'Permissions policy violation: compute-pressure is not allowed in this document.',
] as const;

export const test = base.extend<{ browserErrors: void }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          !expectedBrowserDiagnostics.includes(
            message.text() as (typeof expectedBrowserDiagnostics)[number],
          )
        )
          errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));

      await use();

      expect(
        errors,
        'unexpected console errors or uncaught page errors',
      ).toEqual([]);
    },
    { auto: true },
  ],
});

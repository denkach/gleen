import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

const screens = [
  ['subscription', 'active', 'Subscription'],
  ['usage', 'empty-usage', 'Usage ledger'],
  ['checkout', 'active', 'Checkout'],
  ['portal', 'past-due', 'Billing portal'],
  ['invoices', 'failed-invoice', 'Invoices'],
  ['limit-reached', 'limit-reached', 'Analysis limit reached'],
] as const;

async function capture(
  page: Page,
  screen: (typeof screens)[number][0],
  state: (typeof screens)[number][1],
  heading: (typeof screens)[number][2],
  viewport: { width: number; height: number },
  name: string,
) {
  await page.setViewportSize(viewport);
  const response = await page.goto(
    `/billing-fixture/${screen}?state=${state}`,
    { waitUntil: 'networkidle' },
  );
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 1, name: heading }),
  ).toBeVisible();
  const experience = page.locator('.billing-experience');
  await expect(experience).toBeVisible();
  await expect
    .poll(async () => {
      const box = await experience.boundingBox();
      return box !== null && box.width > 0 && box.height > 0;
    })
    .toBe(true);
  await page.locator('nextjs-portal').evaluateAll((portals) => {
    for (const portal of portals) {
      if (!portal.querySelector('[role="dialog"]')) {
        (portal as HTMLElement).style.setProperty(
          'display',
          'none',
          'important',
        );
      }
    }
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(
    page.locator(
      '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
    ),
  ).toHaveCount(0);
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
  });
}

for (const [screen, state, heading] of screens) {
  test(`1440x900 desktop ${screen} ${state}`, async ({ page }) => {
    await capture(
      page,
      screen,
      state,
      heading,
      { width: 1440, height: 900 },
      `den-20-1440x900-desktop-${screen}-${state}.png`,
    );
  });

  test(`durable 412x839 Pixel 7 ${screen} ${state}`, async ({ page }) => {
    await capture(
      page,
      screen,
      state,
      heading,
      { width: 412, height: 839 },
      `den-20-412x839-pixel7-${screen}-${state}.png`,
    );
  });
}

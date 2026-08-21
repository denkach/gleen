import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

const screens = [
  ['subscription', 'active', 'Subscription'],
  ['subscription', 'error', 'Subscription'],
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
  const isDen29Reference = screen === 'subscription' && state === 'error';
  const response = await page.goto(
    `/billing-fixture/${screen}?state=${state}${isDen29Reference ? '&locale=ru&accountReference=1' : ''}`,
    { waitUntil: 'networkidle' },
  );
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: isDen29Reference ? 'Подписка' : heading,
    }),
  ).toBeVisible();
  await expect(page.getByTestId('billing-fixture-hydrated')).toHaveText('true');
  if (viewport.width <= 760) {
    const activeNavigationItem = isDen29Reference
      ? page.getByRole('link', { name: 'Подписка', exact: true })
      : screen === 'subscription'
        ? page.getByRole('link', { name: 'Plan', exact: true })
        : screen === 'usage'
          ? page.getByRole('link', { name: 'Usage', exact: true })
          : page.getByRole('button', { name: 'More billing screens' });
    await expect(activeNavigationItem).toHaveAttribute('aria-current', 'page');
  }
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
    maxDiffPixelRatio: isDen29Reference
      ? viewport.width <= 760
        ? 0.022
        : 0.012
      : undefined,
  });
}

for (const [screen, state, heading] of screens) {
  const isDen29Reference = screen === 'subscription' && state === 'error';
  const desktopViewport = isDen29Reference
    ? { width: 1600, height: 1000 }
    : { width: 1440, height: 900 };
  const mobileViewport = isDen29Reference
    ? { width: 390, height: 853 }
    : { width: 412, height: 839 };

  test(`${desktopViewport.width}x${desktopViewport.height} desktop ${screen} ${state}`, async ({
    page,
  }) => {
    await capture(
      page,
      screen,
      state,
      heading,
      desktopViewport,
      isDen29Reference
        ? 'den-29-1600x1000-desktop-subscription-error.png'
        : `den-20-1440x900-desktop-${screen}-${state}.png`,
    );
  });

  test(`durable ${mobileViewport.width}x${mobileViewport.height} mobile ${screen} ${state}`, async ({
    page,
  }) => {
    await capture(
      page,
      screen,
      state,
      heading,
      mobileViewport,
      isDen29Reference
        ? 'den-29-390x853-mobile-subscription-error.png'
        : `den-20-412x839-pixel7-${screen}-${state}.png`,
    );
  });
}

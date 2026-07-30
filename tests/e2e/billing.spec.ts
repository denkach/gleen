import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';

const billingFixtures = [
  ['subscription', 'active', 'Subscription'],
  ['usage', 'empty-usage', 'Usage ledger'],
  ['checkout', 'active', 'Checkout'],
  ['portal', 'past-due', 'Billing portal'],
  ['invoices', 'failed-invoice', 'Invoices'],
  ['limit-reached', 'limit-reached', 'Analysis limit reached'],
] as const;

const protectedBillingRoutes = [
  '/app/subscription',
  '/app/subscription/usage',
  '/app/subscription/checkout?plan=prism-pro&interval=year',
  '/app/subscription/portal',
  '/app/subscription/invoices',
  '/app/subscription/limit-reached',
] as const;

async function openFixture(
  page: Page,
  screen: (typeof billingFixtures)[number][0],
  state: (typeof billingFixtures)[number][1],
  boundary?: string,
) {
  const query = new URLSearchParams({ state });
  if (boundary !== undefined) query.set('testBoundary', boundary);
  const response = await page.goto(
    `/billing-fixture/${screen}?${query.toString()}`,
    { waitUntil: 'domcontentloaded' },
  );
  expect(response?.status()).toBe(200);
  await expect(page.locator('.billing-experience')).toBeVisible();
}

async function focusOrder(page: Page, count: number) {
  const order: string[] = [];
  for (let index = 0; index < count; index += 1) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) return '';
        return (
          active.getAttribute('aria-label') ??
          active.textContent?.trim().replace(/\s+/g, ' ') ??
          ''
        );
      }),
    );
  }
  return order;
}

async function expectFocusContained(dialog: Locator) {
  const focusableCount = await dialog
    .locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    .count();
  expect(focusableCount).toBeGreaterThan(1);
  for (let index = 0; index <= focusableCount; index += 1) {
    await dialog.page().keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);
  }
}

test('keeps every deterministic fixture preview-only and owner-safe routes authenticated', async ({
  page,
  request,
}) => {
  for (const [screen, state, heading] of billingFixtures) {
    await openFixture(page, screen, state);
    await expect(
      page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible();
  }

  const invalid = await request.get(
    '/billing-fixture/checkout?state=failed-invoice',
  );
  expect(invalid.status()).toBe(404);

  for (const route of protectedBillingRoutes) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/session-expired$/);
  }
});

test('switches monthly and yearly prices with annual totals and closed checkout query units', async ({
  page,
}) => {
  await openFixture(page, 'subscription', 'active');

  const starter = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Starter' }) });
  const prism = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Prism Pro' }) });
  await expect(starter.locator('.billing-price')).toContainText('$19.00');
  await expect(prism.locator('.billing-price')).toContainText('$49.00');

  await page.getByRole('button', { name: 'Yearly billing' }).click();
  await expect(starter.locator('.billing-price')).toContainText('$15.00');
  await expect(prism.locator('.billing-price')).toContainText('$39.00');
  await expect(
    page.getByRole('link', { name: 'Choose Prism Pro' }),
  ).toHaveAttribute(
    'href',
    '/app/subscription/checkout?plan=prism-pro&interval=year',
  );
  await expect(page.locator('.billing-summary')).toContainText('$180.00');
  await expect(page.locator('.billing-summary')).toContainText('/ year');
});

test('applies usage search, event, and date filters, preserves pagination, and exports a safe closed CSV payload', async ({
  page,
}) => {
  await openFixture(page, 'usage', 'active', 'usage-actions');
  await page
    .getByRole('searchbox', { name: 'Search usage events' })
    .fill('=SUM(A1:A2)');
  await page.getByLabel('Date range').selectOption('last90');
  await page.getByLabel('Event type').selectOption('technical_retry');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(
    /\/billing-fixture\/usage\?.*search=%3DSUM%28A1%3AA2%29.*range=last90.*eventType=technical_retry/,
  );

  await openFixture(page, 'usage', 'active', 'usage-actions');
  await page.goto(
    '/billing-fixture/usage?state=active&testBoundary=usage-actions&search=%3DSUM%28A1%3AA2%29&range=last90&eventType=technical_retry',
  );
  await expect(page.getByRole('link', { name: 'Next page' })).toHaveAttribute(
    'href',
    /search=%3DSUM%28A1%3AA2%29/,
  );
  await expect(page.getByRole('link', { name: 'Next page' })).toHaveAttribute(
    'href',
    /eventType=technical_retry/,
  );
  await expect(page.getByRole('link', { name: 'Next page' })).toHaveAttribute(
    'href',
    /range=last90/,
  );

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const artifact = await download;
  expect(artifact.suggestedFilename()).toBe('gleen-usage.csv');
  await expect(page.getByTestId('billing-boundary-payload')).toHaveText(
    JSON.stringify({
      search: '=SUM(A1:A2)',
      eventType: 'technical_retry',
      periodStart: '2025-05-01T00:00:00.000Z',
      periodEnd: '2025-08-01T00:00:00.000Z',
    }),
  );
  const payload = await page
    .getByTestId('billing-boundary-payload')
    .textContent();
  expect(payload).not.toMatch(/user|customer|stripe|price|card/i);
  expect(await artifact.createReadStream()).not.toBeNull();
});

test('submits only plan and interval at the checkout boundary and renders no fixture Stripe iframe', async ({
  page,
}) => {
  await openFixture(page, 'checkout', 'active', 'checkout-action');
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(
    page.getByText('Secure payment form is disabled in this visual fixture.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start Prism Pro' }).click();
  await expect(page.getByTestId('billing-boundary-payload')).toHaveText(
    JSON.stringify({ plan: 'prism-pro', interval: 'month' }),
  );
  const payload = await page
    .getByTestId('billing-boundary-payload')
    .textContent();
  expect(payload).not.toMatch(
    /user|email|identity|customer|price_|card|cvc|expiry/i,
  );
});

test('creates one fresh Portal action per intent, blocks concurrency, and exposes recoverable errors', async ({
  page,
}) => {
  await openFixture(page, 'portal', 'active', 'portal-actions');
  const update = page.getByRole('button', { name: 'Update payment method' });
  await update.dblclick();
  await expect(page.getByTestId('billing-boundary-count')).toHaveText('1');
  await expect(page.getByTestId('billing-boundary-opened')).toHaveText(
    'https://billing.stripe.test/session/1',
  );
  await page.getByRole('button', { name: 'Manage plan' }).click();
  await expect(page.getByTestId('billing-boundary-count')).toHaveText('2');
  await expect(page.getByTestId('billing-boundary-opened')).toHaveText(
    'https://billing.stripe.test/session/2',
  );

  await openFixture(page, 'portal', 'active', 'portal-error');
  await page.getByRole('button', { name: 'Manage cancellation' }).click();
  await expect(
    page.locator('.billing-inline-error[role="alert"]'),
  ).toContainText('Stripe’s billing portal could not be opened.');
  await expect(
    page.getByRole('region', { name: 'Billing portal' }),
  ).toHaveAttribute('aria-busy', 'false');
});

test('closes invoice filters, year, pagination and actions to safe HTTPS links', async ({
  page,
}) => {
  await openFixture(page, 'invoices', 'active', 'invoice-actions');
  await page
    .getByRole('searchbox', { name: 'Search invoices' })
    .fill('GL-2025');
  await page.getByLabel('Invoice status').selectOption('paid');
  await page.getByLabel('Invoice year').selectOption('2025');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(
    /\/billing-fixture\/invoices\?.*search=GL-2025.*status=paid.*year=2025/,
  );
  await page.goto(
    '/billing-fixture/invoices?state=active&testBoundary=invoice-actions&search=GL-2025&status=paid&year=2025',
  );
  await expect(page.getByRole('link', { name: 'Next page' })).toHaveAttribute(
    'href',
    /cursor=25/,
  );
  for (const link of await page
    .locator('.billing-invoice-actions a')
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute('href')),
    )) {
    expect(link).toMatch(/^https:\/\//);
  }
  await expect(
    page.getByText('http://insecure.example.test', { exact: false }),
  ).toHaveCount(0);
});

test('keeps limit recovery links explicit and production guard redirects without leaking state', async ({
  page,
}) => {
  await openFixture(page, 'limit-reached', 'limit-reached');
  await expect(
    page.getByRole('link', { name: 'Upgrade to Prism Pro' }),
  ).toHaveAttribute('href', '/app/subscription');
  await expect(
    page.getByRole('link', { name: /Open usage ledger/ }),
  ).toHaveAttribute('href', '/app/subscription/usage');
  await expect(
    page.getByRole('button', { name: 'Buy extra credits' }),
  ).toBeDisabled();

  await page.goto('/app/subscription/limit-reached');
  await expect(page).toHaveURL(/\/session-expired$/);
  await expect(page.getByText(/analyses used/)).toHaveCount(0);
});

test('keeps a deterministic keyboard focus order through billing controls', async ({
  page,
}) => {
  await openFixture(page, 'subscription', 'active');
  expect(await focusOrder(page, 5)).toEqual([
    'Skip to content',
    'Gleen home',
    'New analysis',
    'History',
    'Subscription',
  ]);
  await page.getByRole('button', { name: 'Yearly billing' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Manage plan' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Choose Prism Pro' }),
  ).toBeFocused();
});

test('durable mobile billing sheet traps focus, closes with Escape, and restores the More trigger', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await openFixture(page, 'subscription', 'active');
  const trigger = page.getByRole('button', { name: 'More billing screens' });
  await trigger.focus();
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'More billing screens' });
  await expect(sheet).toBeVisible();
  await expectFocusContained(sheet);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('durable billing screens have no horizontal overflow at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const [screen, state] of billingFixtures) {
    await openFixture(page, screen, state);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth ===
          document.documentElement.clientWidth,
      ),
      `${screen} overflowed at 320px`,
    ).toBe(true);
  }
});

test('durable reduced motion removes billing transitions and animated progress without hiding state', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page, 'limit-reached', 'limit-reached');
  expect(
    await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  ).toBe(true);
  for (const selector of [
    '.billing-experience',
    '.billing-limit-progress span',
    '.billing-button',
  ]) {
    const motion = await page
      .locator(selector)
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration,
          scrollBehavior: getComputedStyle(document.documentElement)
            .scrollBehavior,
        };
      });
    expect(motion.animationName).toBe('none');
    expect(Number.parseFloat(motion.animationDuration)).toBeLessThanOrEqual(
      0.001,
    );
    expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(
      0.001,
    );
    expect(motion.scrollBehavior).toBe('auto');
  }
  await expect(
    page.getByRole('heading', { name: 'Analysis limit reached' }),
  ).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '10',
  );
});

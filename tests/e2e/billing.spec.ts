import type { Locator, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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

const billingAuthFixtureToken = process.env.PLAYWRIGHT_AUTH_FIXTURE_TOKEN;
if (billingAuthFixtureToken === undefined) {
  throw new Error('Playwright billing auth fixture token was not initialized');
}

const authenticatedOwner = {
  cookie: 'gleen-billing-e2e-session',
  token: billingAuthFixtureToken,
  id: '22222222-2222-4222-8222-222222222222',
  email: 'billing-owner@example.test',
} as const;

async function openFixture(
  page: Page,
  screen: (typeof billingFixtures)[number][0],
  state: (typeof billingFixtures)[number][1] | 'free',
  boundary?: string,
  locale?: 'uk' | 'ru' | 'en' | 'es' | 'de',
) {
  const query = new URLSearchParams({ state });
  if (boundary !== undefined) query.set('testBoundary', boundary);
  if (locale !== undefined) query.set('locale', locale);
  const response = await page.goto(
    `/billing-fixture/${screen}?${query.toString()}`,
    { waitUntil: 'domcontentloaded' },
  );
  expect(response?.status()).toBe(200);
  await expect(page.locator('.billing-experience')).toBeVisible();
  await expect(page.getByTestId('billing-fixture-hydrated')).toHaveText('true');
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

  await page.context().addCookies([
    {
      name: authenticatedOwner.cookie,
      value: authenticatedOwner.token,
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  for (const [index, route] of protectedBillingRoutes.entries()) {
    if (route.startsWith('/app/subscription/checkout')) {
      const response = await request.get(route, {
        headers: {
          cookie: `${authenticatedOwner.cookie}=${encodeURIComponent(
            authenticatedOwner.token,
          )}`,
        },
      });
      expect(response.status(), route).toBe(200);
      const html = await response.text();
      const renderedHtml = html.replace(
        /<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi,
        '',
      );
      expect(html).toContain('Checkout');
      expect(html).toContain(authenticatedOwner.email);
      expect(renderedHtml).not.toMatch(/temporarily unavailable/i);
      expect(html).not.toContain('foreign-owner@example.test');
      continue;
    }
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), route).toBe(200);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: billingFixtures[index]![2],
      }),
    ).toBeVisible();
    await expect(page.getByText(authenticatedOwner.email)).toBeVisible();
    await expect(
      page.getByRole('banner').getByText('0 analyses left'),
    ).toBeVisible();
    await expect(page.getByText(/temporarily unavailable/i)).toHaveCount(0);
    await expect(page.getByText('foreign-owner@example.test')).toHaveCount(0);
  }
});

test('switches monthly and yearly prices with annual totals and closed plan-change query units', async ({
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
    page.getByRole('link', { name: 'Change to Prism Pro' }),
  ).toHaveAttribute(
    'href',
    '/app/subscription/portal?plan=prism-pro&interval=year',
  );
  await expect(page.locator('.billing-summary')).toContainText('$180.00');
  await expect(page.locator('.billing-summary')).toContainText('/ year');

  await openFixture(page, 'subscription', 'free');
  await expect(
    page.getByRole('link', { name: 'Choose Starter' }),
  ).toHaveAttribute(
    'href',
    '/app/subscription/checkout?plan=starter&interval=month',
  );
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
  const path = await artifact.path();
  expect(path).not.toBeNull();
  const csv = await readFile(path!, 'utf8');
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"\'=SUM(A1:A2)"');
  expect(csv).not.toMatch(/(?:^|\r?\n)[=+@-]/);
});

test('submits only plan and interval at the checkout boundary and renders no fixture Stripe iframe', async ({
  page,
}) => {
  await openFixture(page, 'checkout', 'active', 'checkout-action');
  await expect(page.locator('iframe')).toHaveCount(0);
  const paymentPreview = page.getByRole('group', {
    name: 'Secure Stripe payment preview',
  });
  await expect(paymentPreview).toBeVisible();
  await expect(paymentPreview.locator('input, select, iframe')).toHaveCount(0);
  for (const copy of [
    'you@example.com',
    '1234 1234 1234 1234',
    'MM / YY',
    'CVC',
    'United States',
    'e.g. EU123456789',
  ]) {
    await expect(
      paymentPreview.locator('b').filter({ hasText: copy }),
    ).toBeVisible();
  }
  await expect(
    page.getByText('Have a promo code?', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('All transactions are secure')).toBeVisible();
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

test('splits Portal upgrade, downgrade, cancellation, concurrency, and retry boundaries', async ({
  page,
}) => {
  await openFixture(page, 'portal', 'active', 'portal-upgrade');
  await page.getByRole('button', { name: 'Confirm plan change' }).dblclick();
  await expect(page.getByTestId('billing-boundary-count')).toHaveText('1');
  await expect(page.getByTestId('billing-boundary-payload')).toHaveText(
    JSON.stringify({ plan: 'prism-pro', interval: 'year' }),
  );
  await expect(page.getByTestId('billing-boundary-opened')).toHaveText(
    'https://billing.stripe.test/session/1',
  );

  await openFixture(page, 'portal', 'active', 'portal-downgrade');
  await page.getByRole('button', { name: 'Confirm plan change' }).dblclick();
  await expect(page.getByTestId('billing-boundary-payload')).toHaveText(
    JSON.stringify({ plan: 'starter', interval: 'month' }),
  );
  await expect(page.getByTestId('billing-boundary-count')).toHaveText('1');
  await expect(page.getByTestId('billing-boundary-opened')).toHaveText('');
  await expect(
    page.getByRole('region', { name: 'Billing portal' }).getByRole('status'),
  ).toHaveText(
    'Starter is scheduled for 1 Aug 2026. Your Prism Pro access remains active until then.',
  );
  await expect(
    page.getByRole('button', { name: 'Cancel scheduled downgrade' }),
  ).toBeEnabled();

  await openFixture(page, 'portal', 'active', 'portal-cancel');
  await expect(page.getByTestId('billing-boundary-payload')).toHaveText('');
  await page
    .getByRole('button', { name: 'Cancel scheduled downgrade' })
    .dblclick();
  await expect(page.getByTestId('billing-boundary-count')).toHaveText('1');
  await expect(page.getByTestId('billing-boundary-payload')).toHaveText('[]');
  await expect(page.getByTestId('billing-boundary-opened')).toHaveText('');
  await expect(
    page.getByRole('region', { name: 'Billing portal' }).getByRole('status'),
  ).toHaveText(
    'Scheduled downgrade canceled. Your current plan remains active.',
  );
  await expect(
    page.getByRole('button', { name: 'Cancel scheduled downgrade' }),
  ).toHaveCount(0);

  await openFixture(page, 'portal', 'active', 'portal-error');
  await page.getByRole('button', { name: 'Confirm plan change' }).click();
  await expect(page.locator('.billing-inline-error[role="alert"]')).toHaveText(
    'We couldn’t update your billing settings. Please try again.',
  );
  await expect(page.getByText(/sub_sched|price_|customer|secret/i)).toHaveCount(
    0,
  );
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

  await page.context().addCookies([
    {
      name: authenticatedOwner.cookie,
      value: authenticatedOwner.token,
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/app-shell-fixture?intake=usage-limit');
  await page
    .getByRole('textbox', { name: 'YouTube URL' })
    .fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Analyze video' }).click();

  await expect(page).toHaveURL(/\/app\/subscription\/limit-reached$/);
  await expect(
    page.getByRole('heading', { name: 'Analysis limit reached' }),
  ).toBeVisible();
  await expect(page.getByText(/10.*analyses used/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Buy extra credits' }),
  ).toBeDisabled();
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
    page.getByRole('link', { name: 'Change to Prism Pro' }),
  ).toBeFocused();
});

test('keeps scheduled plan controls keyboard operable', async ({ page }) => {
  await openFixture(page, 'portal', 'active', 'portal-downgrade');
  const confirm = page.getByRole('button', { name: 'Confirm plan change' });
  await confirm.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('region', { name: 'Billing portal' }).getByRole('status'),
  ).toHaveText(
    'Starter is scheduled for 1 Aug 2026. Your Prism Pro access remains active until then.',
  );

  await openFixture(page, 'portal', 'active', 'portal-cancel');
  const cancel = page.getByRole('button', {
    name: 'Cancel scheduled downgrade',
  });
  await cancel.focus();
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Space');
  const status = page
    .getByRole('region', { name: 'Billing portal' })
    .getByRole('status');
  await expect(status).toHaveText(
    'Scheduled downgrade canceled. Your current plan remains active.',
  );
  await expect(status).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Update payment method' }),
  ).toBeFocused();
});

test('durable mobile billing sheet traps focus, closes with Escape, and restores the More trigger', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await openFixture(page, 'subscription', 'active');
  const trigger = page.getByRole('button', { name: 'More billing screens' });
  await expect(
    page.getByRole('link', { name: 'Plan', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('link', { name: 'Plan', exact: true }).locator('svg'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Usage', exact: true }).locator('svg'),
  ).toBeVisible();
  await expect(trigger.locator('svg')).toBeVisible();
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
  for (const boundary of ['portal-downgrade', 'portal-cancel'] as const) {
    await openFixture(page, 'portal', 'active', boundary);
    if (boundary === 'portal-downgrade') {
      await page.getByRole('button', { name: 'Confirm plan change' }).click();
      await expect(
        page
          .getByRole('region', { name: 'Billing portal' })
          .getByRole('status'),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth ===
          document.documentElement.clientWidth,
      ),
      `${boundary} overflowed at 320px`,
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

  await openFixture(page, 'portal', 'active', 'portal-downgrade');
  await page.getByRole('button', { name: 'Confirm plan change' }).click();
  const scheduledStatus = page
    .getByRole('region', { name: 'Billing portal' })
    .getByRole('status');
  await expect(scheduledStatus).toHaveText(
    'Starter is scheduled for 1 Aug 2026. Your Prism Pro access remains active until then.',
  );
  const scheduledMotion = await scheduledStatus.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      transitionDuration: style.transitionDuration,
    };
  });
  expect(scheduledMotion.animationName).toBe('none');
  expect(
    Number.parseFloat(scheduledMotion.animationDuration),
  ).toBeLessThanOrEqual(0.001);
  expect(
    Number.parseFloat(scheduledMotion.transitionDuration),
  ).toBeLessThanOrEqual(0.001);
});

test('@localization durable German and Spanish billing copy fits narrow responsive layouts with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const fixture of [
    { locale: 'de', width: 320, heading: 'Abonnement' },
    { locale: 'es', width: 412, heading: 'Suscripción' },
  ] as const) {
    await page.setViewportSize({ width: fixture.width, height: 839 });
    await openFixture(
      page,
      'subscription',
      'active',
      undefined,
      fixture.locale,
    );

    await expect(
      page.getByRole('heading', { level: 1, name: fixture.heading }),
    ).toBeVisible();
    await expect(page.locator('.billing-current-ribbon')).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth ===
          document.documentElement.clientWidth,
      ),
      `${fixture.locale} overflowed at ${fixture.width}px`,
    ).toBe(true);
    expect(
      await page
        .locator('.billing-plan-card.current')
        .evaluate((card) => getComputedStyle(card, '::before').content),
    ).toBe('none');
    expect(
      await page
        .locator('.billing-current-ribbon')
        .evaluate((ribbon) => getComputedStyle(ribbon).transitionDuration),
    ).toBe('0s');
  }
});

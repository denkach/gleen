import { expect, test } from './fixtures';

const ownerRoute = '/app-shell-fixture/app/video/result-den-25';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem('gleen:share-fixture-initialized')) {
      window.localStorage.removeItem('gleen:result-share-fixture');
      window.sessionStorage.setItem('gleen:share-fixture-initialized', 'true');
    }
    const events: unknown[] = [];
    window.addEventListener('gleen:analytics', (event) => {
      events.push((event as CustomEvent).detail);
    });
    Object.assign(window, { __shareAnalytics: events });
  });
});

test('creates an anonymous read-only result and revokes it to the neutral unavailable state', async ({
  page,
}) => {
  const malformedResponse = await page.request.get('/share/bad');
  expect(malformedResponse.status()).toBe(404);
  expect(malformedResponse.headers()['referrer-policy']).toBe('no-referrer');
  expect(malformedResponse.headers()['cache-control']).not.toMatch(
    /(?:^|,)\s*(?:public|s-maxage)/i,
  );

  await page.goto(ownerRoute, { waitUntil: 'domcontentloaded' });
  await page.locator('[aria-label="Video source"] iframe').waitFor();

  await page.getByRole('button', { name: 'Share result' }).first().click();
  await page.getByRole('button', { name: 'Create public link' }).click();
  const publicLink = await page.getByLabel('Public link').inputValue();
  expect(publicLink).toContain(
    '/app-shell-fixture/app/video/result-den-25-public',
  );

  await page.goto(publicLink, { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByText('This read-only result was shared with you'),
  ).toBeVisible();
  await expect(page.getByLabel('Video source')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share result' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: /favorites/i })).toHaveCount(0);
  await expect(page.getByLabel('Result title')).toHaveCount(0);
  await expect(page.getByText('Recommended next')).toHaveCount(0);
  await expect(page.getByText('test@example.com')).toHaveCount(0);

  await page.goto(ownerRoute, { waitUntil: 'domcontentloaded' });
  await page.locator('[aria-label="Video source"] iframe').waitFor();
  await page.getByRole('button', { name: 'Share result' }).first().click();
  await page.getByRole('button', { name: 'Create public link' }).click();
  await page.getByRole('button', { name: 'Revoke link' }).click();
  await expect(page.getByRole('status')).toContainText('Link revoked');

  const analytics = await page.evaluate(
    () =>
      (window as Window & { __shareAnalytics?: unknown[] }).__shareAnalytics,
  );
  expect(JSON.stringify(analytics)).not.toContain(publicLink);

  await page.goto(publicLink, { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'This shared result is unavailable' }),
  ).toBeVisible();
  await expect(
    page.getByText('This link is invalid or has been revoked'),
  ).toBeVisible();
  await expect(page.getByLabel('Video source')).toHaveCount(0);
});

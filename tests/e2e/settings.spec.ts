import { expect, test } from './fixtures';

const authTokenInput = process.env.PLAYWRIGHT_AUTH_FIXTURE_TOKEN;
const origin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '3000'}`;

if (authTokenInput === undefined) {
  throw new Error('Playwright authenticated fixture token was not initialized');
}
const authToken: string = authTokenInput;

async function authenticate(page: import('@playwright/test').Page) {
  await page.context().addCookies([
    {
      name: 'gleen-billing-e2e-session',
      value: authToken,
      url: origin,
      sameSite: 'Lax',
    },
    {
      name: 'gleen_locale',
      value: 'en',
      url: origin,
      sameSite: 'Lax',
    },
  ]);
}

test('Account Atlas stays usable across desktop, tablet, mobile, and reduced motion', async ({
  page,
}) => {
  await authenticate(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const response = await page.goto('/app/settings', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible();

    const atlas = page.getByRole('navigation', { name: 'Settings sections' });
    await expect(atlas.getByRole('link')).toHaveCount(6);
    await expect(
      atlas.getByRole('link', { name: /Preferences/u }),
    ).toHaveAttribute('href', '/app/settings/preferences');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await atlas
        .getByRole('link')
        .first()
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).transitionDuration),
        ),
    ).toBeLessThanOrEqual(0.001);
  }

  await page
    .getByRole('navigation', { name: 'Settings sections' })
    .getByRole('link', { name: /Preferences/u })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Preferences' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Back to Settings' }),
  ).toBeVisible();
});

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

    const firstCard = atlas.getByRole('link').first();
    const cardPresentation = await firstCard.evaluate((element) => {
      const card = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      const icon = element
        .querySelector('.settings-destination-card__icon')
        ?.getBoundingClientRect();
      const description = element.querySelector(
        '.settings-destination-card__description',
      );

      return {
        display: styles.display,
        iconHeight: icon?.height,
        iconWidth: icon?.width,
        padding: styles.padding,
        height: card.height,
        descriptionDisplay: description
          ? getComputedStyle(description).display
          : 'missing',
      };
    });

    expect(cardPresentation.display).toBe('block');
    expect(cardPresentation.iconHeight).toBe(44);
    expect(cardPresentation.iconWidth).toBe(44);
    expect(cardPresentation.descriptionDisplay).not.toBe('none');
    if (viewport.width <= 720) {
      expect(cardPresentation.padding).toBe('18px');
      expect(cardPresentation.height).toBeGreaterThanOrEqual(154);
    } else {
      expect(cardPresentation.padding).toBe('22px');
      expect(cardPresentation.height).toBeGreaterThanOrEqual(190);
    }
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

test('every Settings destination uses the approved v4 panel composition', async ({
  page,
}) => {
  await authenticate(page);
  await page.setViewportSize({ width: 1440, height: 1000 });

  for (const destination of [
    'profile',
    'preferences',
    'language',
    'integrations',
    'security',
    'data',
  ]) {
    const response = await page.goto(`/app/settings/${destination}`, {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('link', { name: 'Back to Settings' }),
    ).toBeVisible();
    await expect(page.locator('.settings-subnav')).toHaveCount(0);
    await expect(page.locator('.settings-panel').first()).toBeVisible();

    const panelPresentation = await page
      .locator('.settings-panel')
      .first()
      .evaluate((element) => {
        const styles = getComputedStyle(element);
        const header = element.querySelector(
          '.settings-panel__head',
        ) as HTMLElement | null;
        return {
          borderRadius: styles.borderRadius,
          headerPadding: header ? getComputedStyle(header).padding : 'missing',
        };
      });

    expect(panelPresentation.borderRadius).toBe('16px');
    expect(panelPresentation.headerPadding).toBe('22px 24px');
  }
});

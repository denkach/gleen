import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';

const fixturePath = '/app-shell-fixture';

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function expectBoxAtLeast(locator: Locator, minimum: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(minimum);
  expect(box!.height).toBeGreaterThanOrEqual(minimum);
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900, sidebarWidth: 242 },
  { name: 'wide tablet', width: 1024, height: 768, sidebarWidth: 242 },
  { name: 'collapsed tablet', width: 980, height: 768, sidebarWidth: 82 },
  { name: 'mobile', width: 390, height: 844, sidebarWidth: 0 },
] as const) {
  test(`matches the approved app shell at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto(fixturePath);

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', {
        name: 'Turn a video into something useful.',
      }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const sidebar = page.locator('.sidebar');
    const mobileTopbar = page.locator('.mobile-topbar');
    const bottomNav = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    if (viewport.name === 'mobile') {
      await expect(sidebar).toBeHidden();
      await expect(mobileTopbar).toBeVisible();
      await expect(bottomNav).toBeVisible();
      await expect(bottomNav).toHaveCSS('position', 'fixed');
    } else {
      await expect(sidebar).toBeVisible();
      await expect(sidebar).toHaveCSS('width', `${viewport.sidebarWidth}px`);
      await expect(sidebar).toHaveCSS('position', 'fixed');
      await expect(sidebar).toHaveCSS('top', '0px');
      await expect(sidebar).toHaveCSS('left', '0px');
      await expect(mobileTopbar).toBeHidden();
      await expect(bottomNav).toBeHidden();
    }
  });
}

test('keeps mobile navigation fixed, safe-area aware, and clear of content', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fixturePath);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const result = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('.bottom-nav')!;
    const shell = document.querySelector<HTMLElement>('.app-shell')!;
    const lastContent = document.querySelector<HTMLElement>('.dashboard-grid')!;
    const navStyle = getComputedStyle(nav);
    const sheetText = [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .join('\n');
    return {
      bottom: navStyle.bottom,
      position: navStyle.position,
      shellPaddingBottom: Number.parseFloat(
        getComputedStyle(shell).paddingBottom,
      ),
      navHeight: nav.getBoundingClientRect().height,
      lastContentBottom: lastContent.getBoundingClientRect().bottom,
      navTop: nav.getBoundingClientRect().top,
      safeAreaRule:
        /\.bottom-nav\s*{[^}]*padding-bottom:\s*env\(safe-area-inset-bottom\)/.test(
          sheetText,
        ),
    };
  });

  expect(result.position).toBe('fixed');
  expect(result.bottom).toBe('0px');
  expect(result.safeAreaRule).toBe(true);
  expect(result.shellPaddingBottom).toBeGreaterThanOrEqual(result.navHeight);
  expect(result.lastContentBottom).toBeLessThanOrEqual(result.navTop);
});

test('marks New active in desktop and mobile navigation', async ({ page }) => {
  await page.goto(fixturePath);

  const newLink = page
    .getByRole('navigation', { name: 'Application navigation' })
    .getByRole('link', { name: 'New analysis' });
  await expect(newLink).toHaveAttribute('aria-current', 'page');
  expect(
    await newLink.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).not.toBe('rgba(0, 0, 0, 0)');
  expect(
    await newLink.evaluate(
      (element) => getComputedStyle(element, '::before').content,
    ),
  ).not.toBe('none');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileNewLink = page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'New analysis' });
  await expect(mobileNewLink).toBeVisible();
  await expect(mobileNewLink).toHaveAttribute('aria-current', 'page');
  expect(
    await mobileNewLink
      .locator('.app-icon')
      .evaluate((element) => getComputedStyle(element).filter),
  ).not.toBe('none');
});

test('renders representative sprite icons as approved strokes without fills', async ({
  page,
}) => {
  await page.goto(fixturePath);

  for (const icon of [
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'New analysis' })
      .locator('.app-icon'),
    page.locator('.app-beam-form .app-icon').first(),
    page.locator('.advanced-link .app-icon'),
  ]) {
    const style = await icon.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        color: computed.color,
        fill: computed.fill,
        stroke: computed.stroke,
        strokeWidth: computed.strokeWidth,
        strokeLinecap: computed.strokeLinecap,
        strokeLinejoin: computed.strokeLinejoin,
      };
    });
    expect(style.fill).toBe('none');
    expect(style.stroke).toBe(style.color);
    expect(style.strokeWidth).toBe('1.7px');
    expect(style.strokeLinecap).toBe('round');
    expect(style.strokeLinejoin).toBe('round');
  }
});

test('moves keyboard focus from the skip link to main content', async ({
  page,
}) => {
  await page.goto(fixturePath);
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test.describe('coarse-pointer shell navigation', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('keeps every visible navigation target at least 44px', async ({
    page,
  }) => {
    await page.goto(fixturePath);
    expect(
      await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
    ).toBe(true);

    const links = page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link');
    await expect(links).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expectBoxAtLeast(links.nth(index), 44);
    }
  });
});

test('removes shell animations for reduced motion without hiding content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixturePath);

  await expect(page.locator('.sidebar')).toHaveCSS('animation-name', 'none');
  const newLink = page
    .getByRole('navigation', { name: 'Application navigation' })
    .getByRole('link', { name: 'New analysis' });
  expect(
    await newLink.evaluate(
      (element) => getComputedStyle(element, '::after').animationName,
    ),
  ).toBe('none');
  await expect(
    page.getByRole('heading', {
      name: 'Turn a video into something useful.',
    }),
  ).toBeVisible();
  await expect(newLink).toHaveAttribute('aria-current', 'page');
});

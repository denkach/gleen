import { expect, test } from './fixtures';

const route = (visualCase: string) =>
  `/app-shell-fixture/history?visualCase=${visualCase}`;

async function capture(
  page: import('@playwright/test').Page,
  visualCase: string,
  width: number,
  height: number,
  name: string,
) {
  await page.setViewportSize({ width, height });
  await page.goto(route(visualCase), { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'History' })).toHaveAttribute(
    'data-history-hydrated',
    'true',
    { timeout: 15_000 },
  );
  await page.locator('nextjs-portal').evaluateAll((portals) => {
    for (const portal of portals) {
      if (!portal.querySelector('[role="dialog"], [role="menu"]')) {
        (portal as HTMLElement).style.setProperty(
          'display',
          'none',
          'important',
        );
      }
    }
  });
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'initial',
  });
}

for (const visualCase of ['default', 'duplicate', 'filters', 'sort'] as const) {
  test(`1680 desktop ${visualCase}`, async ({ page }) => {
    await capture(
      page,
      visualCase,
      1680,
      944,
      `den-19-1680x944-desktop-${visualCase}.png`,
    );
  });
}

test('980 tablet default', async ({ page }) => {
  await capture(
    page,
    'default',
    980,
    1100,
    'den-19-980x1100-tablet-default.png',
  );
});

for (const viewport of [
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
] as const) {
  test(`durable ${viewport.width} mobile list`, async ({ page }) => {
    await capture(
      page,
      'default',
      viewport.width,
      viewport.height,
      `den-19-${viewport.width}x${viewport.height}-mobile-list.png`,
    );
  });
}

test('durable 430 mobile filter sheet', async ({ page }) => {
  await capture(page, 'filters', 430, 932, 'den-19-430x932-mobile-filters.png');
});

for (const visualCase of ['rename', 'delete', 'partial'] as const) {
  test(`desktop ${visualCase}`, async ({ page }) => {
    await capture(
      page,
      visualCase,
      1680,
      944,
      `den-19-1680x944-desktop-${visualCase}.png`,
    );
  });
}

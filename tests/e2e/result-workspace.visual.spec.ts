import { expect, test } from './fixtures';

const fixtureRoute = '/app-shell-fixture/app/video/result-den-25#overview';

const mobileViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const;

const overviewViewports = [
  ...mobileViewports.map((viewport) => ({
    ...viewport,
    mode: 'mobile' as const,
  })),
  { width: 768, height: 1024, mode: 'tablet' as const },
  { width: 1440, height: 900, mode: 'desktop' as const },
  { width: 1920, height: 1080, mode: 'desktop' as const },
] as const;

async function openFixture(page: import('@playwright/test').Page) {
  await page.goto(fixtureRoute, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('result-layout')).toBeVisible();
  await expect(page.locator('[data-fixture-player-mount]')).toHaveCount(1);
  await expect(
    page.locator('[aria-label="Video source"] iframe'),
  ).toBeVisible();
}

async function capture(page: import('@playwright/test').Page, name: string) {
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    mask: [page.locator('[aria-label="Video source"] iframe')],
    maskColor: '#05070b',
  });
}

for (const viewport of overviewViewports) {
  test(`${viewport.width}x${viewport.height} ${viewport.mode} Overview`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openFixture(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(
      page,
      `den-25-${viewport.width}x${viewport.height}-${viewport.mode}-overview.png`,
    );
  });
}

for (const viewport of mobileViewports) {
  test(`${viewport.width}x${viewport.height} mobile result states`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openFixture(page);

    const workspace = page.getByLabel('Analysis artifacts');
    await workspace.scrollIntoViewIfNeeded();
    const miniPlayer = page.getByTestId('mobile-mini-player');
    await expect(miniPlayer).toBeVisible();
    await capture(
      page,
      `den-25-${viewport.width}x${viewport.height}-mobile-mini-player.png`,
    );

    await miniPlayer.getByRole('button', { name: 'Chapters' }).click();
    await expect(page.getByRole('dialog', { name: 'Chapters' })).toBeVisible();
    await capture(
      page,
      `den-25-${viewport.width}x${viewport.height}-mobile-chapters-sheet.png`,
    );
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    const mobileNavigation = page.locator('.result-mobile-navigation');
    await mobileNavigation.getByRole('button', { name: 'More' }).click();
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible();
    await capture(
      page,
      `den-25-${viewport.width}x${viewport.height}-mobile-more-sheet.png`,
    );

    await page
      .getByRole('dialog', { name: 'More' })
      .getByRole('button', { name: 'Transcript' })
      .click();
    await expect(
      page.getByRole('tabpanel', { name: 'Transcript' }),
    ).toBeVisible();
    await expect(miniPlayer).toBeVisible();
    await capture(
      page,
      `den-25-${viewport.width}x${viewport.height}-mobile-transcript-mini.png`,
    );
  });
}

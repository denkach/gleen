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
  await page
    .locator('nextjs-portal')
    .evaluateAll((portals) =>
      portals.forEach((portal) =>
        (portal as HTMLElement).style.setProperty(
          'display',
          'none',
          'important',
        ),
      ),
    );
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    mask: [page.locator('[aria-label="Video source"] iframe')],
    maskColor: '#05070b',
  });
}

async function expectSheetAboveMobileChrome(
  page: import('@playwright/test').Page,
) {
  const layers = await page.evaluate(() => {
    const zIndex = (selector: string) => {
      const element = document.querySelector(selector);

      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing layer: ${selector}`);
      }

      return Number.parseInt(window.getComputedStyle(element).zIndex, 10);
    };

    return {
      dialog: zIndex('.result-sheet'),
      miniPlayer: zIndex('.result-mobile-mini-player'),
      navigation: zIndex('.result-mobile-navigation'),
      overlay: zIndex('.ui-dialog-overlay'),
    };
  });

  expect(layers.overlay).toBeGreaterThan(layers.miniPlayer);
  expect(layers.overlay).toBeGreaterThan(layers.navigation);
  expect(layers.dialog).toBeGreaterThan(layers.miniPlayer);
  expect(layers.dialog).toBeGreaterThan(layers.navigation);

  const mobileChromeIsInert = await page.evaluate(() => {
    const selectors = [
      '.result-mobile-mini-player',
      '.result-mobile-navigation',
    ];

    return selectors.every((selector) => {
      const element = document.querySelector(selector);

      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      const hitTarget = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );

      return Boolean(hitTarget?.closest('.result-sheet, .ui-dialog-overlay'));
    });
  });

  expect(mobileChromeIsInert).toBe(true);
}

for (const viewport of overviewViewports) {
  test(`${viewport.width}x${viewport.height} ${viewport.mode} Overview`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openFixture(page);
    await page.evaluate(() => window.scrollTo(0, 0));

    if (viewport.width >= 1440) {
      const tabs = page.locator('.result-navigation [role="tablist"]');
      const exportTab = tabs.getByRole('tab', { name: 'Export' });
      const [tabsBox, exportBox] = await Promise.all([
        tabs.boundingBox(),
        exportTab.boundingBox(),
      ]);

      expect(tabsBox).not.toBeNull();
      expect(exportBox).not.toBeNull();
      expect(exportBox!.x + exportBox!.width).toBeLessThanOrEqual(
        tabsBox!.x + tabsBox!.width,
      );
    }

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
    const chaptersSheet = page.getByRole('dialog', { name: 'Chapters' });
    await expect(chaptersSheet).toBeVisible();
    await expectSheetAboveMobileChrome(page);
    await capture(
      page,
      `den-25-${viewport.width}x${viewport.height}-mobile-chapters-sheet.png`,
    );
    const lastChapter = chaptersSheet.getByRole('button').last();
    await lastChapter.scrollIntoViewIfNeeded();
    await lastChapter.click({ trial: true });
    const chaptersClose = chaptersSheet.getByRole('button', {
      name: 'Close',
      exact: true,
    });
    await chaptersClose.scrollIntoViewIfNeeded();
    await chaptersClose.click({ trial: true });
    await chaptersClose.click();

    const mobileNavigation = page.locator('.result-mobile-navigation');
    await mobileNavigation.getByRole('button', { name: 'More' }).click();
    const moreSheet = page.getByRole('dialog', { name: 'More' });
    await expect(moreSheet).toBeVisible();
    await expectSheetAboveMobileChrome(page);
    await capture(
      page,
      `den-25-${viewport.width}x${viewport.height}-mobile-more-sheet.png`,
    );

    const exportDestination = moreSheet.getByRole('button', {
      name: 'Export',
    });
    await exportDestination.scrollIntoViewIfNeeded();
    await exportDestination.click({ trial: true });
    const moreClose = moreSheet.getByRole('button', {
      name: 'Close',
      exact: true,
    });
    await moreClose.scrollIntoViewIfNeeded();
    await moreClose.click({ trial: true });

    await moreSheet.getByRole('button', { name: 'Transcript' }).click();
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

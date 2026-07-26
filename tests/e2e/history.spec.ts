import { expect, test } from './fixtures';

const fixture = (parameters = '') =>
  `/app-shell-fixture/history?visualCase=default${parameters}`;

async function waitForHistoryHydration(page: import('@playwright/test').Page) {
  await expect(page.getByRole('region', { name: 'History' })).toHaveAttribute(
    'data-history-hydrated',
    'true',
    { timeout: 15_000 },
  );
}

async function openHistory(
  page: import('@playwright/test').Page,
  parameters = '',
) {
  await page.goto(fixture(parameters), { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await waitForHistoryHydration(page);
  if ((page.viewportSize()?.width ?? 0) <= 720) {
    await expect(page.getByTestId('history-mobile-list')).toBeVisible();
  }
}

async function visibleTitles(page: import('@playwright/test').Page) {
  return page
    .locator('.history-row__title:visible, .history-card__title:visible')
    .allTextContents();
}

test.describe('DEN-19 History durable behavior', () => {
  test('durable applied query controls results and Back/Forward restores the complete view', async ({
    page,
  }) => {
    await openHistory(page);
    const allTitles = await visibleTitles(page);
    expect(allTitles).toHaveLength(6);

    await page.getByRole('button', { name: /Filter/ }).click();
    const filters = page.getByText('Status').locator('..');
    await filters.getByText('Ready', { exact: true }).click();
    await expect(page).not.toHaveURL(/status=/);
    expect(await visibleTitles(page)).toEqual(allTitles);
    if ((page.viewportSize()?.width ?? 0) <= 720) {
      await expect(
        page.getByText('0 filters applied', { exact: true }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole('button', { name: /Filters?, none applied/ }),
      ).toBeVisible();
    }

    await page.getByRole('button', { name: 'Apply filters (1)' }).click();
    await expect(page).toHaveURL(/status=ready/);
    await waitForHistoryHydration(page);
    const readyNewest = [
      'How to Learn Anything Faster — The Science of Effective Learning',
      'The Hidden Structure of Great Explanations',
      'A Practical Introduction to Systems Thinking',
      'The Art of Focus in a Noisy World',
    ];
    expect(await visibleTitles(page)).toEqual(readyNewest);
    await expect(
      page.getByRole('button', { name: /Filters?, 1 applied/ }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Sort history/ }).click();
    await page.getByRole('menuitem', { name: 'Oldest' }).click();
    await expect(page).toHaveURL(/sort=oldest/);
    await waitForHistoryHydration(page);
    const readyOldest = [...readyNewest].reverse();
    expect(await visibleTitles(page)).toEqual(readyOldest);
    await expect(
      page.getByRole('button', { name: 'Sort history: Oldest' }),
    ).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Search history' });
    await search.fill('the');
    await search.press('Enter');
    await expect(page).toHaveURL(/q=the/);
    await waitForHistoryHydration(page);
    const searchedOldest = [
      'The Art of Focus in a Noisy World',
      'The Hidden Structure of Great Explanations',
      'How to Learn Anything Faster — The Science of Effective Learning',
    ];
    expect(await visibleTitles(page)).toEqual(searchedOldest);

    await page.goBack();
    await waitForHistoryHydration(page);
    await expect(search).toHaveValue('');
    await expect(
      page.getByRole('button', { name: /Filters?, 1 applied/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sort history: Oldest' }),
    ).toBeVisible();
    expect(await visibleTitles(page)).toEqual(readyOldest);
    await page.getByRole('button', { name: /Filters?, 1 applied/ }).click();
    await expect(page.getByRole('checkbox', { name: 'Ready' })).toBeChecked();
    await page.keyboard.press('Escape');

    await page.goForward();
    await waitForHistoryHydration(page);
    await expect(search).toHaveValue('the');
    await expect(
      page.getByRole('button', { name: /Filters?, 1 applied/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sort history: Oldest' }),
    ).toBeVisible();
    expect(await visibleTitles(page)).toEqual(searchedOldest);
  });

  test('durable favorite success and rollback fixture', async ({ page }) => {
    await openHistory(page);
    const favorite = page.locator('.history-item-actions__favorite').first();
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');

    await openHistory(page, '&fixtureAction=favorite-failure');
    const rejectedFavorite = page
      .locator('.history-item-actions__favorite')
      .first();
    await rejectedFavorite.click();
    await expect(rejectedFavorite).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('status')).toContainText(
      'Favorite could not be saved.',
    );
  });

  test('durable rename and delete confirmation mutate fixture rows', async ({
    page,
  }) => {
    await openHistory(page);
    const title =
      'How to Learn Anything Faster — The Science of Effective Learning';
    const actions = page.getByRole('button', { name: `Actions for ${title}` });

    await actions.click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const rename = page.getByRole('dialog', { name: 'Rename saved analysis' });
    await rename.getByLabel('Title').fill('  A calmer title  ');
    await rename.getByRole('button', { name: 'Save title' }).click();
    await expect(
      page.getByRole('link', { name: 'A calmer title', exact: true }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: 'Actions for A calmer title' })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const deletion = page.getByRole('dialog', {
      name: 'Delete saved analysis?',
    });
    await deletion.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      page.getByRole('link', { name: 'A calmer title', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Actions for A calmer title' })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete analysis' }).click();
    await expect(
      page.getByRole('link', { name: 'A calmer title', exact: true }),
    ).toHaveCount(0);
  });

  test('durable Load more appends and grid remains disabled', async ({
    page,
  }) => {
    await openHistory(page, '&fixtureAction=load-more');
    await expect(
      page.getByRole('button', { name: 'Grid view unavailable' }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.getByText('A seventh saved analysis')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(
      0,
    );
  });

  test('durable duplicate reuse opens the existing result without reanalysis', async ({
    page,
  }) => {
    await page.goto('/app-shell-fixture/history?visualCase=duplicate');
    await waitForHistoryHydration(page);
    await page.evaluate(() => window.sessionStorage.clear());
    await page
      .getByRole('complementary', { name: 'Saved analysis available' })
      .getByRole('link', { name: 'Open saved result' })
      .click();
    await expect(page).toHaveURL(
      /history\/destination\?historyAction=open-saved/,
    );
    await expect(
      page.getByTestId('history-existing-result-destination'),
    ).toContainText('No new analysis was started.');
    expect(
      await page.evaluate(
        () =>
          window.sessionStorage.getItem('historyFixtureReanalysisCount') ?? '0',
      ),
    ).toBe('0');
    expect(
      await page.evaluate(
        () => window.sessionStorage.getItem('historyFixtureIntakeCount') ?? '0',
      ),
    ).toBe('0');
  });

  test('durable duplicate reanalysis invokes exactly one reanalysis path', async ({
    page,
  }) => {
    await page.goto('/app-shell-fixture/history?visualCase=duplicate');
    await waitForHistoryHydration(page);
    await page.evaluate(() => window.sessionStorage.clear());
    const banner = page.getByRole('complementary', {
      name: 'Saved analysis available',
    });
    await banner
      .getByRole('button', { name: 'Analyze another version' })
      .click();
    await expect(page).toHaveURL(/\/app\/video\/|\/session-expired/, {
      timeout: 15_000,
    });
    expect(
      await page.evaluate(() =>
        window.sessionStorage.getItem('historyFixtureReanalysisCount'),
      ),
    ).toBe('1');
    expect(
      await page.evaluate(() =>
        window.sessionStorage.getItem('historyFixtureIntakeCount'),
      ),
    ).toBe('1');
  });

  test('durable keyboard dismissal restores filter focus', async ({ page }) => {
    await openHistory(page);
    const filterTrigger = page.getByRole('button', { name: /Filter/ });
    await filterTrigger.focus();
    await filterTrigger.click();
    await page.keyboard.press('Escape');
    await expect(filterTrigger).toBeFocused();
  });

  test('durable accessibility at zoom, reduced motion, and 320px', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 568 });
    await openHistory(page);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth ===
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const motionDurations = await page
      .locator('.history-card')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.animationDuration, style.transitionDuration].map(
          (duration) => Number.parseFloat(duration),
        );
      });
    expect(Math.max(...motionDurations)).toBeLessThanOrEqual(0.001);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 640,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await openHistory(page);
    const zoomEvidence = await page.evaluate(() => ({
      cssViewportWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio,
      physicalViewportWidth: window.innerWidth * window.devicePixelRatio,
    }));
    expect(zoomEvidence).toEqual({
      cssViewportWidth: 640,
      devicePixelRatio: 2,
      physicalViewportWidth: 1280,
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth ===
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    for (const locator of [
      page.getByRole('searchbox', { name: 'Search history' }),
      page.getByRole('button', { name: /Filter/ }),
      page.getByRole('button', { name: /Sort history/ }),
      page.locator('.history-item-status').first(),
      page.locator('.history-item-actions').first(),
    ]) {
      await expect(locator).toBeVisible();
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(640);
    }
    await cdp.send('Emulation.clearDeviceMetricsOverride');
  });

  test('durable 1280 toolbar remains separated and container-safe', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openHistory(page);
    const [searchBox, controlsBox] = await Promise.all([
      page.locator('.history-toolbar__search').boundingBox(),
      page.locator('.history-toolbar__controls').boundingBox(),
    ]);
    expect(searchBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(searchBox!.x + searchBox!.width).toBeLessThanOrEqual(controlsBox!.x);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth ===
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});

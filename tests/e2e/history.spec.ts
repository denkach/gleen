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

test.describe('DEN-19 History durable behavior', () => {
  test('durable search, filter, sort, and Back/Forward restore URL state', async ({
    page,
  }) => {
    await openHistory(page);

    await page.getByRole('searchbox', { name: 'Search history' }).fill('calm');
    await page
      .getByRole('searchbox', { name: 'Search history' })
      .press('Enter');
    await expect(page).toHaveURL(/q=calm/);
    await waitForHistoryHydration(page);

    await page.getByRole('button', { name: /Filter/ }).click();
    const filters = page.getByText('Status').locator('..');
    await filters.getByText('Ready', { exact: true }).click();
    await page.getByRole('button', { name: 'Apply filters (1)' }).click();
    await expect(page).toHaveURL(/status=ready/);
    await waitForHistoryHydration(page);

    await page.getByRole('button', { name: /Sort history/ }).click();
    await page.getByRole('menuitem', { name: 'Oldest' }).click();
    await expect(page).toHaveURL(/sort=oldest/);
    await waitForHistoryHydration(page);
    await page.goBack();
    await expect(page).not.toHaveURL(/sort=oldest/);
    await page.goForward();
    await expect(page).toHaveURL(/sort=oldest/);
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

  test('durable duplicate reuse and keyboard dismissal restore focus', async ({
    page,
  }) => {
    await page.goto('/app-shell-fixture/history?visualCase=duplicate');
    const banner = page.getByRole('complementary', {
      name: 'Saved analysis available',
    });
    await expect(
      banner.getByRole('link', { name: 'Open saved result' }),
    ).toHaveAttribute('href', /\/app\/video\//);

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

    // 200% browser zoom exposes half of a 1280px-wide desktop CSS viewport.
    await page.setViewportSize({ width: 640, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth ===
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});

import { expect, test } from './fixtures';

test('durable recent analyses and monthly usage match the approved responsive layout', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000, stacked: false },
    { width: 1024, height: 900, stacked: true },
    { width: 390, height: 844, stacked: true },
  ]) {
    await page.setViewportSize(viewport);
    const response = await page.goto('/app-shell-fixture');
    expect(response?.ok()).toBe(true);

    const recent = page.getByRole('region', { name: 'Recent analyses' });
    const monthly = page.getByRole('complementary', { name: 'This month' });
    await expect(recent.locator('.recent-analysis-row')).toHaveCount(3);
    await expect(monthly.locator('.monthly-usage-card__count')).toContainText(
      '22 / 50',
    );
    await expect(monthly.locator('.monthly-usage-chart__bar')).toHaveCount(14);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const recentBox = await recent.boundingBox();
    const monthlyBox = await monthly.boundingBox();
    expect(recentBox).not.toBeNull();
    expect(monthlyBox).not.toBeNull();
    if (viewport.stacked) {
      expect(monthlyBox!.y).toBeGreaterThan(recentBox!.y + recentBox!.height);
    } else {
      expect(Math.abs(monthlyBox!.y - recentBox!.y)).toBeLessThan(2);
      expect(monthlyBox!.width).toBeCloseTo(330, 0);
    }
  }

  const latestBar = page.locator('.monthly-usage-chart__bar').last();
  await latestBar.focus();
  await expect(latestBar.locator('[role="tooltip"]')).toHaveCSS('opacity', '1');
});

test('durable dashboard removes decorative motion when reduced motion is requested', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app-shell-fixture');

  await expect(page.locator('.monthly-usage-chart__bar').first()).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.locator('.recent-analysis-row').first()).toBeVisible();
});

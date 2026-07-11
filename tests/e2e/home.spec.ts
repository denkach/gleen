import { expect, test } from './fixtures';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`renders the approved landing at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto('/');

    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle('Gleen — Watch less. Understand more.');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Watch less\.\s*Understand more\./,
      }),
    ).toBeVisible();
    await expect(page.locator('main > section')).toHaveCount(4);
    await expect(page.locator('.facet-panel')).toHaveCount(4);
    await expect(page.locator('.plan-card')).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(await page.locator('audio,[autoplay]').count()).toBe(0);
  });
}

test('runs the approved BeamInput and scroll motion', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1_200);
  await expect(page.locator('.artifact-float.is-emitted')).toHaveCount(4);

  await page.getByRole('button', { name: 'Transform video' }).click();
  await expect(page.locator('.beam-form')).toHaveClass(/is-processing/);
  await expect(page.locator('.prism-stage')).toHaveClass(/is-transforming/);
  await expect(page.getByRole('button', { name: 'Refracting…' })).toBeVisible();

  await page.locator('.process-scene').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect(
    await page
      .locator('.process-scene')
      .evaluate((element) =>
        Number(getComputedStyle(element).getPropertyValue('--beam-progress')),
      ),
  ).toBeGreaterThan(0);
  expect(await page.locator('.process-step.is-lit').count()).toBeGreaterThan(0);
});

test('keeps all content visible with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.landing-reference')).toHaveClass(/reduce-motion/);
  await expect(page.locator('.artifact-float.is-emitted')).toHaveCount(4);
  await expect(page.locator('.motion-cursor')).toHaveCount(0);
  expect(
    await page
      .locator('[data-reveal]')
      .evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).opacity !== '0'),
      ),
  ).toBe(true);
});

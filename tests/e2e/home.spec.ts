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

test('aligns the BeamInput with its action on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const form = page.locator('.beam-form');
  const input = form.locator('input');
  const icon = form.locator('.link-icon');
  const button = form.getByRole('button', { name: 'Transform video' });

  await expect(form).toHaveCSS('padding', '7px');
  await expect(input).toHaveCSS('height', '48px');
  await expect(input).toHaveCSS('padding-right', '12px');
  await expect(icon).toHaveCSS('top', '31px');

  const [formBox, inputBox, iconBox, buttonBox] = await Promise.all([
    form.boundingBox(),
    input.boundingBox(),
    icon.boundingBox(),
    button.boundingBox(),
  ]);

  expect(formBox).not.toBeNull();
  expect(inputBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox?.x).toBe((inputBox?.x ?? 0) + 6);
  expect(buttonBox?.width).toBe((inputBox?.width ?? 0) - 12);
  expect(inputBox?.x).toBe((formBox?.x ?? 0) + 8);
});

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

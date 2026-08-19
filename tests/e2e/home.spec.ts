import { expect, test } from './fixtures';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

const mobileMenuViewports = [
  { name: 'compact mobile', width: 320, height: 568 },
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

for (const viewport of mobileMenuViewports) {
  test(`@localization opens and dismisses the landing menu at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const trigger = page.getByRole('button', { name: 'Open menu' });
    const headerControls = [
      page.locator('.site-header .locale-switcher__trigger'),
      page
        .locator('.site-header')
        .getByRole('link', { name: 'Start free', exact: true }),
      trigger,
    ];
    for (const control of headerControls) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);

    const focusableControls = dialog.locator('a[href], button:not([disabled])');
    const firstFocusable = focusableControls.first();
    const lastFocusable = focusableControls.last();
    await firstFocusable.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(lastFocusable).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(firstFocusable).toBeFocused();

    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    const linkHeights = await dialog
      .getByRole('link')
      .evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect().height),
      );
    expect(linkHeights.every((height) => height >= 44)).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.mouse.click(2, viewport.height - 2);
    await expect(dialog).toBeHidden();
  });
}

test('@localization closes the landing menu after navigating to Pricing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Open menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  await dialog.getByRole('link', { name: 'Pricing' }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#pricing$/);
  await expect(page.locator('#pricing')).toBeInViewport();
});

test('@localization keeps landing menu state changes immediate with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();

  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  for (const selector of [
    '.landing-mobile-menu',
    'body:has(.landing-mobile-menu) > .ui-dialog-overlay',
  ]) {
    expect(['0.001ms', '1e-06s']).toContain(
      await page
        .locator(selector)
        .evaluate((element) => getComputedStyle(element).animationDuration),
    );
  }
});

test('routes a valid BeamInput through the secure sign-in continuation', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('YouTube URL').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Transform video' }).click();

  await expect(page).toHaveURL(/\/sign-in\?next=/);
  const next = new URL(page.url()).searchParams.get('next');
  expect(next).toBe(
    '/app?continuation=' +
      encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  );
});

test('runs the approved landing scroll motion', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1_200);
  await expect(page.locator('.artifact-float.is-emitted')).toHaveCount(4);

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

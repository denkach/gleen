import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test('serves the development preview with noindex', async ({ page }) => {
  const response = await page.goto('/ui');

  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Gleen UI primitives' }),
  ).toBeVisible();
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`has no horizontal overflow at the ${viewport.name} viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/ui');

    await expectNoHorizontalOverflow(page);
    await expect(page.getByLabel('Long panel content example')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(
        `${viewport.name}-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  });
}

test('shows visible focus for keyboard navigation', async ({ page }) => {
  await page.goto('/ui');
  await page.keyboard.press('Tab');

  const focused = page.locator(':focus-visible');
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(outline.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(outline.outlineWidth)).toBeGreaterThan(0);
  expect(outline.outlineColor).not.toBe('transparent');
  expect(outline.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(outline.outlineColor).not.toBe(outline.backgroundColor);
});

test('contains dialog focus, closes with Escape, and returns focus', async ({
  page,
}) => {
  await page.goto('/ui');
  const trigger = page.getByRole('button', { name: 'Open example dialog' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Example dialog' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await expect(
    dialog.getByRole('button', { name: 'Close dialog' }),
  ).toBeFocused();
  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('supports dropdown arrow, Enter, Escape, and focus return', async ({
  page,
}) => {
  await page.goto('/ui');
  const trigger = page.getByRole('button', { name: 'Open example menu' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('menuitem', { name: 'Available item' }),
  ).toHaveAttribute('data-highlighted', '');
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('menuitemcheckbox', { name: 'Checked option' }),
  ).toHaveAttribute('data-highlighted', '');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('moves tabs with ArrowRight and activates the focused tab', async ({
  page,
}) => {
  await page.goto('/ui');
  const tablist = page.getByRole('tablist', { name: 'neutral example tabs' });
  const first = tablist.getByRole('tab', { name: 'First' });
  const second = tablist.getByRole('tab', { name: 'Second' });
  await first.focus();
  await page.keyboard.press('ArrowRight');

  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Second tab content').first()).toBeVisible();
});

test('shows tooltip content when its trigger receives focus', async ({
  page,
}) => {
  await page.goto('/ui');
  await page.getByRole('button', { name: 'Focus for tooltip' }).focus();

  await expect(page.getByRole('tooltip')).toHaveText(
    'Keyboard and pointer guidance',
  );
});

test('runs a toast action and supports explicit dismissal', async ({
  page,
}) => {
  await page.goto('/ui');
  await page.getByRole('button', { name: 'Show error toast' }).click();
  const errorToast = page
    .getByText('Error notification', { exact: true })
    .locator('xpath=ancestor::li');
  await expect(errorToast).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(
    page.getByRole('status', { name: 'Toast action result' }),
  ).toHaveText('Retry action invoked');
  await expect(errorToast).toBeHidden();

  await page.getByRole('button', { name: 'Show neutral toast' }).click();
  const neutralToast = page
    .getByText('Neutral notification', { exact: true })
    .locator('xpath=ancestor::li');
  await expect(neutralToast).toBeVisible();
  await neutralToast
    .getByRole('button', { name: 'Dismiss notification' })
    .click();
  await expect(neutralToast).toBeHidden();
});

test('honors reduced motion while keeping long fixtures visible and usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ui');

  expect(
    await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  ).toBe(true);
  await expect(page.getByTestId('reduced-motion-indicator')).toContainText(
    'Reduced motion: on',
  );
  await expect(page.getByLabel('Long panel content example')).toBeVisible();
  await page.getByRole('button', { name: 'Open long dialog' }).click();
  await expect(
    page.getByRole('dialog', {
      name: 'Long dialog title that demonstrates wrapping in a constrained overlay',
    }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

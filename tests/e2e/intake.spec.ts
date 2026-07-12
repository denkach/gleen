import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';

const videoUrl = 'https://youtu.be/dQw4w9WgXcQ';

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function submit(page: Page) {
  await page.getByLabel('YouTube URL').fill(videoUrl);
  await page.getByRole('button', { name: 'Analyze video' }).click();
}

async function atLeast44(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

test('chooses artifacts, prevents double submit, announces pending, and opens readiness', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?intake=ready');
  await page.getByLabel('YouTube URL').fill(videoUrl);
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Flashcards' }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Analyze video' }).dblclick();
  await expect(page.getByRole('button', { name: 'Analyzing…' })).toBeDisabled();
  await expect(
    page
      .getByRole('status', { name: '' })
      .filter({ hasText: 'Analyzing video' }),
  ).toBeAttached();
  await expect(page).toHaveURL(/\/app\/video\//);
  await expect(page.getByText('Ready for processing')).toBeVisible();
});

test('detects an exact duplicate, opens existing, and confirms re-analysis', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?intake=duplicate');
  await submit(page);
  await expect(
    page.getByRole('heading', { name: 'You already analyzed this video.' }),
  ).toBeVisible();
  await expect(page.getByText('No credits will be used.')).toBeVisible();
  const existing = page.getByRole('link', { name: 'Open saved result' });
  await expect(existing).toHaveAttribute('href', /\/app\/video\//);
  await page.getByRole('button', { name: 'Analyze again' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Analyze this video again?' }),
  ).toContainText('A new processing attempt will be created.');
  await page.getByRole('button', { name: 'Confirm analysis' }).click();
  await expect(page).toHaveURL(/\/app\/video\/4444/);
  await expect(page.getByText('Ready for processing')).toBeVisible();
});

for (const [scenario, rawUrl, message] of [
  ['invalid-url', 'https://example.com/video', 'Enter a supported YouTube URL'],
  ['video-unavailable', videoUrl, 'private or unavailable'],
  ['transcript-unavailable', videoUrl, 'native transcript is not available'],
  ['provider-outage', videoUrl, 'temporarily unavailable'],
] as const) {
  test(`preserves input after ${scenario} failures`, async ({ page }) => {
    await page.goto(`/app-shell-fixture?intake=${scenario}`);
    await page.getByLabel('YouTube URL').fill(rawUrl);
    await page.getByRole('button', { name: 'Analyze video' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: message }),
    ).toBeVisible();
    await expect(page.getByLabel('YouTube URL')).toHaveValue(rawUrl);
  });
}

test('keeps keyboard focus order and returns dialog focus', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?intake=ready');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  const input = page.getByLabel('YouTube URL');
  await input.focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Analyze video' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  const advanced = page.getByRole('button', { name: 'Advanced options' });
  await expect(advanced).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('dialog', { name: 'Advanced options' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(advanced).toBeFocused();
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 980, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`has no overflow and keeps intake usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/app-shell-fixture?intake=duplicate');
    await noOverflow(page);
    await expect(page.getByLabel('YouTube URL')).toBeVisible();
    await page.getByRole('button', { name: 'Advanced options' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Advanced options' }),
    ).toBeVisible();
    await noOverflow(page);
    await page.keyboard.press('Escape');
    await submit(page);
    await expect(page.getByText('No credits will be used.')).toBeVisible();
    await noOverflow(page);
    if (viewport.width === 390) {
      const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
      await expect(nav).toBeVisible();
      expect(
        (await page
          .getByRole('button', { name: 'Analyze again' })
          .boundingBox())!.y,
      ).toBeLessThan((await nav.boundingBox())!.y);
    }
  });
}

test.describe('touch intake controls', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('keeps interactive form and duplicate targets at least 44px', async ({
    page,
  }) => {
    await page.goto('/app-shell-fixture?intake=duplicate');
    await atLeast44(page.getByLabel('YouTube URL'));
    await atLeast44(page.getByRole('button', { name: 'Analyze video' }));
    await atLeast44(page.getByRole('button', { name: 'Advanced options' }));
    await submit(page);
    await atLeast44(page.getByRole('link', { name: 'Open saved result' }));
    await atLeast44(page.getByRole('button', { name: 'Analyze again' }));
  });
});

test('removes intake motion while preserving content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app-shell-fixture?intake=duplicate');
  await submit(page);
  for (const locator of [
    page.locator('.app-beam-form'),
    page.locator('.duplicate-banner'),
  ]) {
    expect(
      await locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.animationName, style.transitionDuration];
      }),
    ).toEqual(['none', '0s']);
    await expect(locator).toBeVisible();
  }
});

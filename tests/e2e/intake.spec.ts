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
  await expect
    .poll(async () => {
      const box = await locator.boundingBox();
      return box ? Math.min(box.width, box.height) : 0;
    })
    .toBeGreaterThanOrEqual(44);
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
  await expect(
    page.locator('#new-analysis-form button[type="submit"]'),
  ).toBeDisabled();
  const pendingStatus = page
    .getByRole('status')
    .filter({ hasText: 'Checking video and transcript…' });
  await expect(pendingStatus).toBeVisible();
  await expect(pendingStatus).toContainText('Checking video and transcript…');
  const processing = page.getByTestId('analyze-processing-visual');
  await expect(processing).toHaveAttribute('data-analysis-state', 'submitting');
  for (const stage of [
    'Validating video',
    'Finding transcript',
    'Structuring key ideas',
    'Creating knowledge artifacts',
  ]) {
    await expect(processing.getByText(stage, { exact: true })).toHaveAttribute(
      'data-stage-state',
      /^(pending|active|done)$/,
    );
  }
  for (const rail of ['SUMMARY', 'FLASHCARDS', 'TIMESTAMPS', 'EXPORT']) {
    await expect(processing.getByText(rail, { exact: true })).toBeVisible();
  }
  await expect(processing.getByText('TRANSCRIPT', { exact: true })).toHaveCount(
    0,
  );
  await expect(page).toHaveURL(/\/app\/video\//, { timeout: 15_000 });
  await expect(page.getByText('Ready for processing')).toBeVisible();
});

test('persists output language and summary preset through options and submission', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?intake=ready');
  await page.getByLabel('YouTube URL').fill(videoUrl);
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await page.getByRole('radio', { name: 'Deutsch' }).click();
  await page.getByLabel('Summary preset').selectOption('detailed');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await expect(page.getByRole('radio', { name: 'Deutsch' })).toBeChecked();
  await expect(page.getByLabel('Summary preset')).toHaveValue('detailed');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Analyze video' }).click();
  await expect(page).toHaveURL(/\/app\/video\//, { timeout: 15_000 });
  await expect(page.getByText('Ready for processing')).toBeVisible();
  await expect(page.getByText('German', { exact: true })).toBeVisible();
  await expect(page.getByText('Detailed', { exact: true })).toBeVisible();
});

test('retains a 30-card preset after closing options and submits it to readiness', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?intake=ready');
  await page.getByLabel('YouTube URL').fill(videoUrl);
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await page.getByRole('checkbox', { name: 'Flashcards' }).check();
  await page.getByLabel('Flashcard count').selectOption('30');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await expect(page.getByLabel('Flashcard count')).toHaveValue('30');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Analyze video' }).click();

  await expect(page).toHaveURL(/\/app\/video\//, { timeout: 15_000 });
  await expect(page.getByText('Ready for processing')).toBeVisible();
  await expect(page.getByText('30 cards')).toBeVisible();
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
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await page.getByRole('radio', { name: 'Deutsch' }).click();
  await page.getByLabel('Summary preset').selectOption('detailed');
  await page.getByRole('checkbox', { name: 'Flashcards' }).check();
  await page.getByLabel('Flashcard count').selectOption('30');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Analyze again' }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Analyze this video again?',
  });
  await expect(confirmation).toContainText(
    'A new processing attempt will be created.',
  );
  await expect(confirmation).toContainText('en');
  await expect(confirmation).toContainText('Balanced');
  await expect(confirmation).not.toContainText('Deutsch');
  await expect(confirmation).not.toContainText('30');
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
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();
  });
}

test('shows renewed processing feedback when retrying a failed analysis', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?intake=provider-outage');
  await page.getByLabel('YouTube URL').fill(videoUrl);
  await page.getByRole('button', { name: 'Analyze video' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'temporarily unavailable' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Try again' }).click();
  const visual = page.getByTestId('analyze-processing-visual');
  await expect(visual).toHaveAttribute('data-analysis-state', 'submitting');
  await expect(
    page.getByRole('status').filter({ hasText: 'temporarily unavailable' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByLabel('YouTube URL')).toHaveValue(videoUrl);
});

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
    await page.getByRole('link', { name: 'Open saved result' }).click();
    await expect(page.getByText('Ready for processing')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('link', { name: '← Back to New analysis' }),
    ).toBeVisible();
    await noOverflow(page);

    const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
    if (viewport.width === 390) {
      await expect(nav).toBeVisible();
      const back = page.getByRole('link', { name: '← Back to New analysis' });
      await back.scrollIntoViewIfNeeded();
      expect((await back.boundingBox())!.y).toBeLessThan(
        (await nav.boundingBox())!.y,
      );
    } else {
      await expect(nav).toBeHidden();
    }
  });
}

test.describe('touch intake controls', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('keeps dialog, duplicate, and readiness targets at least 44px', async ({
    page,
  }) => {
    await page.goto('/app-shell-fixture?intake=duplicate');
    await atLeast44(page.getByLabel('YouTube URL'));
    await atLeast44(page.getByRole('button', { name: 'Analyze video' }));
    await atLeast44(page.getByRole('button', { name: 'Advanced options' }));
    await page.getByRole('button', { name: 'Advanced options' }).click();
    for (const name of ['Summary', 'Timestamps', 'Transcript', 'Flashcards']) {
      await atLeast44(page.getByRole('checkbox', { name }).locator('..'));
    }
    await page.getByRole('checkbox', { name: 'Flashcards' }).check();
    await atLeast44(page.getByLabel('Flashcard count'));
    await atLeast44(page.getByRole('button', { name: 'Done' }));
    await page.getByRole('button', { name: 'Done' }).click();
    await submit(page);
    await atLeast44(page.getByRole('link', { name: 'Open saved result' }));
    await atLeast44(page.getByRole('button', { name: 'Analyze again' }));
    await page.getByRole('link', { name: 'Open saved result' }).click();
    await atLeast44(page.getByRole('link', { name: '← Back to New analysis' }));
  });
});

test('removes dialog and readiness motion while preserving content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app-shell-fixture?intake=duplicate');
  await page.getByRole('button', { name: 'Advanced options' }).click();
  const options = page.getByRole('dialog', { name: 'Advanced options' });
  await expect(options).toBeVisible();
  expect(
    await options.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.animationName, style.transitionDuration];
    }),
  ).toEqual(['none', '0s']);
  await page.getByRole('button', { name: 'Done' }).click();
  await submit(page);
  await page.getByRole('link', { name: 'Open saved result' }).click();
  for (const locator of [page.locator('.intake-readiness')]) {
    expect(
      await locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.animationName, style.transitionDuration];
      }),
    ).toEqual(['none', '0s']);
    await expect(locator).toBeVisible();
  }
  await expect(page.getByText('Ready for processing')).toBeVisible();
  await expect(
    page.getByRole('link', { name: '← Back to New analysis' }),
  ).toBeVisible();
});

test('reduced motion adds no decorative delay to truthful readiness navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app-shell-fixture?intake=ready');
  await page.getByLabel('YouTube URL').fill(videoUrl);
  const startedAt = Date.now();
  await page.getByRole('button', { name: 'Analyze video' }).click();
  await expect(page).toHaveURL(/\/app\/video\//, { timeout: 3_000 });
  // The fixture action intentionally takes 1.8s. This ceiling allows normal
  // parallel-test overhead while proving the client skips the 4s visual flow.
  expect(Date.now() - startedAt).toBeLessThan(3_500);
  await expect(page.getByText('Ready for processing')).toBeVisible();
  await expect(page.getByText('Your artifacts are ready')).toHaveCount(0);
});

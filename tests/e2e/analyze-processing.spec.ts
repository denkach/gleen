import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';

const fixtureUrl = 'https://www.youtube.com/watch?v=gleen-fixture';
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 980, height: 768 },
  { width: 390, height: 844 },
] as const;

async function animationName(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).animationName);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

async function openFixture(page: Page) {
  await page.goto('/analyze-processing-fixture');
  await expect(page.getByTestId('analyze-processing-visual')).toHaveAttribute(
    'data-analysis-state',
    'idle',
  );
}

test('launches the approved opening and renders only selected artifact rays', async ({
  page,
}) => {
  await openFixture(page);
  await page.getByRole('checkbox', { name: 'Flashcards' }).uncheck();

  const analyze = page.getByRole('button', { name: 'Analyze video' });
  const visual = page.getByTestId('analyze-processing-visual');
  const shell = visual.locator('.analyze-shell');
  const startedAt = Date.now();
  await analyze.click();

  await expect(analyze).toBeDisabled();
  await expect(visual).toHaveAttribute('data-analysis-state', 'submitting');
  await expect(shell).toHaveClass(/processing/);
  expect(await animationName(visual.locator('.analyze-photon'))).toBe(
    'analyze-photon-run',
  );
  expect(await animationName(visual.locator('.analyze-shell-flash'))).toBe(
    'analyze-shell-flash',
  );
  await expect(visual.locator('.analyze-prism')).toBeVisible();
  await expect(visual.locator('.analyze-beam-in')).toBeVisible();
  await expect(visual.locator('.analyze-ray')).toHaveCount(3);
  await expect(visual.getByText('SUMMARY', { exact: true })).toBeVisible();
  await expect(visual.getByText('TIMESTAMPS', { exact: true })).toBeVisible();
  await expect(visual.getByText('TRANSCRIPT', { exact: true })).toBeVisible();
  await expect(visual.getByText('FLASHCARDS', { exact: true })).toHaveCount(0);
  await expect(visual.getByText('EXPORT', { exact: true })).toHaveCount(0);
  await expect
    .poll(async () => (await shell.boundingBox())?.height ?? 0)
    .toBeCloseTo(300, 0);
  expect(Date.now() - startedAt).toBeLessThanOrEqual(1_800);
});

test('plays every deterministic fixture state with stage text instead of percentages', async ({
  page,
}) => {
  await openFixture(page);
  const visual = page.getByTestId('analyze-processing-visual');
  await page.getByRole('button', { name: 'Analyze video' }).click();

  for (const [state, active, done] of [
    ['validating', 'Validating video', []],
    ['transcript', 'Finding transcript', ['Validating video']],
    [
      'structuring',
      'Structuring key ideas',
      ['Validating video', 'Finding transcript'],
    ],
    [
      'artifacts',
      'Creating knowledge artifacts',
      ['Validating video', 'Finding transcript', 'Structuring key ideas'],
    ],
  ] as const) {
    await expect(visual).toHaveAttribute('data-analysis-state', state, {
      timeout: 2_000,
    });
    await expect(visual.getByText(active, { exact: true })).toHaveAttribute(
      'data-stage-state',
      'active',
    );
    for (const label of done) {
      await expect(visual.getByText(label, { exact: true })).toHaveAttribute(
        'data-stage-state',
        'done',
      );
    }
    await expect(visual).not.toContainText(/\d+%/);
  }

  await expect(visual).toHaveAttribute('data-analysis-state', 'complete', {
    timeout: 2_000,
  });
  await expect(
    visual.getByRole('heading', {
      name: 'Your knowledge artifacts are ready.',
    }),
  ).toBeVisible({ timeout: 1_500 });
});

test('preserves the fixture URL through error, retry, and replay', async ({
  page,
}) => {
  await openFixture(page);
  const visual = page.getByTestId('analyze-processing-visual');
  await page.getByRole('button', { name: 'Preview error' }).click();

  await expect(visual).toHaveAttribute('data-analysis-state', 'error');
  await expect(visual).toHaveAttribute('data-submitted-url', fixtureUrl);
  await expect(
    page.getByText('Fixture error: the demo video could not be accessed.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(visual).toHaveAttribute('data-analysis-state', 'submitting');
  await expect(visual).toHaveAttribute('data-submitted-url', fixtureUrl);

  await page.getByRole('button', { name: 'Replay sequence' }).click();
  await expect(visual).toHaveAttribute('data-analysis-state', 'idle');
  await expect(visual).toHaveAttribute('data-analysis-state', 'submitting');
});

for (const viewport of viewports) {
  test(`matches processing geometry without overflow at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openFixture(page);
    await page.getByRole('checkbox', { name: 'Flashcards' }).uncheck();
    await page.getByRole('button', { name: 'Analyze video' }).click();
    const visual = page.getByTestId('analyze-processing-visual');
    const panel = visual.locator('.analyze-processing-panel');
    const shell = visual.locator('.analyze-shell');

    await expectNoHorizontalOverflow(page);
    await expect(shell).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(visual.getByText('Validating video')).toBeVisible();
    await expect(visual.locator('.analyze-ray')).toHaveCount(3);
    await expect
      .poll(async () => (await shell.boundingBox())?.height ?? 0)
      .toBeCloseTo(viewport.width <= 900 ? 500 : 300, 0);
    const geometry = await panel.evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
    }));
    expect(geometry.columns).toBe(viewport.width <= 900 ? 1 : 2);

    const labels = visual.locator('.analyze-artifact-labels span');
    if (viewport.width <= 900) {
      await expect(labels.first()).toBeHidden();
    } else {
      await expect(labels.first()).toBeVisible();
    }
  });
}

test.describe('touch fixture actions', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('keeps the processing retry action at least 44px', async ({ page }) => {
    await openFixture(page);
    await page.getByRole('button', { name: 'Preview error' }).click();
    const retryBox = await page
      .getByRole('button', { name: 'Try again' })
      .boundingBox();
    expect(
      Math.min(retryBox?.width ?? 0, retryBox?.height ?? 0),
    ).toBeGreaterThanOrEqual(44);
  });
});

test('reduced motion removes decorative motion while retaining truthful state', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page);
  await page.getByRole('button', { name: 'Analyze video' }).click();
  const visual = page.getByTestId('analyze-processing-visual');

  await expect(visual.locator('.analyze-photon')).toBeHidden();
  await expect(visual.locator('.analyze-shell-flash')).toBeHidden();
  for (const locator of [
    visual.locator('.analyze-prism'),
    visual.locator('.analyze-ray').first(),
  ]) {
    expect(await animationName(locator)).toBe('none');
  }
  expect(
    await visual
      .locator('.analyze-trace')
      .first()
      .evaluate(
        (element) => getComputedStyle(element, '::after').animationName,
      ),
  ).toBe('none');
  await expect(
    visual.getByRole('status').filter({
      hasText: 'Checking video and transcript…',
    }),
  ).toBeVisible();
});

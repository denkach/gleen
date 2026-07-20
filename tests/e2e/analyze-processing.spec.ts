import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';

const fixtureUrl = 'https://www.youtube.com/watch?v=gleen-fixture';
const crossPlatformGeometryTolerance = 2;
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 980, height: 768 },
  { width: 390, height: 844 },
] as const;

async function animationName(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).animationName);
}

async function transitionDurations(locator: Locator) {
  return locator.evaluate(
    (element) => getComputedStyle(element).transitionDuration,
  );
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

const den16IdleGeometry = [
  {
    viewport: { width: 1440, height: 900 },
    shell: { x: 335, y: 353.6875, width: 760, height: 66 },
    input: { x: 343, y: 361.6875, width: 594.953125, height: 50 },
    button: { x: 937.953125, y: 362.6875, width: 149.046875, height: 48 },
    meta: { x: 335, y: 419.6875, width: 1012, height: 30.5 },
    dashboard: { x: 284, y: 517.1875, width: 1114, height: 299 },
  },
  {
    viewport: { width: 390, height: 844 },
    shell: { x: 33, y: 255.4375, width: 324, height: 112 },
    input: { x: 41, y: 263.4375, width: 308, height: 48 },
    button: { x: 41, y: 311.4375, width: 308, height: 48 },
    meta: { x: 33, y: 367.4375, width: 324, height: 30.5 },
    dashboard: { x: 14, y: 446, width: 362, height: 616 },
  },
] as const;

for (const baseline of den16IdleGeometry) {
  test(`idle production shell matches the DEN-16 form at ${baseline.viewport.width}x${baseline.viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(baseline.viewport);
    await page.goto('/app-shell-fixture?intake=ready');

    const actual = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector(selector)!;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      };
      const shell = document.querySelector('.analyze-shell')!;
      const style = getComputedStyle(shell);
      return {
        shell: box('.analyze-shell'),
        input: box('#new-analysis-form input[name="rawUrl"]'),
        button: box('#new-analysis-form button[type="submit"]'),
        meta: box('.analysis-form-meta'),
        dashboard: box('.dashboard-grid'),
        style: {
          border: style.border,
          borderRadius: style.borderRadius,
          padding: style.padding,
          background: style.backgroundColor,
          boxShadow: style.boxShadow,
        },
      };
    });

    for (const key of [
      'shell',
      'input',
      'button',
      'meta',
      'dashboard',
    ] as const) {
      for (const dimension of ['x', 'y', 'width', 'height'] as const) {
        expect(
          Math.abs(actual[key][dimension] - baseline[key][dimension]),
        ).toBeLessThanOrEqual(crossPlatformGeometryTolerance);
      }
    }
    expect(actual.style).toEqual({
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '17px',
      padding: '7px',
      background: 'rgba(17, 16, 24, 0.76)',
      boxShadow:
        'rgba(255, 255, 255, 0.016) 0px 0px 0px 1px, rgba(0, 0, 0, 0.35) 0px 24px 70px 0px, rgba(255, 255, 255, 0.03) 0px 1px 0px 0px inset',
    });
  });
}

test('launches the approved opening and renders the fixed spectral rails', async ({
  page,
}) => {
  await openFixture(page);

  const analyze = page.getByRole('button', { name: 'Analyze video' });
  const visual = page.getByTestId('analyze-processing-visual');
  const shell = visual.locator('.analyze-shell');
  const startedAt = await page.evaluate(() => performance.now());
  const disabledAtDispatchReturn = await analyze.evaluate((button) => {
    (button as HTMLButtonElement).click();
    return (button as HTMLButtonElement).disabled;
  });

  expect(disabledAtDispatchReturn).toBe(true);
  await expect(analyze).toBeDisabled();
  await expect(visual).toHaveAttribute('data-analysis-state', 'submitting');
  await expect(shell).toHaveClass(/processing/);
  expect(await animationName(visual.locator('.analyze-photon'))).toBe(
    'analyze-photon-run',
  );
  expect(await animationName(visual.locator('.analyze-shell-flash'))).toBe(
    'analyze-shell-flash',
  );
  await expect(visual.locator('.analyze-master-rail')).toBeVisible();
  await expect(visual.locator('.analyze-rail')).toHaveCount(4);
  await expect(visual.getByText('SUMMARY', { exact: true })).toBeVisible();
  await expect(visual.getByText('FLASHCARDS', { exact: true })).toBeVisible();
  await expect(visual.getByText('TIMESTAMPS', { exact: true })).toBeVisible();
  await expect(visual.getByText('EXPORT', { exact: true })).toBeVisible();
  await expect(visual.getByText('TRANSCRIPT', { exact: true })).toHaveCount(0);
  const samples: Array<{
    elapsed: number;
    shellHeight: number;
    photonLeft: number;
    photonOpacity: number;
    flashOpacity: number;
    panelOpacity: number;
    panelY: number;
  }> = [];
  await expect
    .poll(
      async () => {
        const sample = await visual.evaluate((element, origin) => {
          const shellElement = element.querySelector('.analyze-shell')!;
          const photon = element.querySelector('.analyze-photon')!;
          const flash = element.querySelector('.analyze-shell-flash')!;
          const panel = element.querySelector('.analyze-processing-panel')!;
          const panelStyle = getComputedStyle(panel);
          return {
            elapsed: performance.now() - origin,
            shellHeight: shellElement.getBoundingClientRect().height,
            photonLeft: Number.parseFloat(getComputedStyle(photon).left),
            photonOpacity: Number.parseFloat(getComputedStyle(photon).opacity),
            flashOpacity: Number.parseFloat(getComputedStyle(flash).opacity),
            panelOpacity: Number.parseFloat(panelStyle.opacity),
            panelY: new DOMMatrix(panelStyle.transform).m42,
          };
        }, startedAt);
        samples.push(sample);
        return sample.shellHeight >= 299.5 && sample.panelOpacity >= 0.99;
      },
      { intervals: [35], timeout: 1_800 },
    )
    .toBe(true);
  const settledAt = samples.at(-1)!.elapsed;
  expect(settledAt).toBeGreaterThanOrEqual(600);
  expect(settledAt).toBeLessThanOrEqual(1_100);
  expect(
    samples.some(
      (sample) => sample.photonOpacity > 0.5 && sample.photonLeft > 38,
    ),
  ).toBe(true);
  expect(samples.some((sample) => sample.flashOpacity > 0.05)).toBe(true);
  expect(
    samples.some(
      (sample) =>
        sample.panelOpacity > 0 &&
        sample.panelOpacity < 0.95 &&
        sample.panelY > 0,
    ),
  ).toBe(true);
  await expect(shell).toHaveCSS('height', '300px');
});

test('production input row disables synchronously and follows the approved exit progression', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?intake=ready');
  await page.getByLabel('YouTube URL').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.locator('.analyze-shell').evaluate((shell) => {
    const testWindow = window as typeof window & {
      __productionAnalyzeShell?: Element;
      __productionAnalyzeSamples?: Array<{
        opacity: number;
        shellHeight: number;
        photonOpacity: number;
        flashOpacity: number;
      }>;
    };
    testWindow.__productionAnalyzeShell = shell;
    testWindow.__productionAnalyzeSamples = [];
    const startedAt = performance.now();
    const recordFrame = () => {
      const inputRow = document.querySelector('.analyze-input-row')!;
      const photon = document.querySelector('.analyze-photon')!;
      const flash = document.querySelector('.analyze-shell-flash')!;
      testWindow.__productionAnalyzeSamples!.push({
        opacity: Number(getComputedStyle(inputRow).opacity),
        shellHeight: shell.getBoundingClientRect().height,
        photonOpacity: Number(getComputedStyle(photon).opacity),
        flashOpacity: Number(getComputedStyle(flash).opacity),
      });
      if (performance.now() - startedAt < 1_200) {
        requestAnimationFrame(recordFrame);
      }
    };
    requestAnimationFrame(recordFrame);
  });
  const form = page.locator('#new-analysis-form');
  const analyze = page.getByRole('button', { name: 'Analyze video' });
  const disabledAtDispatchReturn = await analyze.evaluate((button) => {
    (button as HTMLButtonElement).click();
    return (button as HTMLButtonElement).disabled;
  });
  expect(disabledAtDispatchReturn).toBe(true);
  const visual = page.getByTestId('analyze-processing-visual');
  const shell = visual.locator('.analyze-shell');
  await expect(visual).toHaveAttribute('data-analysis-state', 'submitting');
  expect(
    await shell.evaluate(
      (element) =>
        element ===
        (window as typeof window & { __productionAnalyzeShell?: Element })
          .__productionAnalyzeShell,
    ),
  ).toBe(true);
  await expect
    .poll(
      () => shell.evaluate((element) => element.getBoundingClientRect().height),
      { intervals: [25], timeout: 800 },
    )
    .toBeGreaterThanOrEqual(299.5);
  const samples = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __productionAnalyzeSamples?: Array<{
            opacity: number;
            shellHeight: number;
            photonOpacity: number;
            flashOpacity: number;
          }>;
        }
      ).__productionAnalyzeSamples ?? [],
  );
  expect(
    samples.some((sample) => sample.opacity > 0.05 && sample.opacity < 0.95),
  ).toBe(true);
  expect(
    samples.some(
      (sample) => sample.shellHeight > 130 && sample.shellHeight < 290,
    ),
  ).toBe(true);
  expect(samples.some((sample) => sample.photonOpacity > 0.5)).toBe(true);
  expect(samples.some((sample) => sample.flashOpacity > 0.05)).toBe(true);
  await expect(shell).toHaveCSS('height', '420px');
  const style = await form.locator('..').evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      opacity: computed.opacity,
      transform: computed.transform,
      filter: computed.filter,
      transitionProperty: computed.transitionProperty,
    };
  });
  expect(Number(style.opacity)).toBeLessThan(0.01);
  expect(style.transform).not.toBe('none');
  expect(style.filter).toContain('blur');
  expect(style.transitionProperty).toContain('opacity');
  expect(style.transitionProperty).toContain('transform');
  expect(style.transitionProperty).toContain('filter');
});

test('hands completion through the exit wipe before opening the result', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?journey=complete');
  await page.getByRole('button', { name: 'Start fixture analysis' }).click();

  const visual = page.getByTestId('analyze-processing-visual');
  await expect(visual).toHaveAttribute('data-analysis-state', 'complete', {
    timeout: 6_000,
  });
  await expect(
    visual.getByRole('heading', { name: 'Your artifacts are ready' }),
  ).toBeVisible();
  await expect(visual).toHaveAttribute('data-analysis-exiting', 'true', {
    timeout: 1_000,
  });
  await expect(page).toHaveURL(/\/app\?analysis=result-complete/);
  await expect(page).toHaveURL(/\/app-shell-fixture\/app\/video\//, {
    timeout: 10_000,
  });
});

test('production form keeps stages truthful and contains the rails at app-shell tablet width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/app-shell-fixture?intake=ready');
  await page.getByLabel('YouTube URL').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Analyze video' }).click();

  const visual = page.getByTestId('analyze-processing-visual');
  await expect(visual).toHaveAttribute('data-analysis-state', 'submitting');
  await expect(visual.getByText('Validating video')).toHaveAttribute(
    'data-stage-state',
    'pending',
  );
  await expect(visual.locator('.analyze-shell')).toHaveCSS('height', '420px');
  expect(
    await visual
      .locator('.analyze-trace')
      .first()
      .evaluate(
        (element) => getComputedStyle(element, '::after').animationName,
      ),
  ).toBe('analyze-trace');

  const geometry = await visual.evaluate((element) => {
    const shell = element
      .querySelector('.analyze-shell')!
      .getBoundingClientRect();
    const panel = element
      .querySelector('.analyze-processing-panel')!
      .getBoundingClientRect();
    const rails = element
      .querySelector('.analyze-rail-visual')!
      .getBoundingClientRect();
    const status = element
      .querySelector('.analyze-status-copy')!
      .getBoundingClientRect();
    const visibleRails = [
      ...element.querySelectorAll<HTMLElement>(
        '.analyze-master-rail, .analyze-rail',
      ),
    ].filter((item) => getComputedStyle(item).display !== 'none');
    return {
      railsRightOfStatus: rails.left > status.right,
      columnsAligned: Math.abs(rails.top - status.top) < 2,
      panelInsideShell:
        panel.left >= shell.left &&
        panel.right <= shell.right &&
        panel.top >= shell.top &&
        panel.bottom <= shell.bottom,
      railsInsideShell: visibleRails.every((item) => {
        const rect = item.getBoundingClientRect();
        return rect.left >= shell.left - 1 && rect.right <= shell.right + 1;
      }),
      railCount: visibleRails.length,
    };
  });
  expect(geometry).toMatchObject({
    railsRightOfStatus: true,
    columnsAligned: true,
    panelInsideShell: true,
    railsInsideShell: true,
    railCount: 5,
  });
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
      name: 'Your artifacts are ready',
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
    await page.getByRole('button', { name: 'Analyze video' }).click();
    const visual = page.getByTestId('analyze-processing-visual');
    const panel = visual.locator('.analyze-processing-panel');
    const shell = visual.locator('.analyze-shell');

    await expectNoHorizontalOverflow(page);
    await expect(shell).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(visual.getByText('Validating video')).toBeVisible();
    await expect(visual.locator('.analyze-rail')).toHaveCount(4);
    const expectedHeight =
      viewport.width <= 540 ? 500 : viewport.width <= 1100 ? 420 : 300;
    await expect
      .poll(async () => (await shell.boundingBox())?.height ?? 0)
      .toBeCloseTo(expectedHeight, 0);
    const shellBox = (await shell.boundingBox())!;
    expect(shellBox.width).toBeCloseTo(Math.min(1_395, viewport.width), 0);
    const geometry = await panel.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const status = element
        .querySelector('.analyze-status-copy')!
        .getBoundingClientRect();
      const rails = element
        .querySelector('.analyze-rail-visual')!
        .getBoundingClientRect();
      return {
        columns: style.gridTemplateColumns.split(' ').length,
        gap: Number.parseFloat(style.gap),
        paddingTop: Number.parseFloat(style.paddingTop),
        paddingLeft: Number.parseFloat(style.paddingLeft),
        radius: Number.parseFloat(
          getComputedStyle(element.parentElement!).borderRadius,
        ),
        statusTop: status.top - rect.top,
        railsTop: rails.top - rect.top,
      };
    });
    const isStacked = viewport.width <= 540;
    const isCompact = viewport.width > 540 && viewport.width <= 1100;
    expect(geometry.columns).toBe(isStacked ? 1 : 2);
    expect(geometry.radius).toBe(viewport.width <= 1100 ? 24 : 30);
    expect(geometry.paddingTop).toBe(viewport.width <= 1100 ? 28 : 35);
    expect(geometry.paddingLeft).toBe(viewport.width <= 1100 ? 24 : 42);
    expect(geometry.gap).toBe(isStacked ? 12 : isCompact ? 20 : 48);
    if (isStacked) {
      expect(geometry.railsTop).toBeGreaterThan(geometry.statusTop);
    } else {
      expect(Math.abs(geometry.railsTop - geometry.statusTop)).toBeLessThan(2);
    }

    const containedRails = await visual.evaluate((element) => {
      const shell = element
        .querySelector('.analyze-shell')!
        .getBoundingClientRect();
      const visibleRails = [
        ...element.querySelectorAll<HTMLElement>(
          '.analyze-master-rail, .analyze-rail',
        ),
      ].filter((rail) => getComputedStyle(rail).display !== 'none');
      return visibleRails.every((rail) => {
        const rect = rail.getBoundingClientRect();
        return rect.left >= shell.left - 1 && rect.right <= shell.right + 1;
      });
    });
    expect(containedRails).toBe(true);
  });
}

test.describe('touch fixture actions', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('keeps every visible fixture action at least 44px', async ({ page }) => {
    await openFixture(page);
    for (const action of await page
      .locator(
        '.analyze-processing-fixture button:visible, .analyze-processing-fixture label:visible',
      )
      .all()) {
      const box = await action.boundingBox();
      expect(
        Math.min(box?.width ?? 0, box?.height ?? 0),
      ).toBeGreaterThanOrEqual(44);
    }
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
  const shell = visual.locator('.analyze-shell');
  const panel = visual.locator('.analyze-processing-panel');

  await expect(visual.locator('.analyze-photon')).toBeHidden();
  await expect(visual.locator('.analyze-shell-flash')).toBeHidden();
  for (const locator of [
    visual.locator('.analyze-master-rail'),
    visual.locator('.analyze-track').first(),
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
  expect(await transitionDurations(shell)).toBe('0s');
  expect(await transitionDurations(panel)).toBe('0s');
  await expect(shell).toHaveCSS('height', '300px');
  await expect(panel).toHaveCSS('opacity', '1');
  await expect(panel).toHaveCSS('transform', 'none');
  await expect(
    visual.getByRole('status').filter({
      hasText: 'Checking video and transcript…',
    }),
  ).toBeVisible();
});

test('durable processing survives reload and restores the persisted transcript stage', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture/app/video/pipeline-transcript');
  const visual = page.getByTestId('analyze-processing-visual');
  await expect(visual).toHaveAttribute('data-analysis-state', 'transcript');
  await expect(page.getByText('Finding transcript')).toBeVisible();
  await page.reload();
  await expect(visual).toHaveAttribute('data-analysis-state', 'transcript');
  await expect(page.getByText('Finding transcript')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('durable queued and running stay on New analysis with exactly one spectrum before one result handoff', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?journey=complete');
  const transitions: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) transitions.push(frame.url());
  });
  await page.getByRole('button', { name: 'Start fixture analysis' }).click();
  await expect(page).toHaveURL(/\/app\?analysis=result-complete$/);
  await expect(page.getByTestId('analyze-processing-visual')).toHaveCount(1);
  await expect(page.getByTestId('analyze-processing-visual')).toHaveAttribute(
    'data-analysis-state',
    /validating|queued/,
  );
  await expect(page.getByTestId('analyze-processing-visual')).toHaveAttribute(
    'data-analysis-state',
    'transcript',
  );
  await expect(page).toHaveURL(
    /\/app-shell-fixture\/app\/video\/result-complete#overview$/,
    { timeout: 7_000 },
  );
  await expect(page.getByTestId('result-layout')).toBeVisible();
  await expect(page.getByTestId('analyze-processing-visual')).toHaveCount(0);
  await page.waitForTimeout(500);
  const resultDestinations = [
    ...new Set(
      transitions
        .filter((url) => url.includes('/app-shell-fixture/app/video/'))
        .map((url) => new URL(url).pathname),
    ),
  ];
  expect(resultDestinations).toEqual([
    '/app-shell-fixture/app/video/result-complete',
  ]);
});

test('partial exposes both actions and never navigates automatically', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?journey=partial');
  await page.getByRole('button', { name: 'Start fixture analysis' }).click();
  const initialUrl = page.url();
  await expect(
    page.getByRole('button', { name: 'Retry failed artifact' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'View available results' }),
  ).toBeVisible();
  await expect(page.getByTestId('fixture-settled')).toHaveAttribute(
    'data-settled',
    'true',
  );
  expect(page.url()).toBe(initialUrl);
});

test('durable partial result keeps ready artifacts and retries unfinished work', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture/app/video/pipeline-partial');
  await expect(page.getByText('Summary ready')).toBeVisible();
  await expect(page.getByText('Flashcards needs retry')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('analyze-processing-visual')).toHaveAttribute(
    'data-analysis-state',
    'artifacts',
  );
  await expect(page.getByText('Summary ready')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('retry preserves ready status while unfinished status resumes', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture/app/video/pipeline-partial');
  await expect(page.getByText('Summary ready')).toBeVisible();
  await expect(page.getByText('Flashcards needs retry')).toBeVisible();
  const retryFailedArtifact = page.getByRole('button', { name: 'Try again' });
  await retryFailedArtifact.click();
  await expect(page.getByText('Summary ready')).toBeVisible();
  await expect(page.getByText('Flashcards needs retry')).toHaveCount(0);
  await expect(page.getByTestId('analyze-processing-visual')).toHaveAttribute(
    'data-analysis-state',
    'artifacts',
  );
});

test('durable reload and History restore the active job truthfully', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture?journey=recover');
  await page.getByRole('button', { name: 'Start fixture analysis' }).click();
  await expect(page.getByText('Finding transcript')).toBeVisible();
  await page.goto('/app-shell-fixture?journey=recover');
  await expect(page.getByText('Finding transcript')).toBeVisible();
  await page
    .locator('#app-content')
    .getByRole('link', { name: 'History' })
    .click();
  await page.getByRole('link', { name: 'Resume active analysis' }).click();
  await expect(page.getByText('Finding transcript')).toBeVisible();
  await expect(page.getByTestId('analyze-processing-visual')).toHaveCount(1);
});

test('durable reduced motion keeps truthful completion without decorative delay', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app-shell-fixture?journey=reduced');
  const startedAt = Date.now();
  await page.getByRole('button', { name: 'Start fixture analysis' }).click();
  await expect(page).toHaveURL(
    /\/app-shell-fixture\/app\/video\/result-complete#overview$/,
    { timeout: 4_000 },
  );
  expect(Date.now() - startedAt).toBeLessThan(4_000);
  await expect(page.getByTestId('result-layout')).toBeVisible();
  await expect(page.getByTestId('analyze-processing-visual')).toHaveCount(0);
});

test('durable reduced motion reveals a completed result immediately', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app-shell-fixture/app/video/pipeline-complete');
  await expect(page.getByTestId('result-layout')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

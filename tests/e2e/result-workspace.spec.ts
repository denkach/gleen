import { expect, test } from './fixtures';

const route = '/app-shell-fixture/app/video/result-complete';

type FixtureWindow = Window & {
  __fixtureClipboard?: string;
  __fixturePlayer: { seeks: number[] };
};

async function gotoFixture(page: import('@playwright/test').Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.locator('[aria-label="Video source"] iframe').waitFor();
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = { currentTime: 0, seeks: [] as number[] };
    Object.assign(window, { __fixturePlayer: state });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          Object.assign(window, { __fixtureClipboard: value });
        },
      },
    });
    class Player {
      iframe = document.createElement('iframe');
      constructor(
        element: HTMLElement,
        options: { events: { onReady(): void } },
      ) {
        this.iframe.title = 'Fixture player';
        element.append(this.iframe);
        setTimeout(() => options.events.onReady(), 0);
      }
      destroy() {}
      getCurrentTime() {
        return state.currentTime;
      }
      getIframe() {
        return this.iframe;
      }
      pauseVideo() {}
      playVideo() {}
      seekTo(seconds: number) {
        state.currentTime = seconds;
        state.seeks.push(seconds);
      }
    }
    Object.assign(window, { YT: { Player } });
  });
});

test('matches desktop, tablet, and mobile result geometry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoFixture(page, route);
  const layout = page.getByTestId('result-layout');
  await expect(layout).toHaveCSS('grid-template-columns', /\d+.*\d+/);
  await expect(page.getByLabel('Video source')).toHaveCSS('position', 'sticky');

  await page.setViewportSize({ width: 980, height: 768 });
  await expect(page.getByLabel('Video source')).toHaveCSS(
    'position',
    'relative',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const boxes = await page.evaluate(() => ({
    source: document
      .querySelector('[aria-label="Video source"]')!
      .getBoundingClientRect().top,
    workspace: document
      .querySelector('[aria-label="Analysis artifacts"]')!
      .getBoundingClientRect().top,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  expect(boxes.source).toBeLessThan(boxes.workspace);
  expect(boxes.overflow).toBe(false);
});

test('supports keyboard tab navigation and summary seeking', async ({
  page,
}) => {
  await gotoFixture(page, route);
  const overview = page.getByRole('tab', { name: 'Overview' });
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  const summaryTab = page.getByRole('tab', { name: 'Summary' });
  await expect(summaryTab).toBeFocused();
  await summaryTab.click();
  await page.getByRole('button', { name: '1:03' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as FixtureWindow).__fixturePlayer.seeks.at(-1),
      ),
    )
    .toBe(63);
});

test('seeks from timestamps and transcript controls', async ({ page }) => {
  await gotoFixture(page, route);
  await page.getByRole('tab', { name: 'Timestamps' }).click();
  await page.getByRole('button', { name: '1:03' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as FixtureWindow).__fixturePlayer.seeks.at(-1),
      ),
    )
    .toBe(63);

  await page.getByRole('tab', { name: 'Transcript' }).click();
  await page.getByRole('button', { name: '0:00' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as FixtureWindow).__fixturePlayer.seeks.at(-1),
      ),
    )
    .toBe(0);
});

test('persists title and summary artifact autosaves across reload', async ({
  page,
}) => {
  await gotoFixture(page, route);

  await page.getByLabel('Result title').fill('Edited fixture title');
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 3_000 });

  await page.getByRole('tab', { name: 'Summary' }).click();
  await page.getByLabel('Summary title').fill('Persisted fixture summary');
  await expect(
    page.locator('[data-artifact="summary"]').getByRole('status'),
  ).toHaveText('Saved', { timeout: 3_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Result title')).toHaveValue(
    'Edited fixture title',
  );
  await page.getByRole('tab', { name: 'Summary' }).click();
  await expect(page.getByLabel('Summary title')).toHaveValue(
    'Persisted fixture summary',
  );
});

test('copies transcript with an accessible success outcome', async ({
  page,
}) => {
  await gotoFixture(page, route);
  await page.getByRole('tab', { name: 'Transcript' }).click();
  await page.getByRole('button', { name: 'Copy transcript' }).click();
  await expect(page.getByRole('status')).toHaveText(/transcript copied/i);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as FixtureWindow).__fixtureClipboard,
      ),
    )
    .toContain('Important claims remain grounded.');
});

test('downloads generated Markdown with the rendered artifact content', async ({
  page,
}) => {
  await gotoFixture(page, route);
  await page.getByRole('tab', { name: 'Export' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('gleen-result.md');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toContain(
    'Reusable knowledge',
  );
});

test('durable mobile touch flow flips and studies a flashcard', async ({
  isMobile,
  page,
}) => {
  await gotoFixture(page, route);
  const activate = async (locator: import('@playwright/test').Locator) =>
    isMobile ? locator.tap() : locator.click();
  await activate(page.getByRole('tab', { name: 'Flashcards' }));
  await activate(page.getByRole('button', { name: 'Show answer' }));
  await expect(page.getByText('Reusable knowledge artifacts.')).toBeVisible();
  await activate(page.getByRole('button', { name: 'Got it' }));
  await expect(page.getByText('1 studied')).toBeVisible();
});

test('isolates partial, corrupted, empty, and legacy fixture states', async ({
  page,
}) => {
  for (const [id, tab, text] of [
    ['result-partial', 'Flashcards', 'could not be generated'],
    ['result-corrupted', 'Summary', 'could not be read'],
    ['result-empty', 'Summary', 'No artifact content'],
  ] as const) {
    await gotoFixture(page, `/app-shell-fixture/app/video/${id}`);
    await page.getByRole('tab', { name: tab }).click();
    await expect(
      page
        .getByRole('tabpanel', { name: tab })
        .getByText(new RegExp(text, 'i')),
    ).toBeVisible();
  }
  await gotoFixture(page, '/app-shell-fixture/app/video/result-legacy');
  await page.getByRole('tab', { name: 'Summary' }).click();
  await expect(page.getByText('Legacy point')).toBeVisible();
  await expect(page.getByRole('button', { name: /\d+:\d+/ })).toHaveCount(0);
});

test('removes nonessential result motion for reduced-motion users', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoFixture(page, route);
  await page.getByRole('tab', { name: 'Flashcards' }).click();
  await expect(
    page
      .getByRole('button', { name: 'Show answer' })
      .locator('[data-flashcard-scene]'),
  ).toHaveCSS('transition-duration', '1e-05s');
});

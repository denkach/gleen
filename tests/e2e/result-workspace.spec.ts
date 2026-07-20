import { expect, test } from './fixtures';

const route = '/app-shell-fixture/app/video/result-complete';

type FixtureWindow = Window & {
  __fixtureClipboard?: string;
  __fixturePlayer: {
    currentTime: number;
    playing: boolean;
    seeks: number[];
    commands: { type: string; offsetMs?: number }[];
    pause(): void;
    play(): void;
  };
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

async function expectFocusToCycleInside(
  page: import('@playwright/test').Page,
  dialog: import('@playwright/test').Locator,
) {
  const focusableCount = await dialog
    .locator(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    .count();

  for (let index = 0; index <= focusableCount; index += 1) {
    await page.keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);
  }

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
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
      getDuration() {
        return 90;
      }
      getPlaybackRate() {
        return 1.25;
      }
      getAvailablePlaybackRates() {
        return [1, 1.25, 1.5, 2];
      }
      getVolume() {
        return 100;
      }
      isMuted() {
        return false;
      }
      getIframe() {
        return this.iframe;
      }
      mute() {}
      pauseVideo() {}
      playVideo() {}
      setPlaybackRate() {}
      setVolume() {}
      seekTo(seconds: number) {
        state.currentTime = seconds;
        state.seeks.push(seconds);
      }
      unMute() {}
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
  await expect(page.getByLabel('Video source')).toHaveCSS('position', 'static');
  await expect(page.locator('.result-progress-wrap')).toHaveCSS(
    'bottom',
    '64px',
  );

  await page.setViewportSize({ width: 1100, height: 768 });
  await expect(page.locator('.side-link span').first()).toBeHidden();
  await expect(page.locator('.usage-mini')).toBeHidden();
  await expect(page.locator('.user-chip-text')).toBeHidden();
  await expect(page.getByLabel('Video source')).toHaveCSS('position', 'static');

  await page.setViewportSize({ width: 860, height: 768 });
  await expect(page.locator('.app-topbar')).toHaveCSS('padding-left', '14px');
  await expect(page.locator('.app-topbar')).toHaveCSS('padding-right', '14px');
  await expect(page.locator('.usage-pill')).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.app-topbar')).toHaveCSS('height', '62px');
  await expect(page.locator('.app-topbar')).toBeVisible();
  await expect(page.locator('.bottom-nav')).toBeHidden();
  await expect(page.locator('.app-shell')).toHaveCSS('padding-bottom', '0px');
  await expect(page.locator('.result-source-actions')).toBeHidden();
  await expect(page.locator('.result-progress-wrap')).toHaveCSS(
    'bottom',
    '57px',
  );
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

test('keeps the complete custom controlbar reachable in fullscreen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 860, height: 768 });
  await gotoFixture(page, route);
  await page.getByRole('button', { name: 'Enter full screen' }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains('result-player-stage'),
      ),
    )
    .toBe(true);
  await expect(page.locator('.result-player-stage')).toHaveCSS(
    'height',
    '768px',
  );
  await expect(page.locator('.result-player-controls')).toHaveCSS(
    'bottom',
    '0px',
  );
  await expect(
    page.getByRole('combobox', { name: 'Playback speed' }),
  ).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Volume' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Exit full screen' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Exit full screen' }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
});

test('result workspace is result-only with zero processing spectra', async ({
  page,
}) => {
  await gotoFixture(page, route);
  await expect(page.getByTestId('result-layout')).toBeVisible();
  await expect(page.getByTestId('analyze-processing-visual')).toHaveCount(0);
});

test('DEN-25 fixture renders one current workspace and one local player mount', async ({
  page,
}) => {
  await gotoFixture(
    page,
    '/app-shell-fixture/app/video/result-den-25#overview',
  );

  await expect(page.getByTestId('result-layout')).toHaveCount(1);
  await expect(page.getByLabel('Analysis artifacts')).toHaveCount(1);
  await expect(page.locator('[data-fixture-player-mount]')).toHaveCount(1);
  await expect(page.getByTestId('analyze-processing-visual')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as FixtureWindow).__fixturePlayer.seeks,
      ),
    )
    .toEqual([370]);

  await page.getByRole('tab', { name: 'Flashcards' }).click();
  await expect(
    page.locator('.result-flashcard-number').filter({ hasText: 'Card' }),
  ).toHaveText(/Card\s+12 \/ 28/);
  await expect(
    page.locator('.result-deck-progress-row span').last(),
  ).toHaveText('12 / 28');

  await page.getByRole('tab', { name: 'Summary' }).click();
  await page.getByRole('button', { name: '1:15' }).click();
  await page.evaluate(() => {
    const player = (window as unknown as FixtureWindow).__fixturePlayer;
    player.play();
    player.pause();
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const player = (window as unknown as FixtureWindow).__fixturePlayer;
        return {
          commands: player.commands,
          currentTime: player.currentTime,
          playing: player.playing,
          seeks: player.seeks,
        };
      }),
    )
    .toEqual({
      commands: [
        { type: 'seek', offsetMs: 370_000 },
        { type: 'seek', offsetMs: 75_000 },
        { type: 'play' },
        { type: 'pause' },
      ],
      currentTime: 75,
      playing: false,
      seeks: [370, 75],
    });
});

test('keeps the 18-moment desktop chapter rail on one horizontal row', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoFixture(
    page,
    '/app-shell-fixture/app/video/result-den-25#overview',
  );

  const geometry = await page
    .locator('.result-chapter-rail')
    .evaluate((rail) => {
      const cards = [...rail.querySelectorAll('.result-chapter-card')];
      return {
        firstTop: cards[0]?.getBoundingClientRect().top,
        seventhTop: cards[6]?.getBoundingClientRect().top,
        clientWidth: rail.clientWidth,
        scrollWidth: rail.scrollWidth,
      };
    });
  expect(geometry.seventhTop).toBe(geometry.firstTop);
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
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
  const timestamp = page
    .getByRole('tabpanel', { name: 'Timestamps' })
    .locator('.result-timeline')
    .getByRole('button', { name: '1:03', exact: true });
  await timestamp.scrollIntoViewIfNeeded();
  const timestampScroll = await page.evaluate(() => window.scrollY);
  await timestamp.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as FixtureWindow).__fixturePlayer.seeks.at(-1),
      ),
    )
    .toBe(63);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(timestampScroll);

  await page.getByRole('tab', { name: 'Transcript' }).click();
  await page
    .getByRole('tabpanel', { name: 'Transcript' })
    .getByRole('button', {
      name: 'Play this moment: 00:00. A video becomes reusable knowledge.',
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as FixtureWindow).__fixturePlayer.seeks.at(-1),
      ),
    )
    .toBe(0);
});

test('hands live partial artifacts to the workspace without a page reload', async ({
  page,
}) => {
  await page.goto('/app-shell-fixture/app/video/pipeline-live-partial');
  await expect(page.getByLabel('Analysis artifacts')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText('Flashcards needs retry')).toBeVisible();
  expect(
    await page.evaluate(
      () => performance.getEntriesByType('navigation').length,
    ),
  ).toBe(1);
  expect(page.url()).toContain('/pipeline-live-partial');
});

test('highlights the transcript segment for the current player time', async ({
  page,
}) => {
  await gotoFixture(page, route);
  await page.getByRole('tab', { name: 'Transcript' }).click();
  await page.evaluate(() => {
    (window as unknown as FixtureWindow).__fixturePlayer.currentTime = 63.5;
  });
  await expect(
    page
      .getByText('Important claims remain grounded.')
      .locator('xpath=ancestor::li[contains(@class,"result-transcript-line")]'),
  ).toHaveAttribute('aria-current', 'true');
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
  await page.getByRole('button', { name: 'Export to Markdown' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    'how-one-video-becomes-reusable-knowledge-markdown.md',
  );
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
  const den25OwnerRoute =
    '/app-shell-fixture/app/video/result-den-25#flashcards';
  await gotoFixture(page, den25OwnerRoute);
  const activate = async (locator: import('@playwright/test').Locator) =>
    isMobile ? locator.tap() : locator.click();
  const flashcardsDestination = () =>
    isMobile
      ? page
          .locator('.result-mobile-navigation')
          .getByRole('button', { name: 'Flashcards' })
      : page.getByRole('tab', { name: 'Flashcards' });
  if (isMobile) {
    await expect(page.locator('.result-mobile-navigation')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Flashcards' })).toBeHidden();
  }
  await expect(page.locator('[aria-label="Video source"] iframe')).toHaveCount(
    1,
  );
  await activate(flashcardsDestination());
  await activate(page.getByRole('button', { name: 'Show answer' }));
  await expect(
    page.getByRole('button', { name: 'Show question' }),
  ).toBeVisible();
  await activate(page.getByRole('button', { name: 'Got it' }));
  await expect(page.getByText('Review saved')).toBeVisible();
  await expect(page.locator('.result-deck-progress')).toHaveAttribute(
    'data-reviewed-count',
    '12',
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[aria-label="Video source"] iframe').waitFor();
  await activate(flashcardsDestination());
  await expect(page.locator('.result-deck-progress')).toHaveAttribute(
    'data-reviewed-count',
    '12',
  );
  await expect(
    page.locator('.result-deck-progress-row span').last(),
  ).toHaveText('13 / 28');
});

test('keeps unknown legacy review state truthful without fake persistence', async ({
  page,
}) => {
  await gotoFixture(page, route);
  await page.getByRole('tab', { name: 'Flashcards' }).click();

  await expect(
    page.locator('.result-deck-progress-row span').last(),
  ).toHaveText('Progress unavailable');
  await expect(
    page.getByRole('button', {
      name: /got it.*review saving is unavailable/i,
    }),
  ).toBeDisabled();
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
  await expect(
    page.getByRole('textbox', { name: 'Summary point 1' }),
  ).toHaveValue('Legacy point');
  await expect(page.getByRole('button', { name: /\d+:\d+/ })).toHaveCount(0);
});

test('removes nonessential result motion for reduced-motion users', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoFixture(
    page,
    '/app-shell-fixture/app/video/result-den-25#flashcards',
  );
  await page
    .locator('.result-mobile-navigation')
    .getByRole('button', { name: 'Flashcards' })
    .click();
  await expect(
    page
      .getByRole('button', { name: 'Show answer' })
      .locator('[data-flashcard-scene]'),
  ).toHaveCSS('transition-duration', '1e-05s');

  await page.getByLabel('Analysis artifacts').scrollIntoViewIfNeeded();
  const miniPlayer = page.getByTestId('mobile-mini-player');
  await expect(miniPlayer).toBeVisible();
  await expect(miniPlayer).toHaveCSS('animation-name', 'none');
  await miniPlayer.getByRole('button', { name: 'Chapters' }).click();
  await expect(page.getByRole('dialog', { name: 'Chapters' })).toHaveCSS(
    'animation-name',
    'none',
  );
});

test('restores Transcript reading position after visiting Flashcards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoFixture(
    page,
    '/app-shell-fixture/app/video/result-den-25#transcript',
  );
  const transcriptList = page.locator('.result-transcript-list');
  await transcriptList.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 360));
  const transcriptScroll = await page.evaluate(() => window.scrollY);

  const navigation = page.locator('.result-mobile-navigation');
  await navigation.getByRole('button', { name: 'Flashcards' }).click();
  await expect(page).toHaveURL(/#flashcards$/);
  await navigation.getByRole('button', { name: 'More' }).click();
  await page
    .getByRole('dialog', { name: 'More artifacts' })
    .getByRole('button', { name: 'Transcript' })
    .click();

  await expect(page).toHaveURL(/#transcript$/);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(transcriptScroll);
});

test('traps and restores focus for Chapters and More sheets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoFixture(page, '/app-shell-fixture/app/video/result-den-25');
  await page.getByLabel('Analysis artifacts').scrollIntoViewIfNeeded();

  const chapterTrigger = page
    .getByTestId('mobile-mini-player')
    .getByRole('button', { name: 'Chapters' });
  await chapterTrigger.focus();
  await chapterTrigger.click();
  const chapters = page.getByRole('dialog', { name: 'Chapters' });
  await expect(chapters).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      ),
    )
    .toBe(true);
  await expectFocusToCycleInside(page, chapters);
  const chaptersClose = chapters.getByRole('button', {
    name: 'Close',
    exact: true,
  });
  await chaptersClose.scrollIntoViewIfNeeded();
  await chaptersClose.click({ trial: true });
  await page.keyboard.press('Escape');
  await expect(chapters).toBeHidden();
  await expect(chapterTrigger).toBeFocused();

  const moreTrigger = page
    .locator('.result-mobile-navigation')
    .getByRole('button', { name: 'More' });
  await moreTrigger.focus();
  await moreTrigger.click();
  const more = page.getByRole('dialog', { name: 'More artifacts' });
  await expect(more).toBeVisible();
  await expectFocusToCycleInside(page, more);
  const moreClose = more.getByRole('button', {
    name: 'Close',
    exact: true,
  });
  await moreClose.scrollIntoViewIfNeeded();
  await moreClose.click({ trial: true });
  await page.keyboard.press('Escape');
  await expect(more).toBeHidden();
  await expect(moreTrigger).toBeFocused();
});

test('keeps a single mini-player through orientation changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoFixture(page, '/app-shell-fixture/app/video/result-den-25');
  await page.getByLabel('Analysis artifacts').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('mobile-mini-player')).toHaveCount(1);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('mobile-mini-player')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('mobile-mini-player')).toHaveCount(1);
  await expect(page.locator('[aria-label="Video source"] iframe')).toHaveCount(
    1,
  );
});

test('keeps core result actions available at 200 percent zoom', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 384,
    height: 512,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await gotoFixture(page, '/app-shell-fixture/app/video/result-den-25');

  await expect(page.locator('.result-mobile-navigation')).toBeVisible();
  await expect(
    page
      .locator('.result-mobile-navigation')
      .getByRole('button', { name: 'More' }),
  ).toBeVisible();
  await page.getByLabel('Analysis artifacts').scrollIntoViewIfNeeded();
  const miniPlayer = page.getByTestId('mobile-mini-player');
  await expect(miniPlayer).toBeVisible();
  await miniPlayer.getByRole('button', { name: 'Chapters' }).click();
  const chapters = page.getByRole('dialog', { name: 'Chapters' });
  const chaptersClose = chapters.getByRole('button', {
    name: 'Close',
    exact: true,
  });
  await chaptersClose.scrollIntoViewIfNeeded();
  await chaptersClose.click({ trial: true });
  await chaptersClose.click();
  await page
    .locator('.result-mobile-navigation')
    .getByRole('button', { name: 'More' })
    .click();
  const more = page.getByRole('dialog', { name: 'More artifacts' });
  const exportDestination = more.getByRole('button', { name: 'Export' });
  await exportDestination.scrollIntoViewIfNeeded();
  await exportDestination.click({ trial: true });
  const moreClose = more.getByRole('button', {
    name: 'Close',
    exact: true,
  });
  await moreClose.scrollIntoViewIfNeeded();
  await moreClose.click({ trial: true });
  await moreClose.click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('preserves long titles and 3 hour playback controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await gotoFixture(
    page,
    '/app-shell-fixture/app/video/result-den-25?visualCase=long#overview',
  );

  await expect(page.getByText('3:14:05', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Result title')).toHaveValue(
    'How purpose becomes consistent action across teams, products, decisions, and every difficult moment that follows',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel('Analysis artifacts').scrollIntoViewIfNeeded();
  const miniPlayer = page.getByTestId('mobile-mini-player');
  await expect(miniPlayer).toBeVisible();
  await expect(miniPlayer.getByText('3:05:00')).toBeVisible();
  await expect(miniPlayer.getByRole('button')).toHaveCount(3);
});

test('shows truthful partial, failed, and disconnected artifact states', async ({
  page,
}) => {
  await gotoFixture(page, '/app-shell-fixture/app/video/result-den-25-partial');
  await expect(
    page.getByText('Processing', { exact: true }).first(),
  ).toBeVisible();

  await gotoFixture(page, '/app-shell-fixture/app/video/result-partial');
  await page.getByRole('tab', { name: 'Flashcards' }).click();
  await expect(page.getByText(/could not be generated/i)).toBeVisible();

  await gotoFixture(page, '/app-shell-fixture/app/video/result-den-25#export');
  await page.getByRole('tab', { name: 'Export' }).click();
  await expect(page.getByText('Connection required')).toBeVisible();
});

test('rolls Favorite back when the fixture mutation loses the network', async ({
  page,
}) => {
  await gotoFixture(
    page,
    '/app-shell-fixture/app/video/result-den-25?favoriteSave=failure',
  );
  const favorite = page.locator('.result-page-header button[aria-pressed]');
  await expect(favorite).toHaveAccessibleName('Add to favorites');
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toHaveText(
    'Favorite could not be updated',
  );
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
});

test('keeps artifact hashes understandable through Back and Forward', async ({
  page,
}) => {
  await gotoFixture(
    page,
    '/app-shell-fixture/app/video/result-den-25#overview',
  );
  await page.getByRole('tab', { name: 'Summary' }).click();
  await page.getByRole('tab', { name: 'Flashcards' }).click();
  await expect(page).toHaveURL(/#flashcards$/);

  await page.goBack();
  await expect(page).toHaveURL(/#summary$/);
  await expect(page.getByRole('tabpanel', { name: 'Summary' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#overview$/);
  await page.goForward();
  await expect(page).toHaveURL(/#summary$/);
});

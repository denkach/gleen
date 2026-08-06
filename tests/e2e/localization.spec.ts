import type { Page, TestInfo } from '@playwright/test';

import { expect, test } from './fixtures';

const localeCookie = 'gleen_locale';
const authCookie = 'gleen-billing-e2e-session';
const authToken = process.env.PLAYWRIGHT_AUTH_FIXTURE_TOKEN;
const origin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '3000'}`;

if (authToken === undefined) {
  throw new Error('Playwright authenticated fixture token was not initialized');
}

const localeCases = {
  de: {
    bcp47: 'de-DE',
    nativeName: 'Deutsch',
    landingHeading: 'Weniger schauen. Mehr verstehen.',
    authHeading: 'Bei Gleen anmelden',
    intakeHeading: 'Mach aus einem Video etwas Nützliches.',
    historyHeading: 'Verlauf',
    resultTab: 'Übersicht',
    billingHeading: 'Abonnement',
    settingsHeading: 'Einstellungen',
  },
  es: {
    bcp47: 'es-ES',
    nativeName: 'Español',
    landingHeading: 'Mira menos. Entiende más.',
    authHeading: 'Inicia sesión en Gleen',
    intakeHeading: 'Convierte un vídeo en algo útil.',
    historyHeading: 'Historial',
    resultTab: 'Vista general',
    billingHeading: 'Suscripción',
    settingsHeading: 'Ajustes',
  },
} as const;

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

const workflowCardViewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

const workflowCardGrowthViewports = workflowCardViewports.filter(
  ({ name }) => name !== 'desktop',
);

const responsiveScreens = [
  { name: 'landing', route: '/' },
  {
    name: 'auth',
    route: '/sign-in?next=%2Fapp%2Fhistory%3Fstatus%3Dready',
  },
  { name: 'intake', route: '/app-shell-fixture?intake=ready' },
  {
    name: 'history',
    route: '/app-shell-fixture/history?visualCase=default',
  },
  {
    name: 'result',
    route: '/app-shell-fixture/app/video/result-den-25#overview',
  },
  {
    name: 'billing',
    route: '/billing-fixture/subscription?state=active',
  },
  { name: 'settings', route: '/app/settings/profile' },
] as const;

const allNativeLanguageNames = [
  'Українська',
  'Русский',
  'English',
  'Español',
  'Deutsch',
] as const;

const removedSavingMessages = [
  'Saving language…',
  'Зберігаємо мову…',
  'Сохраняем язык…',
  'Guardando idioma…',
  'Sprache wird gespeichert…',
] as const;

const panelLocales = [
  {
    code: 'uk',
    bcp47: 'uk-UA',
    nativeName: 'Українська',
    englishName: 'Ukrainian',
  },
  { code: 'ru', bcp47: 'ru-RU', nativeName: 'Русский', englishName: 'Russian' },
  { code: 'en', bcp47: 'en-GB', nativeName: 'English', englishName: 'English' },
  { code: 'es', bcp47: 'es-ES', nativeName: 'Español', englishName: 'Spanish' },
  { code: 'de', bcp47: 'de-DE', nativeName: 'Deutsch', englishName: 'German' },
] as const;

async function setLocaleCookie(page: Page, locale: keyof typeof localeCases) {
  await page.context().addCookies([
    {
      name: localeCookie,
      value: locale,
      url: origin,
      sameSite: 'Lax',
    },
  ]);
}

function getLocaleTrigger(page: Page, nativeName: string) {
  return page.getByRole('button', {
    name: new RegExp(`: ${nativeName}$`),
  });
}

function getAnyLocaleTrigger(page: Page) {
  return page
    .getByRole('button', {
      name: new RegExp(`: (${allNativeLanguageNames.join('|')})$`),
    })
    .filter({ visible: true });
}

function getLanguageRadio(page: Page, nativeName: string) {
  const locale = panelLocales.find(
    (candidate) => candidate.nativeName === nativeName,
  );
  if (!locale) throw new Error(`Unknown locale label: ${nativeName}`);
  return page.getByRole('radio', {
    name: `${locale.nativeName} ${locale.englishName}`,
    exact: true,
  });
}

async function expectCanonicalLanguageRadios(page: Page) {
  const radios = page.getByRole('radio');
  await expect(radios).toHaveCount(panelLocales.length);
  for (const [index, locale] of panelLocales.entries()) {
    await expect(radios.nth(index)).toHaveAccessibleName(
      `${locale.nativeName} ${locale.englishName}`,
    );
  }
}

async function waitForPanelMotion(page: Page) {
  await page.getByRole('dialog').evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function hideLocalVisualOverlays(page: Page) {
  await page
    .locator('.motion-cursor, nextjs-portal')
    .evaluateAll((elements) => {
      for (const element of elements) {
        (element as HTMLElement).style.setProperty(
          'display',
          'none',
          'important',
        );
      }
    });
}

function getResultNavigationControl(page: Page, name: string) {
  const role =
    (page.viewportSize()?.width ?? Number.POSITIVE_INFINITY) <= 620
      ? 'button'
      : 'tab';
  return page.getByRole(role, { name }).first();
}

async function addAuthenticatedFixtureCookie(page: Page) {
  await page.context().addCookies([
    {
      name: authCookie,
      value: authToken!,
      url: origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function clearGuestLocaleCookie(page: Page) {
  await page.context().clearCookies({ name: localeCookie });
  const cookies = await page.context().cookies(origin);
  expect(
    cookies.find((cookie) => cookie.name === localeCookie),
  ).toBeUndefined();
  expect(cookies.find((cookie) => cookie.name === authCookie)?.value).toBe(
    authToken,
  );
}

async function openAuthenticatedSettingsInRussian(page: Page) {
  await addAuthenticatedFixtureCookie(page);
  await page.context().addCookies([
    {
      name: localeCookie,
      value: 'ru',
      url: origin,
      sameSite: 'Lax',
    },
  ]);
  const response = await page.goto('/app/settings/profile', {
    waitUntil: 'networkidle',
  });
  expect(response?.ok()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru-RU');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Настройки' }),
  ).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function expectNoFlags(page: Page) {
  await expect(
    page.locator('img[alt*="flag" i], [aria-label*="flag" i]'),
  ).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toMatch(
    /[\u{1F1E6}-\u{1F1FF}]{2}/u,
  );
}

async function expectLocalizedScreen(
  page: Page,
  screen: (typeof responsiveScreens)[number]['name'],
  locale: (typeof localeCases)[keyof typeof localeCases],
) {
  await expect(page.locator('html')).toHaveAttribute('lang', locale.bcp47);
  if (screen === 'landing') {
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: locale.landingHeading,
      }),
    ).toBeVisible();
  } else if (screen === 'auth') {
    await expect(
      page.getByRole('heading', { name: locale.authHeading }),
    ).toBeVisible();
  } else if (screen === 'intake') {
    await expect(
      page.getByRole('heading', { name: locale.intakeHeading }),
    ).toBeVisible();
  } else if (screen === 'history') {
    await expect(
      page.getByRole('heading', { name: locale.historyHeading }),
    ).toBeVisible();
  } else if (screen === 'result') {
    await expect(
      getResultNavigationControl(page, locale.resultTab),
    ).toBeVisible();
  } else if (screen === 'billing') {
    await expect(
      page.getByRole('heading', { level: 1, name: locale.billingHeading }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole('heading', { level: 1, name: locale.settingsHeading }),
    ).toBeVisible();
  }
}

async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  locale: string,
  viewport: string,
  screen: string,
) {
  await page.screenshot({
    caret: 'initial',
    fullPage: true,
    path: testInfo.outputPath(`evidence-${locale}-${viewport}-${screen}.png`),
  });
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const state = { currentTime: 0 };
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
        return 1;
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
      seekTo(seconds: number) {
        state.currentTime = seconds;
      }
      setPlaybackRate() {}
      setVolume() {}
      unMute() {}
    }
    Object.assign(window, { YT: { Player } });
  });
});

test('DEN-29 settings keeps keyboard order and responsive copy without overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1249 });
  await openAuthenticatedSettingsInRussian(page);

  await expectNoHorizontalOverflow(page);
  await expect(page.getByText('Сохраняем…')).toHaveCount(0);
  const interfaceSelect = page.getByLabel('Язык элементов управления Gleen');
  const interfaceSave = page.getByRole('button', {
    name: 'Сохранить язык интерфейса',
  });
  const outputSelect = page.getByLabel('Язык будущего создаваемого контента');
  const outputSave = page.getByRole('button', {
    name: 'Сохранить язык результатов',
  });

  await interfaceSelect.focus();
  await page.keyboard.press('Tab');
  await expect(interfaceSave).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(outputSelect).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(outputSave).toBeFocused();
});

for (const viewport of [
  { name: '1600x1000-desktop', width: 1600, height: 1000 },
  { name: '390x1249-mobile', width: 390, height: 1249 },
] as const) {
  test(`DEN-29 ${viewport.name} Russian settings visual`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openAuthenticatedSettingsInRussian(page);
    await expectNoHorizontalOverflow(page);
    await hideLocalVisualOverlays(page);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await expect(page).toHaveScreenshot(
      `den-29-${viewport.name}-settings-ru.png`,
      {
        animations: 'disabled',
        caret: 'hide',
      },
    );
  });
}

test('@localization guest selection is immediate, route-stable, quiet, and durable', async ({
  page,
}) => {
  let markLocaleActionPending!: () => void;
  let releaseLocaleAction!: () => void;
  const localeActionPending = new Promise<void>((resolve) => {
    markLocaleActionPending = resolve;
  });
  const localeActionGate = new Promise<void>((resolve) => {
    releaseLocaleAction = resolve;
  });

  await page.route('**/*', async (route) => {
    const request = route.request();
    if (
      request.method() === 'POST' &&
      request.headers()['next-action'] !== undefined
    ) {
      markLocaleActionPending();
      await localeActionGate;
    }
    await route.continue();
  });

  await page.goto('/');
  const originalUrl = page.url();

  await getLocaleTrigger(page, 'English').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectCanonicalLanguageRadios(page);
  await getLanguageRadio(page, 'Deutsch').click();
  await localeActionPending;

  try {
    const immediateState = await page.evaluate((cookieName) => {
      const trigger = document.querySelector<HTMLElement>(
        '.locale-switcher__trigger',
      );
      return {
        cookie: document.cookie
          .split('; ')
          .find((cookie) => cookie.startsWith(`${cookieName}=`)),
        htmlLanguage: document.documentElement.lang,
        triggerText: trigger?.innerText.replace(/\s+/g, ' ').trim(),
        url: window.location.href,
      };
    }, localeCookie);

    expect(immediateState).toEqual({
      cookie: 'gleen_locale=de',
      htmlLanguage: 'de-DE',
      triggerText: 'Deutsch ›',
      url: originalUrl,
    });
    for (const savingMessage of removedSavingMessages) {
      await expect(page.getByText(savingMessage, { exact: true })).toHaveCount(
        0,
      );
    }
  } finally {
    releaseLocaleAction();
  }

  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Sprache wurde auf Deutsch geändert' }),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(
    page.getByRole('heading', { name: 'Weniger schauen. Mehr verstehen.' }),
  ).toBeVisible();
});

test('@localization authenticated profile keeps Spanish across new page, reload, shell, History, result, and billing routes', async ({
  page,
}) => {
  await addAuthenticatedFixtureCookie(page);
  const intakeRoute = '/app-shell-fixture?intake=ready';
  await page.goto(intakeRoute);
  const originalUrl = page.url();

  await getAnyLocaleTrigger(page).click();
  await getLanguageRadio(page, 'Español').click();
  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(
    page.getByRole('heading', { name: 'Convierte un vídeo en algo útil.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Historial', exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Idioma cambiado a Español' }),
  ).toBeVisible();

  await clearGuestLocaleCookie(page);
  const restoredPage = await page.context().newPage();
  await restoredPage.goto('/app');
  await expect(restoredPage.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(
    restoredPage.getByRole('heading', {
      name: 'Convierte un vídeo en algo útil.',
    }),
  ).toBeVisible();
  await restoredPage.reload();
  await expect(restoredPage.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(
    restoredPage.getByRole('heading', {
      name: 'Convierte un vídeo en algo útil.',
    }),
  ).toBeVisible();
  await clearGuestLocaleCookie(restoredPage);

  const productionHistoryResponse = await restoredPage.goto('/app/history', {
    waitUntil: 'domcontentloaded',
  });
  expect(productionHistoryResponse?.ok()).toBe(true);
  await expect(
    restoredPage.getByRole('heading', { level: 1, name: 'Historial' }),
  ).toBeVisible();
  await expect(restoredPage.locator('body')).not.toContainText(
    'Functions cannot be passed directly to Client Components',
  );

  await restoredPage.goto('/app-shell-fixture/history?visualCase=default');
  await expect(restoredPage).toHaveURL(
    /\/app-shell-fixture\/history\?visualCase=default$/,
  );
  await expect(
    restoredPage.getByRole('heading', { name: 'Historial' }),
  ).toBeVisible();

  await restoredPage.goto(
    '/app-shell-fixture/app/video/result-den-25#overview',
  );
  await expect(restoredPage).toHaveURL(
    /\/app-shell-fixture\/app\/video\/result-den-25#overview$/,
  );
  await expect(
    getResultNavigationControl(restoredPage, 'Vista general'),
  ).toBeVisible();

  await restoredPage.goto('/billing-fixture/subscription?state=active');
  await expect(restoredPage).toHaveURL(
    /\/billing-fixture\/subscription\?state=active$/,
  );
  await expect(
    restoredPage.getByRole('heading', { level: 1, name: 'Suscripción' }),
  ).toBeVisible();

  if ((restoredPage.viewportSize()?.width ?? Number.POSITIVE_INFINITY) <= 760) {
    const billingNavigation = restoredPage.getByRole('navigation', {
      name: 'Navegación móvil de facturación',
    });
    const currentPlan = billingNavigation.getByRole('link', {
      name: 'Plan',
      exact: true,
    });

    await expect(billingNavigation).toBeVisible();
    await expect(currentPlan).toHaveAttribute('aria-current', 'page');
    await expect(currentPlan).toHaveAttribute(
      'href',
      '/billing-fixture/subscription?locale=es',
    );
    await expect(
      billingNavigation.getByRole('link', { name: 'Uso', exact: true }),
    ).toHaveAttribute('href', '/billing-fixture/usage?locale=es');
  } else {
    await expect(
      restoredPage
        .getByRole('link', { name: 'Suscripción', exact: true })
        .first(),
    ).toHaveAttribute('href', '/app/subscription');
  }
});

test('@localization interface switching leaves the Ukrainian output locale selected', async ({
  page,
}) => {
  const route = '/app-shell-fixture?intake=ready';
  await page.goto(route);
  const originalUrl = page.url();
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await page.getByRole('radio', { name: 'Українська' }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  await getLocaleTrigger(page, 'English').click();
  await getLanguageRadio(page, 'Deutsch').click();

  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await page.getByRole('button', { name: 'Erweiterte Optionen' }).click();
  await expect(page.getByRole('radio', { name: 'Українська' })).toBeChecked();
  await expect(page.locator('input[name="outputLocale"]')).toHaveValue('uk');
});

for (const entryPoint of [
  { name: 'landing desktop', route: '/', width: 1600, compact: false },
  { name: 'landing mobile', route: '/', width: 390, compact: false },
  { name: 'auth desktop', route: '/sign-in', width: 1600, compact: false },
  { name: 'auth mobile', route: '/sign-in', width: 390, compact: false },
  { name: 'app desktop', route: '/app', width: 1600, compact: false },
  { name: 'app mobile', route: '/app', width: 390, compact: true },
] as const) {
  test(`@localization ${entryPoint.name} entry point opens the shared five-radio panel`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: entryPoint.width, height: 844 });
    await page.context().addCookies([
      {
        name: localeCookie,
        value: 'en',
        url: origin,
        sameSite: 'Lax',
      },
    ]);
    if (entryPoint.route === '/app') await addAuthenticatedFixtureCookie(page);
    const response = await page.goto(entryPoint.route, {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.ok()).toBe(true);
    await page.waitForLoadState('networkidle');

    const trigger = getAnyLocaleTrigger(page);
    await expect(trigger).toBeVisible();
    if (entryPoint.compact) {
      await expect(
        trigger.locator('.locale-switcher__compact-icon'),
      ).toBeVisible();
    } else {
      await expect(trigger).toContainText('English');
    }
    await trigger.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expectCanonicalLanguageRadios(page);
    await expectNoFlags(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test('@localization shortcut, radio keys, focus trap, Escape, and focus return work', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = getLocaleTrigger(page, 'English');
  await trigger.focus();

  await page.keyboard.press('Meta+K');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const keyboardFocusedEnglish = getLanguageRadio(page, 'English');
  await expect(keyboardFocusedEnglish).toBeFocused();
  await expect
    .poll(() =>
      keyboardFocusedEnglish.evaluate(
        (element) => getComputedStyle(element, '::before').opacity,
      ),
    )
    .toBe('1');

  for (let step = 0; step < panelLocales.length + 2; step += 1) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }

  await getLanguageRadio(page, 'English').focus();
  await page.keyboard.press('ArrowDown');
  await expect(getLanguageRadio(page, 'Español')).toBeFocused();
  await page.keyboard.press('End');
  await expect(getLanguageRadio(page, 'Deutsch')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(getLanguageRadio(page, 'Українська')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(getLanguageRadio(page, 'Українська')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(getLanguageRadio(page, 'Deutsch')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(dialog).toBeHidden();
  await expect(getLocaleTrigger(page, 'Deutsch')).toBeFocused();

  await page.keyboard.press('Control+K');
  await expect(dialog).toBeVisible();
  await expect(getLanguageRadio(page, 'Deutsch')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(getLocaleTrigger(page, 'Deutsch')).toBeFocused();
});

for (const [localeKey, locale] of Object.entries(localeCases) as Array<
  [keyof typeof localeCases, (typeof localeCases)[keyof typeof localeCases]]
>) {
  for (const viewport of viewports) {
    test(`@localization ${locale.nativeName} has no horizontal overflow at ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await setLocaleCookie(page, localeKey);

      for (const screen of responsiveScreens) {
        if (screen.name === 'settings') {
          await addAuthenticatedFixtureCookie(page);
        }
        let response = await page.goto(screen.route, {
          waitUntil: 'domcontentloaded',
        });
        if (screen.name === 'settings') {
          await getAnyLocaleTrigger(page).click();
          await getLanguageRadio(page, locale.nativeName).click();
          await expect(page.locator('html')).toHaveAttribute(
            'lang',
            locale.bcp47,
          );
          await clearGuestLocaleCookie(page);
          response = await page.reload({ waitUntil: 'domcontentloaded' });
        }
        expect(
          response?.ok(),
          `${screen.name} returned a non-success status`,
        ).toBe(true);
        await expectLocalizedScreen(page, screen.name, locale);
        await expectNoHorizontalOverflow(page);
        await expectNoFlags(page);
        await captureEvidence(
          page,
          testInfo,
          localeKey,
          viewport.name,
          screen.name,
        );
      }
    });
  }
}

test('@localization reduced motion keeps locale switching and existing motion reduced', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(
    await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  ).toBe(true);
  await expect(page.locator('.landing-reference')).toHaveClass(/reduce-motion/);
  await expect(page.locator('.motion-cursor')).toHaveCount(0);

  const trigger = getLocaleTrigger(page, 'English');
  await trigger.click();
  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  const reducedDurations = await panel.evaluate((element) => {
    const toMilliseconds = (value: string) =>
      value.split(',').map((part) => {
        const duration = Number.parseFloat(part);
        return part.trim().endsWith('ms') ? duration : duration * 1000;
      });
    const read = (target: Element, pseudo?: string) => {
      const style = getComputedStyle(target, pseudo);
      return [
        ...toMilliseconds(style.animationDuration),
        ...toMilliseconds(style.transitionDuration),
      ];
    };
    const row = element.querySelector('.locale-language-panel__option');
    if (!row) throw new Error('Language row was not rendered');
    return {
      edge: read(element, '::before'),
      panel: read(element),
      row: read(row),
    };
  });
  for (const durations of Object.values(reducedDurations)) {
    expect(Math.max(...durations)).toBeLessThanOrEqual(0.01);
  }
  await getLanguageRadio(page, 'Deutsch').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  const triggerMotion = await getLocaleTrigger(page, 'Deutsch').evaluate(
    (element) => {
      const style = getComputedStyle(element);
      return {
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        transitionDuration: style.transitionDuration,
      };
    },
  );
  expect(triggerMotion.animationName).toBe('none');
  expect(
    Number.parseFloat(triggerMotion.animationDuration),
  ).toBeLessThanOrEqual(0.001);
  expect(
    Number.parseFloat(triggerMotion.transitionDuration),
  ).toBeLessThanOrEqual(0.001);
});

test('@localization open panel matches approved desktop and mobile geometry', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Cross-viewport visual baselines are owned by desktop Chromium.',
  );

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/');
  const desktopTrigger = getLocaleTrigger(page, 'English');
  const desktopTriggerBox = await desktopTrigger.boundingBox();
  if (!desktopTriggerBox) throw new Error('Desktop locale trigger has no box');
  await desktopTrigger.click();
  const desktopPanel = page.getByRole('dialog');
  await expect(desktopPanel).toBeVisible();
  await waitForPanelMotion(page);

  const desktopGeometry = await desktopPanel.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    const rowHeights = [
      ...element.querySelectorAll('.locale-language-panel__option'),
    ].map((row) => row.getBoundingClientRect().height);
    const style = getComputedStyle(element);
    const edgeStyle = getComputedStyle(element, '::before');
    const scrimStyle = getComputedStyle(
      document.querySelector('.locale-language-panel__scrim')!,
    );
    return {
      background: style.backgroundImage,
      borderRadius: Number.parseFloat(style.borderRadius),
      edgeWidth: Number.parseFloat(edgeStyle.width),
      panelRight: panel.right,
      rowHeights,
      scrimBackdrop: scrimStyle.backdropFilter,
      width: panel.width,
    };
  });
  expect(desktopGeometry.width).toBe(390);
  expect(desktopGeometry.borderRadius).toBe(18);
  expect(desktopGeometry.edgeWidth).toBe(2);
  expect(desktopGeometry.rowHeights).toEqual([88, 88, 88, 88, 88]);
  expect(
    Math.abs(
      desktopGeometry.panelRight -
        (desktopTriggerBox.x + desktopTriggerBox.width),
    ),
  ).toBeLessThanOrEqual(1);
  expect(desktopGeometry.background).toContain('linear-gradient');
  expect(desktopGeometry.scrimBackdrop).toContain('blur(2px)');
  expect(
    await getLanguageRadio(page, 'English').evaluate(
      (element) => getComputedStyle(element, '::before').opacity,
    ),
  ).toBe('0');
  await hideLocalVisualOverlays(page);
  await expect(desktopPanel).toHaveScreenshot(
    'den-22-1600x900-desktop-language-panel-open.png',
    {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.001,
      scale: 'css',
      threshold: 0.1,
    },
  );
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    path: testInfo.outputPath('den-22-language-panel-desktop-1600x900.png'),
    style: '.motion-cursor, nextjs-portal { display: none !important; }',
  });

  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileTrigger = getLocaleTrigger(page, 'English');
  await mobileTrigger.click();
  const mobilePanel = page.getByRole('dialog');
  await expect(mobilePanel).toBeVisible();
  await waitForPanelMotion(page);
  const mobileGeometry = await mobilePanel.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    const rowHeights = [
      ...element.querySelectorAll('.locale-language-panel__option'),
    ].map((row) => row.getBoundingClientRect().height);
    return {
      bottom: window.innerHeight - panel.bottom,
      borderRadius: Number.parseFloat(getComputedStyle(element).borderRadius),
      left: panel.left,
      right: window.innerWidth - panel.right,
      rowHeights,
      width: panel.width,
    };
  });
  expect(mobileGeometry).toEqual({
    bottom: 12,
    borderRadius: 24,
    left: 12,
    right: 12,
    rowHeights: [78, 78, 78, 78, 78],
    width: 366,
  });
  expect(
    await getLanguageRadio(page, 'English').evaluate(
      (element) => getComputedStyle(element, '::before').opacity,
    ),
  ).toBe('0');
  await hideLocalVisualOverlays(page);
  await expect(mobilePanel).toHaveScreenshot(
    'den-22-390x844-mobile-language-panel-open.png',
    {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.001,
      scale: 'css',
      threshold: 0.1,
    },
  );
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    path: testInfo.outputPath('den-22-language-panel-mobile-390x844.png'),
    style: '.motion-cursor, nextjs-portal { display: none !important; }',
  });
});

test('@localization workflow cards keep one height across all locales and viewports', async ({
  page,
}) => {
  for (const viewport of workflowCardViewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    for (const locale of panelLocales) {
      await page.context().addCookies([
        {
          name: localeCookie,
          value: locale.code,
          url: origin,
          sameSite: 'Lax',
        },
      ]);
      await page.goto(
        `/?workflowLocale=${locale.code}&workflowViewport=${viewport.name}#how`,
      );
      await expect(page.locator('html')).toHaveAttribute('lang', locale.bcp47);

      const metrics = await page.locator('.process-step').evaluateAll((cards) =>
        cards.map((card) => {
          const element = card as HTMLElement;
          return {
            height: element.offsetHeight,
            copyFits:
              element.scrollHeight <= element.clientHeight &&
              element.scrollWidth <= element.clientWidth,
          };
        }),
      );

      expect(metrics).toHaveLength(4);
      const heights = metrics.map(({ height }) => height);
      expect(heights).toEqual([heights[0], heights[0], heights[0], heights[0]]);
      expect(heights.every((height) => height >= 200)).toBe(true);
      expect(metrics.every(({ copyFits }) => copyFits)).toBe(true);
    }
  }
});

test('@localization workflow cards grow together under accessibility text pressure', async ({
  page,
}) => {
  for (const viewport of workflowCardGrowthViewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.context().addCookies([
      {
        name: localeCookie,
        value: 'en',
        url: origin,
        sameSite: 'Lax',
      },
    ]);
    await page.goto(`/?workflowGrowth=${viewport.name}#how`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await page.addStyleTag({
      content: `
        .landing-reference .process-step:first-child p {
          font-size: 32px !important;
          line-height: 2 !important;
        }
      `,
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const layout = await page.locator('.process-step').evaluateAll((cards) => {
      const grid = cards[0]?.parentElement as HTMLElement | undefined;
      const scene = grid?.parentElement as HTMLElement | undefined;

      return {
        gridFitsScene:
          grid !== undefined &&
          scene !== undefined &&
          grid.offsetTop >= 0 &&
          grid.offsetTop + grid.offsetHeight <= scene.clientHeight,
        cards: cards.map((card) => {
          const element = card as HTMLElement;
          const copy = element.querySelector<HTMLElement>('p');
          const styles = getComputedStyle(element);
          const requiredHeight = copy
            ? Math.ceil(
                copy.offsetTop +
                  copy.offsetHeight +
                  Number.parseFloat(styles.paddingBottom) +
                  Number.parseFloat(styles.borderBottomWidth),
              )
            : 0;

          return {
            height: element.offsetHeight,
            requiredHeight,
            copyFits:
              element.scrollHeight <= element.clientHeight &&
              element.scrollWidth <= element.clientWidth,
          };
        }),
      };
    });

    expect(layout.cards).toHaveLength(4);
    expect(layout.cards[0]?.requiredHeight).toBeGreaterThan(200);
    const heights = layout.cards.map(({ height }) => height);
    expect(heights).toEqual([heights[0], heights[0], heights[0], heights[0]]);
    expect(heights.every((height) => height > 200)).toBe(true);
    expect(layout.cards.every(({ copyFits }) => copyFits)).toBe(true);
    expect(layout.gridFitsScene).toBe(true);
  }
});

for (const locale of panelLocales) {
  test(`@localization ${locale.nativeName} panel copy fits at 320px without horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.context().addCookies([
      {
        name: localeCookie,
        value: locale.code,
        url: origin,
        sameSite: 'Lax',
      },
    ]);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', locale.bcp47);
    await getLocaleTrigger(page, locale.nativeName).click();
    const panel = page.getByRole('dialog');
    await expect(panel).toBeVisible();
    await waitForPanelMotion(page);
    await expectCanonicalLanguageRadios(page);
    await expectNoHorizontalOverflow(page);

    const clipping = await panel.evaluate((element) => {
      const panelRect = element.getBoundingClientRect();
      const copy = [
        ...element.querySelectorAll<HTMLElement>(
          '.locale-language-panel__title, .locale-language-panel__description, .locale-language-panel__native-name, .locale-language-panel__english-name, .locale-language-panel__footer',
        ),
      ];
      return {
        copyFits: copy.every(
          (node) =>
            node.scrollWidth <= node.clientWidth &&
            node.getBoundingClientRect().left >= panelRect.left &&
            node.getBoundingClientRect().right <= panelRect.right,
        ),
        panelLeft: panelRect.left,
        panelRight: window.innerWidth - panelRect.right,
        panelScrollWidth: element.scrollWidth,
        panelWidth: element.clientWidth,
      };
    });
    expect(clipping.copyFits).toBe(true);
    expect(clipping.panelLeft).toBeCloseTo(12, 0);
    expect(clipping.panelRight).toBeCloseTo(12, 0);
    expect(clipping.panelScrollWidth).toBe(clipping.panelWidth);
  });
}

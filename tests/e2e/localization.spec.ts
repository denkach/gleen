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
  return page.getByRole('button', {
    name: new RegExp(`: (${allNativeLanguageNames.join('|')})$`),
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

test('@localization guest locale keeps the auth route and query and persists after reload', async ({
  page,
}) => {
  const route = '/sign-in?next=%2Fapp%2Fhistory%3Fstatus%3Dready';
  await page.goto(route);
  const originalUrl = page.url();

  await getLocaleTrigger(page, 'English').click();
  await page.getByRole('menuitem', { name: 'Deutsch' }).click();

  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(
    page.getByRole('heading', { name: 'Bei Gleen anmelden' }),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(
    page.getByRole('heading', { name: 'Bei Gleen anmelden' }),
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
  await page.getByRole('menuitem', { name: 'Español' }).click();
  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(
    page.getByRole('heading', { name: 'Convierte un vídeo en algo útil.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Historial', exact: true }).first(),
  ).toBeVisible();

  await clearGuestLocaleCookie(page);
  const restoredPage = await page.context().newPage();
  await restoredPage.goto('/app/settings/profile');
  await expect(restoredPage.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(
    restoredPage.getByRole('heading', { level: 1, name: 'Ajustes' }),
  ).toBeVisible();
  await restoredPage.reload();
  await expect(restoredPage.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(
    restoredPage.getByRole('heading', { level: 1, name: 'Ajustes' }),
  ).toBeVisible();
  await clearGuestLocaleCookie(restoredPage);

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
  await page.getByRole('menuitem', { name: 'Deutsch' }).click();

  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await page.getByRole('button', { name: 'Erweiterte Optionen' }).click();
  await expect(page.getByRole('radio', { name: 'Українська' })).toBeChecked();
  await expect(page.locator('input[name="outputLocale"]')).toHaveValue('uk');
});

test('@localization all five native locale labels work by keyboard with visible focus and no flags', async ({
  page,
}) => {
  await page.goto('/');
  let selectedNativeName = 'English';

  for (const [index, nativeName] of allNativeLanguageNames.entries()) {
    const trigger = getLocaleTrigger(page, selectedNativeName);
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    const menuItems = page.getByRole('menuitem');
    await expect(menuItems).toHaveCount(5);
    await expect(menuItems).toHaveText([...allNativeLanguageNames]);
    await page.keyboard.press('Home');
    await expect(
      page.getByRole('menuitem', { name: allNativeLanguageNames[0] }),
    ).toBeFocused();
    for (let step = 0; step < index; step += 1) {
      await page.keyboard.press('ArrowDown');
      await expect(
        page.getByRole('menuitem', {
          name: allNativeLanguageNames[step + 1],
        }),
      ).toBeFocused();
    }
    const option = page.getByRole('menuitem', { name: nativeName });
    await expect(option).toBeFocused();
    const focus = await option.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.boxShadow;
    });
    await expect(option).toHaveAttribute('data-highlighted', '');
    expect(focus).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(getLocaleTrigger(page, nativeName)).toBeVisible();
    selectedNativeName = nativeName;
  }

  await expectNoFlags(page);
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
          await page.getByRole('menuitem', { name: locale.nativeName }).click();
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
  const menu = page.getByRole('menu');
  const menuMotion = await menu.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      animationDuration: style.animationDuration,
      transitionDuration: style.transitionDuration,
    };
  });
  expect(Number.parseFloat(menuMotion.animationDuration)).toBeLessThanOrEqual(
    0.001,
  );
  expect(Number.parseFloat(menuMotion.transitionDuration)).toBeLessThanOrEqual(
    0.001,
  );
  await page.getByRole('menuitem', { name: 'Deutsch' }).click();
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

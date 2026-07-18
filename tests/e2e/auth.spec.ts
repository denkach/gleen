import { expect, test } from './fixtures';

const authViewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

test('opens account access from the landing-page sign-in action', async ({
  page,
}) => {
  await page.goto('/');

  const signIn = page.getByRole('link', { name: 'Sign in' });
  await expect(signIn).toHaveAttribute('href', '/sign-in');
  await signIn.click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole('heading', { name: 'Sign in to Gleen' }),
  ).toBeVisible();
});

test('landing URL preserves the normalized analysis continuation in sign in next', async ({
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

test('authenticated continuation auto-submits exactly once with the default artifacts', async ({
  page,
}) => {
  const actionRequests: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/app-shell-fixture'
    ) {
      actionRequests.push(request.postData() ?? '');
    }
  });
  await page.goto(
    '/app-shell-fixture?continuation=' +
      encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  );

  await expect(page.getByTestId('analyze-processing-visual')).toHaveAttribute(
    'data-submitted-url',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  );
  await expect.poll(() => actionRequests.length).toBe(1);
  await expect
    .poll(async () => {
      const before = actionRequests.length;
      await page.waitForTimeout(500);
      return actionRequests.length === before;
    })
    .toBe(true);
  expect(actionRequests).toHaveLength(1);
  const fields = [
    ...actionRequests[0].matchAll(/name="([^"]+)"[^\n]*\n\r?\n([^\r\n]*)/g),
  ].map(([, name, value]) => [name, value] as const);
  expect(
    fields
      .filter(([name]) => name.endsWith('artifacts'))
      .map(([, value]) => value),
  ).toEqual(['summary', 'timestamps', 'transcript']);
  expect(fields.some(([, value]) => value === 'flashcards')).toBe(false);
});

for (const viewport of authViewports) {
  test(`renders approved account access at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto('/sign-in');

    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { name: 'Return to the signal.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Sign in to Gleen' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continue with Google' }),
    ).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const gridColumns = await page
      .locator('.auth-page')
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    if (viewport.width > 980) {
      expect(gridColumns.split(' ')).toHaveLength(2);
      const authBox = await page.locator('.auth-page').boundingBox();
      expect(authBox?.y).toBe(0);
      expect(authBox?.height).toBe(viewport.height);
      await expect(page.locator('.auth-page')).toHaveCSS(
        'place-content',
        'normal',
      );
      await expect(page.locator('.auth-page')).toHaveCSS('padding', '0px');
      await expect(page.locator('.auth-visual-copy h1')).toHaveCSS(
        'font-weight',
        '700',
      );
      await expect(page.locator('.auth-card h2')).toHaveCSS(
        'font-weight',
        '700',
      );
      await expect(page.locator('.input-icon svg')).toBeVisible();
    } else expect(gridColumns.split(' ')).toHaveLength(1);

    if (viewport.width <= 720) {
      await expect(page.locator('.auth-visual')).toHaveCSS(
        'min-height',
        '330px',
      );
    }
  });
}

test('switches between secure-link and password access', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Use password instead' }).click();

  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sign in with password' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Forgot your password?' }),
  ).toBeVisible();
});

test('renders verification, recovery, reset, and expiry states', async ({
  page,
}) => {
  const routes = [
    ['/verify-email', 'Check your email'],
    ['/forgot-password', 'Reset your password'],
    ['/reset-password', 'Choose a new password'],
    ['/session-expired', 'Your session expired'],
  ] as const;

  for (const [route, heading] of routes) {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('keeps account access usable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sign-in');

  await expect(
    page.getByRole('heading', { name: 'Sign in to Gleen' }),
  ).toBeVisible();
  expect(['0.001ms', '1e-06s']).toContain(
    await page
      .locator('.auth-prism .ray')
      .first()
      .evaluate((element) => getComputedStyle(element).animationDuration),
  );
});

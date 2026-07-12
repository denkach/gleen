import { expect, test } from '@playwright/test';

test('returns an exact 404 for the UI preview in production', async ({
  page,
}) => {
  const response = await page.goto('/ui');

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Gleen UI primitives' }),
  ).toHaveCount(0);
});

for (const path of [
  '/app-shell-fixture',
  '/app-shell-fixture?intake=ready',
  '/app-shell-fixture?intake=duplicate',
  '/app-shell-fixture?intake=invalid-url',
  '/app-shell-fixture?intake=video-unavailable',
  '/app-shell-fixture?intake=transcript-unavailable',
  '/app-shell-fixture?intake=provider-outage',
  '/app-shell-fixture?intake=reanalysis',
  '/app-shell-fixture/app/video/33333333-3333-4333-8333-333333333333',
]) {
  test(`returns an exact 404 for ${path} in production`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', {
        name: 'Turn a video into something useful.',
      }),
    ).toHaveCount(0);
  });
}

import { expect, test } from '@playwright/test';

test('loads the frontend foundation home page', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle('Gleen');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Gleen frontend foundation',
    }),
  ).toBeVisible();
});

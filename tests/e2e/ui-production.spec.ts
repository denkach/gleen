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

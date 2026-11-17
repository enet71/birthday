import { expect, test } from '@playwright/test';

test('the home page shows the birthday calendar', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Birthdly/);
  await expect(page.getByRole('heading', { level: 1, name: 'Birthday calendar' })).toBeVisible();
});

test('an unknown page answers 404', async ({ request }) => {
  const response = await request.get('/this-page-does-not-exist');

  expect(response.status()).toBe(404);
});

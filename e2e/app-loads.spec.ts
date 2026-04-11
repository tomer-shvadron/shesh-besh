import { expect, test } from '@playwright/test';

test('app loads and shows the game screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
});

test('app has correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Shesh-Besh');
});

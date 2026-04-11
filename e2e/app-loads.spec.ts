import { expect, test } from '@playwright/test';

import { clearIndexedDB, dismissTutorialIfVisible } from './fixtures/test-helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/shesh-besh/');
  await clearIndexedDB(page);
  await page.goto('/shesh-besh/');
  await page.waitForLoadState('networkidle');
  await dismissTutorialIfVisible(page);
});

test('app loads and shows the game screen', async ({ page }) => {
  await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
});

test('app has correct title', async ({ page }) => {
  await expect(page).toHaveTitle('Shesh-Besh');
});

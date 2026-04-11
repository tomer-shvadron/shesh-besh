import { expect, test } from '@playwright/test';

import { clearIndexedDB, dismissNewGameDialogIfVisible, dismissTutorialIfVisible } from './fixtures/test-helpers';

test.describe('PWA Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
    await dismissNewGameDialogIfVisible(page);
  });

  test('manifest link is present in document head', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
    const href = await manifestLink.getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('viewport meta tag exists with correct content', async ({ page }) => {
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveCount(1);
    const content = await viewportMeta.getAttribute('content');
    expect(content).toContain('width=device-width');
    expect(content).toContain('initial-scale=1');
  });

  test('service worker registers', async ({ page }) => {
    // Wait for service worker to be active
    const swController = await page
      .waitForFunction(
        () => navigator.serviceWorker?.controller !== null && navigator.serviceWorker?.controller !== undefined,
        { timeout: 15000 },
      )
      .catch(() => null);
    // If the SW didn't become controller in time, at least verify registration was attempted
    if (!swController) {
      const swRegistered = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker?.getRegistration();
        return reg !== undefined;
      });
      expect(swRegistered).toBe(true);
    } else {
      expect(swController).toBeTruthy();
    }
  });

  test('app works offline', async ({ page, context }) => {
    // Make sure app is fully loaded first
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    // Go offline
    await context.setOffline(true);
    // Reload while offline
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    // App should still render (served from service worker cache)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    // Restore online
    await context.setOffline(false);
  });
});

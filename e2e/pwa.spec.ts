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
    // The PWA uses registerType: 'autoUpdate', which may trigger a page reload when a new
    // SW installs. Wait for any in-flight reload to settle before checking SW state.
    await page.waitForLoadState('networkidle');

    // Check SW registration — either already controlling or at least installed/waiting.
    const swState = await page.evaluate(async () => {
      // Fast path: SW already controlling this page
      if (navigator.serviceWorker?.controller) {
        return 'controlling';
      }
      // Slow path: SW installed or waiting (first visit after a new build)
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.active ?? reg?.installing ?? reg?.waiting) {
        return 'registered';
      }
      return 'none';
    });

    expect(swState).not.toBe('none');
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

import { expect, test } from '@playwright/test';

import {
  clearIndexedDB,
  dismissNewGameDialogIfVisible,
  dismissTutorialIfVisible,
} from './fixtures/test-helpers';

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
    // Dismiss the new game dialog so the control bar is accessible
    await dismissNewGameDialogIfVisible(page);
  });

  async function openSettings(page: Parameters<typeof dismissTutorialIfVisible>[0]): Promise<void> {
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.getByRole('dialog', { name: /settings/i }).waitFor({ state: 'visible', timeout: 5000 });
  }

  test('settings panel has all controls', async ({ page }) => {
    await openSettings(page);
    const panel = page.getByRole('dialog', { name: /settings/i });
    // Theme control
    await expect(panel.getByRole('button', { name: /^dark$/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /^light$/i })).toBeVisible();
    // Board style control
    await expect(panel.getByRole('button', { name: /realistic/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /classic/i })).toBeVisible();
    // Sound toggle
    await expect(panel.getByRole('switch')).toBeVisible();
    await expect(panel.getByText('Sound Effects')).toBeVisible();
    // Difficulty selector
    await expect(panel.getByRole('button', { name: /^easy$/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /^medium$/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /^hard$/i })).toBeVisible();
  });

  test('theme toggle changes html class', async ({ page }) => {
    await openSettings(page);
    // Default is dark — html should not have "light"
    await expect(page.locator('html')).not.toHaveClass(/light/);
    // Click Light
    await page.getByRole('button', { name: /^light$/i }).click();
    await expect(page.locator('html')).toHaveClass(/light/, { timeout: 3000 });
    // Click Dark
    await page.getByRole('button', { name: /^dark$/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/light/, { timeout: 3000 });
  });

  test('settings persist across reload', async ({ page }) => {
    await openSettings(page);
    // Switch to Light theme
    await page.getByRole('button', { name: /^light$/i }).click();
    await expect(page.locator('html')).toHaveClass(/light/, { timeout: 3000 });
    // Close settings
    await page.getByRole('button', { name: /close settings/i }).click();
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
    // Theme should still be light (loaded from IndexedDB)
    await expect(page.locator('html')).toHaveClass(/light/, { timeout: 5000 });
  });

  test('sound toggle works', async ({ page }) => {
    await openSettings(page);
    const soundToggle = page.getByRole('switch');
    // Check initial state
    const initialChecked = await soundToggle.getAttribute('aria-checked');
    // Toggle off
    await soundToggle.click();
    const afterToggle = await soundToggle.getAttribute('aria-checked');
    expect(afterToggle).not.toBe(initialChecked);
    // Toggle back
    await soundToggle.click();
    const restored = await soundToggle.getAttribute('aria-checked');
    expect(restored).toBe(initialChecked);
  });
});

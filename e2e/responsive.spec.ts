import { expect, test } from '@playwright/test';

import {
  clearIndexedDB,
  dismissNewGameDialogIfVisible,
  dismissTutorialIfVisible,
  startNewPvPGame,
} from './fixtures/test-helpers';

/**
 * Responsive / viewport E2E — runs across all four projects defined in
 * playwright.config.ts (desktop chromium, mobile-portrait, mobile-landscape,
 * tablet). Each test below asserts behaviour appropriate for the viewport
 * currently in use.
 */
test.describe('Responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
  });

  test('board canvas is visible and sized correctly', async ({ page }) => {
    await dismissNewGameDialogIfVisible(page);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 8000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Board is always at least 200×100 CSS pixels on every supported viewport.
      expect(box.width).toBeGreaterThan(200);
      expect(box.height).toBeGreaterThan(100);

      // Canvas must fit within the viewport.
      const viewport = page.viewportSize();
      if (viewport) {
        expect(box.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(box.height).toBeLessThanOrEqual(viewport.height + 1);
      }
    }
  });

  test('control bar is reachable from the current layout', async ({ page }) => {
    await dismissNewGameDialogIfVisible(page);
    // Both mobile and desktop expose at least one Settings button — the mobile
    // variant in the bottom control bar and the desktop variant in the left
    // sidebar. Asserting on `first()` keeps the test viewport-agnostic.
    const settingsBtn = page.getByRole('button', { name: /settings/i }).first();
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
  });

  test('new game starts and preserves canvas visibility', async ({ page }) => {
    await page.getByRole('button', { name: /vs player/i }).waitFor({ state: 'visible', timeout: 7000 });
    await startNewPvPGame(page);

    // After starting, the opening-roll-done phase shows "Start!" on mobile or
    // "Roll Dice" on desktop. Either way, the canvas is rendered.
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
    const rollOrStartBtn = page.getByRole('button', { name: /roll|start/i }).first();
    await expect(rollOrStartBtn).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Desktop layout specifics', () => {
  // Only run in the desktop (chromium) project — the layout switches to mobile
  // below 1024 CSS px and the sidebar does not render.
  test.skip(({ browserName, viewport }) => {
    return !(browserName === 'chromium' && viewport !== null && viewport.width >= 1024);
  }, 'desktop-only behaviour');

  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
    await dismissNewGameDialogIfVisible(page);
  });

  test('shows the move-history sidebar on the right', async ({ page }) => {
    // Move history lives in the right sidebar on desktop only.
    await expect(page.getByRole('heading', { name: /move history/i })).toBeVisible({ timeout: 5000 });
  });

  test('resizing below breakpoint switches to mobile layout', async ({ page }) => {
    // Start desktop → confirm sidebar heading present
    await expect(page.getByRole('heading', { name: /move history/i })).toBeVisible({ timeout: 5000 });
    // Shrink to mobile width
    await page.setViewportSize({ width: 390, height: 844 });
    // The right sidebar should no longer render; its heading disappears.
    await expect(page.getByRole('heading', { name: /move history/i })).not.toBeVisible({ timeout: 5000 });
    // Canvas remains visible.
    await expect(page.locator('canvas')).toBeVisible();
  });
});

test.describe('Mobile layout specifics', () => {
  // Only run on mobile viewports.
  test.skip(({ viewport }) => {
    return viewport === null || viewport.width >= 1024;
  }, 'mobile-only behaviour');

  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
  });

  test('does not render the move-history sidebar heading', async ({ page }) => {
    await dismissNewGameDialogIfVisible(page);
    // Desktop-only heading is absent; the canvas remains visible.
    await expect(page.getByRole('heading', { name: /move history/i })).not.toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('starting a game keeps controls accessible at the bottom', async ({ page }) => {
    await page.getByRole('button', { name: /vs player/i }).waitFor({ state: 'visible', timeout: 7000 });
    await startNewPvPGame(page);
    // After initGame the mobile control bar shows "Start!" (opening-roll-done).
    const actionBtn = page.getByRole('button', { name: /roll|start/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: 5000 });

    // Control bar is bottom-docked — the action button should sit in the lower
    // half of the viewport on mobile.
    const viewport = page.viewportSize();
    const box = await actionBtn.boundingBox();
    if (viewport && box) {
      expect(box.y).toBeGreaterThan(viewport.height / 2);
    }
  });
});

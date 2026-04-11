import { expect, test } from '@playwright/test';

import {
  clearIndexedDB,
  dismissNewGameDialogIfVisible,
  dismissTutorialIfVisible,
  startNewPvPGame,
} from './fixtures/test-helpers';

test.describe('Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
  });

  test('new game dialog appears on first load', async ({ page }) => {
    // After clearing DB and reloading, tutorial is gone, NewGameDialog should be visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 7000 });
    await expect(dialog).toContainText('New Game');
  });

  test('can start a PvP game', async ({ page }) => {
    // Dialog should be open (tutorial dismissed already)
    await page.getByRole('button', { name: /vs player/i }).waitFor({ state: 'visible', timeout: 7000 });
    await startNewPvPGame(page);
    // Dialog should be gone
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    // Canvas should still be visible
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('opening roll phase shown after starting game', async ({ page }) => {
    await page.getByRole('button', { name: /vs player/i }).waitFor({ state: 'visible', timeout: 7000 });
    await startNewPvPGame(page);
    // After starting, the Roll / Roll Dice button should be visible in the control bar
    const rollBtn = page.getByRole('button', { name: /roll/i }).first();
    await expect(rollBtn).toBeVisible({ timeout: 5000 });
  });

  test('settings panel opens and closes', async ({ page }) => {
    // Dismiss new game dialog so it doesn't block the control bar
    await dismissNewGameDialogIfVisible(page);
    // Open settings via the Settings button in the control bar
    await page.getByRole('button', { name: /settings/i }).first().click();
    // Settings panel should be visible
    const settingsPanel = page.getByRole('dialog', { name: /settings/i });
    await expect(settingsPanel).toBeVisible({ timeout: 5000 });
    // Close it
    await page.getByRole('button', { name: /close settings/i }).click();
    await expect(settingsPanel).not.toBeVisible({ timeout: 5000 });
  });

  test('new game button opens dialog', async ({ page }) => {
    // Cancel any open dialog (e.g. new game dialog from first load)
    await dismissNewGameDialogIfVisible(page);
    // Click New Game button (mobile label is "New", desktop is "New Game")
    const newBtn = page.getByRole('button', { name: /^new$|^new game$/i }).first();
    await newBtn.waitFor({ state: 'visible', timeout: 5000 });
    await newBtn.click();
    const newGameDialog = page.getByRole('dialog');
    await expect(newGameDialog).toBeVisible({ timeout: 5000 });
    await expect(newGameDialog).toContainText('New Game');
  });

  test('pause and resume', async ({ page }) => {
    // Start a game first
    await page.getByRole('button', { name: /vs player/i }).waitFor({ state: 'visible', timeout: 7000 });
    await startNewPvPGame(page);
    // Click Pause button
    await page.getByRole('button', { name: /pause/i }).first().click();
    // Pause overlay should be visible with "Game Paused" heading
    await expect(page.getByText('Game Paused')).toBeVisible({ timeout: 5000 });
    // Click Resume — use the button inside the pause overlay (not the control bar)
    await page.locator('.absolute.inset-0').getByRole('button', { name: /resume/i }).click();
    // Pause overlay should be gone
    await expect(page.getByText('Game Paused')).not.toBeVisible({ timeout: 5000 });
  });

  test('theme toggle changes html class', async ({ page }) => {
    // Dismiss dialog so we can reach the settings button
    await dismissNewGameDialogIfVisible(page);
    // Open settings
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.getByRole('dialog', { name: /settings/i }).waitFor({ state: 'visible', timeout: 5000 });
    // Click "Light" theme button
    await page.getByRole('button', { name: /^light$/i }).click();
    // html element should have "light" class
    await expect(page.locator('html')).toHaveClass(/light/, { timeout: 3000 });
    // Switch back to dark
    await page.getByRole('button', { name: /^dark$/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/light/, { timeout: 3000 });
  });

  test('high scores panel opens', async ({ page }) => {
    // On desktop the "High Scores" button is in the sidebar
    const highScoresBtn = page.getByRole('button', { name: /^high scores$/i });
    const isDesktop = await highScoresBtn.isVisible();
    if (isDesktop) {
      await dismissNewGameDialogIfVisible(page);
      await highScoresBtn.click();
    } else {
      // Mobile: open via Pause overlay
      await page.getByRole('button', { name: /vs player/i }).waitFor({ state: 'visible', timeout: 7000 });
      await startNewPvPGame(page);
      await page.getByRole('button', { name: /pause/i }).first().click();
      await page.getByRole('button', { name: /high scores/i }).click();
    }
    // Panel visible — look for the "High Scores" heading
    await expect(page.getByRole('heading', { name: /high scores/i })).toBeVisible({ timeout: 5000 });
  });
});

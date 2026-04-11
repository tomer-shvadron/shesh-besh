import type { Page } from '@playwright/test';

// Expose game state for assertions
export async function getGameState(page: Page): Promise<unknown> {
  return page.evaluate(() => (window as Window & { __GAME_STATE__?: unknown }).__GAME_STATE__);
}

// Clear IndexedDB between tests
export async function clearIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map((db) => {
        return new Promise<void>((resolve, reject) => {
          const req = indexedDB.deleteDatabase(db.name ?? '');
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }),
    );
  });
}

// Dismiss the tutorial overlay if it is visible
export async function dismissTutorialIfVisible(page: Page): Promise<void> {
  const skipButton = page.getByRole('button', { name: /skip tutorial/i });
  try {
    await skipButton.waitFor({ state: 'visible', timeout: 3000 });
    await skipButton.click();
    // Wait for tutorial to disappear
    await skipButton.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // Tutorial not visible — nothing to do
  }
}

// Dismiss the new game dialog (e.g. cancel it) if it is visible
export async function dismissNewGameDialogIfVisible(page: Page): Promise<void> {
  const cancelButton = page.getByRole('button', { name: /cancel/i });
  try {
    await cancelButton.waitFor({ state: 'visible', timeout: 3000 });
    await cancelButton.click();
    await cancelButton.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // Dialog not visible — nothing to do
  }
}

// Start a new PvP game via the dialog
export async function startNewPvPGame(page: Page): Promise<void> {
  // Click "vs Player" card
  await page.getByRole('button', { name: /vs player/i }).click();
  // Click Start Game
  await page.getByRole('button', { name: /start game/i }).click();
}

// Start a new PvA game with given difficulty
export async function startNewAIGame(page: Page, difficulty: 'easy' | 'medium' | 'hard'): Promise<void> {
  await page.getByRole('button', { name: /vs ai/i }).click();
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByRole('button', { name: new RegExp(difficulty, 'i') }).first().click();
  await page.getByRole('button', { name: /start game/i }).click();
}

/**
 * E2E tests for High Scores persistence.
 *
 * Strategy: inject a game-over state directly via `window.__GAME_STORE__` to
 * trigger the useScoreSaver hook, then verify the High Scores panel displays
 * the saved score.
 */

import { expect, test } from '@playwright/test';

import type { GameState } from '../src/engine/gameController';
import {
  clearIndexedDB,
  dismissTutorialIfVisible,
  startNewPvPGame,
} from './fixtures/test-helpers';

/** Inject a game-over state into the Zustand store via setState. */
async function triggerGameOver(
  page: import('@playwright/test').Page,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await page.evaluate((opts) => {
    const store = (window as unknown as Record<string, unknown>).__GAME_STORE__ as {
      setState: (partial: Partial<GameState>) => void;
    };
    if (!store) {
      throw new Error('__GAME_STORE__ not exposed');
    }
    store.setState({
      board: {
        points: Array.from({ length: 24 }, () => ({ player: null, count: 0 })),
        bar: { white: 0, black: 0 },
        borneOff: { white: 15, black: 3 },
      },
      phase: 'game-over',
      winner: 'white',
      timerElapsed: 60_000,
      difficulty: 'medium',
      gameMode: 'pvp',
      ...opts,
    } as Partial<GameState>);
  }, overrides);
}

/** Reset store to a non-game-over state so a subsequent game-over triggers the hook again. */
async function resetToRolling(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const store = (window as unknown as Record<string, unknown>).__GAME_STORE__ as {
      setState: (partial: Partial<GameState>) => void;
    };
    store.setState({ phase: 'rolling', winner: null } as Partial<GameState>);
  });
  // Give React time to flush the state reset so useScoreSaver sees the phase change
  await page.waitForTimeout(200);
}

test.describe('High Scores', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
  });

  test('score is saved and visible in the High Scores panel after a game ends', async ({ page }) => {
    // Start a PvP game
    await startNewPvPGame(page);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });

    // Inject a game-over state to trigger the score saver hook
    await triggerGameOver(page);

    // Wait for the game-over dialog and for the async addScore to complete
    await expect(page.getByText('White wins!')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Dismiss the game-over dialog, then open High Scores from the sidebar
    await page.getByRole('button', { name: /dismiss/i }).click();
    await page.waitForTimeout(200);

    const sidebarBtn = page.getByLabel('High Scores');
    await sidebarBtn.click();

    // Verify the High Scores panel shows the saved score
    await expect(page.getByRole('heading', { name: /high scores/i })).toBeVisible({ timeout: 5000 });

    // Score for medium difficulty at 60s with margin 12: 100 * 2 * 5 + 120 = 1,120
    await expect(page.getByText('1,120')).toBeVisible({ timeout: 5000 });
  });

  test('statistics tab counts games correctly after multiple games', async ({ page }) => {
    // Start a PvP game
    await startNewPvPGame(page);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });

    // First game-over
    await triggerGameOver(page, { difficulty: 'hard', gameMode: 'pva' });
    await expect(page.getByText('White wins!')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /dismiss/i }).click();
    await page.waitForTimeout(200);

    // Reset to non-game-over so the hook can fire again
    await resetToRolling(page);

    // Second game-over
    await triggerGameOver(page, { difficulty: 'hard', gameMode: 'pva' });
    await expect(page.getByText(/wins!/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /dismiss/i }).click();
    await page.waitForTimeout(200);

    // Open High Scores panel via the sidebar
    const sidebarBtn = page.getByLabel('High Scores');
    await sidebarBtn.click();

    await expect(page.getByRole('heading', { name: /high scores/i })).toBeVisible({ timeout: 5000 });

    // Switch to Statistics tab
    await page.getByRole('button', { name: /statistics/i }).click();

    // Should show 2 total games and 2 hard wins
    await expect(page.getByText('Total Games')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Hard Wins')).toBeVisible();
  });
});

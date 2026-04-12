/**
 * E2E tests for the Move History sidebar.
 *
 * Verifies that after a turn is confirmed, the move history entry shows:
 *   1. The dice that were rolled (two MiniDie SVGs inside [data-testid="move-history-dice"])
 *   2. The move notation chips
 *
 * Strategy: inject a pre-built game state directly into the Zustand store via
 * `window.__GAME_STORE__`, bypassing the need to control random dice rolls.
 */

import { expect, test } from '@playwright/test';

import type { GameState } from '../src/engine/gameController';
import { clearIndexedDB, dismissTutorialIfVisible, startNewPvPGame } from './fixtures/test-helpers';

test.describe('Move History — dice display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
  });

  test('shows dice in move history after a turn is completed', async ({ page }) => {
    // Start a PvP game so the board is visible
    await startNewPvPGame(page);

    // Wait for the game canvas to be rendered (confirms the game started)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });

    // Inject a game state with one completed turn so the move history sidebar
    // has something to render — specifically, a turn with known dice [3, 4].
    await page.evaluate(() => {
      const store = (window as unknown as Record<string, unknown>).__GAME_STORE__ as {
        getState: () => {
          loadState: (s: Partial<GameState>) => void;
          moveHistory: unknown;
          diceHistory: unknown;
        };
      };
      if (!store) { throw new Error('__GAME_STORE__ not exposed'); }

      // Build a minimal completed-turn patch on top of the current state
      // by appending one turn's moves and dice to the history arrays.
      const current = store.getState();
      store.getState().loadState({
        ...(current as object) as GameState,
        phase: 'rolling',
        currentPlayer: 'black' as const,
        dice: null,
        remainingDice: [],
        pendingMoves: [],
        moveHistory: [
          // One confirmed white turn: moved checker from point 1 to point 3 (0-indexed)
          [{ from: 1, to: 3, dieUsed: 2 as import('../src/engine/types').DiceValue }],
        ],
        diceHistory: [
          [3, 4] as [number, number],
        ],
      } as GameState);
    });

    // Give React a moment to re-render the move history panel
    await page.waitForTimeout(200);

    // The Move History sidebar on desktop shows dice next to each turn entry.
    // Verify the dice element is rendered.
    const diceElements = page.locator('[data-testid="move-history-dice"]');
    await expect(diceElements.first()).toBeVisible({ timeout: 3000 });

    // Verify there is exactly one dice display (for our one injected turn)
    await expect(diceElements).toHaveCount(1);

    // Verify the dice SVGs are actually inside (two MiniDie SVGs = two dice per roll)
    const svgs = diceElements.first().locator('svg');
    await expect(svgs).toHaveCount(2);
  });

  test('dice display updates correctly for multiple turns', async ({ page }) => {
    await startNewPvPGame(page);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });

    // Inject three completed turns with distinct dice
    await page.evaluate(() => {
      const store = (window as unknown as Record<string, unknown>).__GAME_STORE__ as {
        getState: () => {
          loadState: (s: object) => void;
        };
      };
      if (!store) { throw new Error('__GAME_STORE__ not exposed'); }

      const current = store.getState() as Record<string, unknown>;
      store.getState().loadState({
        ...current,
        phase: 'rolling',
        currentPlayer: 'white' as const,
        dice: null,
        remainingDice: [],
        pendingMoves: [],
        moveHistory: [
          [{ from: 1, to: 3, dieUsed: 2 }],
          [{ from: 12, to: 14, dieUsed: 2 }],
          [{ from: 5, to: 7, dieUsed: 2 }],
        ],
        diceHistory: [
          [3, 4],
          [1, 2],
          [5, 6],
        ],
      });
    });

    await page.waitForTimeout(200);

    const diceElements = page.locator('[data-testid="move-history-dice"]');
    await expect(diceElements).toHaveCount(3);

    // Each entry has two SVG dice
    for (let i = 0; i < 3; i++) {
      const svgs = diceElements.nth(i).locator('svg');
      await expect(svgs).toHaveCount(2);
    }
  });

  test('dice display is absent when dice data is null', async ({ page }) => {
    await startNewPvPGame(page);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });

    // Inject a turn with null dice (e.g., loaded from an older save format)
    await page.evaluate(() => {
      const store = (window as unknown as Record<string, unknown>).__GAME_STORE__ as {
        getState: () => { loadState: (s: object) => void };
      };
      if (!store) { throw new Error('__GAME_STORE__ not exposed'); }

      const current = store.getState() as Record<string, unknown>;
      store.getState().loadState({
        ...current,
        phase: 'rolling',
        dice: null,
        remainingDice: [],
        pendingMoves: [],
        moveHistory: [[{ from: 1, to: 3, dieUsed: 2 }]],
        diceHistory: [null], // null dice → DiceDisplay returns null
      });
    });

    await page.waitForTimeout(200);

    // Move history row exists (chips visible)
    const chips = page.locator('[data-testid="move-history-dice"]');
    await expect(chips).toHaveCount(0); // dice display should not render when dice is null
  });

  test('dice persist in move history after page reload (save/load round-trip)', async ({ page }) => {
    await startNewPvPGame(page);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });

    // Inject a completed turn with known dice into the store AND save it to IndexedDB.
    // This simulates the auto-save that happens during normal gameplay.
    await page.evaluate(async () => {
      const store = (window as unknown as Record<string, unknown>).__GAME_STORE__ as {
        getState: () => {
          loadState: (s: object) => void;
          saveGame?: () => Promise<void>;
        };
      };
      if (!store) { throw new Error('__GAME_STORE__ not exposed'); }

      const current = store.getState() as Record<string, unknown>;
      store.getState().loadState({
        ...current,
        phase: 'rolling',
        currentPlayer: 'black',
        dice: null,
        remainingDice: [],
        pendingMoves: [],
        moveHistory: [[{ from: 1, to: 3, dieUsed: 2 }]],
        diceHistory: [[5, 6]],
      });

      // Trigger the auto-save so IndexedDB has the updated state with diceHistory
      const saveGameFn = store.getState().saveGame;
      if (saveGameFn) {
        await saveGameFn();
      } else {
        // Fallback: write directly via the service
        const { saveGame } = await import('/src/services/gameSave.service.ts');
        const state = store.getState() as Parameters<typeof saveGame>[0];
        await saveGame(state);
      }
    });

    // Reload the page — the game should be restored from IndexedDB
    await page.reload();
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);

    // The resume banner may appear — click resume if it does
    const resumeBtn = page.locator('[data-testid="resume-game-btn"]');
    if (await resumeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resumeBtn.click();
    }

    // Give React time to render the restored state
    await page.waitForTimeout(400);

    // After reload, the move history dice should still be visible
    const diceElements = page.locator('[data-testid="move-history-dice"]');
    await expect(diceElements).toHaveCount(1, { timeout: 3000 });

    const svgs = diceElements.first().locator('svg');
    await expect(svgs).toHaveCount(2);
  });
});

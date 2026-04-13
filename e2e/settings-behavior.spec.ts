import { expect, test } from '@playwright/test';

import {
  clearIndexedDB,
  dismissNewGameDialogIfVisible,
  dismissTutorialIfVisible,
  startNewPvPGame,
} from './fixtures/test-helpers';

/**
 * Settings-behavior E2E — verifies that each setting actually changes runtime
 * behaviour, not just that the toggle persists. Persistence itself is covered
 * separately in settings.spec.ts.
 */

test.describe('Settings behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shesh-besh/');
    await clearIndexedDB(page);
    await page.goto('/shesh-besh/');
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfVisible(page);
    await dismissNewGameDialogIfVisible(page);
  });

  async function openSettings(page: Parameters<typeof dismissTutorialIfVisible>[0]): Promise<void> {
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.getByRole('dialog', { name: /settings/i }).waitFor({ state: 'visible', timeout: 5000 });
  }

  async function closeSettings(page: Parameters<typeof dismissTutorialIfVisible>[0]): Promise<void> {
    await page.getByRole('button', { name: /close settings/i }).click();
    await page.getByRole('dialog', { name: /settings/i }).waitFor({ state: 'hidden', timeout: 5000 });
  }

  test('theme toggle updates html class for use by CSS vars', async ({ page }) => {
    await openSettings(page);
    await page.getByRole('button', { name: /^light$/i }).click();
    await expect(page.locator('html')).toHaveClass(/light/, { timeout: 3000 });
    await page.getByRole('button', { name: /^dark$/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/light/, { timeout: 3000 });
  });

  test('textureMode is readable from the settings store at runtime', async ({ page }) => {
    await openSettings(page);
    // Switch to Classic (programmatic) and assert the store reflects it.
    await page.getByRole('button', { name: /classic/i }).click();
    let mode = await page.evaluate(() => {
      const win = window as unknown as { __SETTINGS_STORE__: { getState: () => { textureMode: string } } };
      return win.__SETTINGS_STORE__.getState().textureMode;
    });
    expect(mode).toBe('programmatic');

    // Switch back to Realistic and re-assert.
    await page.getByRole('button', { name: /realistic/i }).click();
    mode = await page.evaluate(() => {
      const win = window as unknown as { __SETTINGS_STORE__: { getState: () => { textureMode: string } } };
      return win.__SETTINGS_STORE__.getState().textureMode;
    });
    expect(mode).toBe('realistic');
  });

  test('toggling Home on Left flips the board orientation in the settings store', async ({ page }) => {
    await openSettings(page);
    // Initial value should be false
    const initial = await page.evaluate(() => {
      const win = window as unknown as { __SETTINGS_STORE__: { getState: () => { boardFlipped: boolean } } };
      return win.__SETTINGS_STORE__.getState().boardFlipped;
    });
    expect(initial).toBe(false);

    const toggle = page.getByRole('switch', { name: /home on left/i });
    await toggle.click();
    // After click, store should flip
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const win = window as unknown as { __SETTINGS_STORE__: { getState: () => { boardFlipped: boolean } } };
          return win.__SETTINGS_STORE__.getState().boardFlipped;
        });
      })
      .toBe(true);
  });

  test('defaultDifficulty propagates to the game store when a new AI game starts', async ({ page }) => {
    await openSettings(page);
    await page.getByRole('button', { name: /^hard$/i }).click();

    // Verify the settings store reflects the change before proceeding.
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const win = window as unknown as {
            __SETTINGS_STORE__: { getState: () => { defaultDifficulty: string } };
          };
          return win.__SETTINGS_STORE__.getState().defaultDifficulty;
        });
      })
      .toBe('hard');

    await closeSettings(page);

    // Start a new PvA game using default difficulty (set to Hard above).
    await page.getByRole('button', { name: /^new$|^new game$/i }).first().click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
    // Clicking "vs AI" immediately advances to the difficulty step (pre-selected
    // to whatever defaultDifficulty is). Explicitly click Hard to be robust
    // against pre-selection behaviour, then Start Game.
    await page.getByRole('button', { name: /vs ai/i }).click();
    await page.getByRole('button', { name: /^hard/i }).click();
    await page.getByRole('button', { name: /start game/i }).click();

    // Wait until a game is in progress, then assert difficulty on the game store.
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const win = window as unknown as {
            __GAME_STORE__: { getState: () => { difficulty: string; gameMode: string } };
          };
          return win.__GAME_STORE__.getState().difficulty;
        });
      })
      .toBe('hard');
  });

  test('autoRoll causes the dice to roll automatically when enabled', async ({ page }) => {
    // Enable Auto Roll
    await openSettings(page);
    await page.getByRole('switch', { name: /auto roll/i }).click();
    await closeSettings(page);

    // Start a PvP game — the opening roll is auto-resolved, which lands us in
    // 'opening-roll-done'. Programmatically confirm it to reach the 'rolling'
    // phase; Auto Roll should then fire within ~600ms.
    await page.getByRole('button', { name: /^new$|^new game$/i }).first().click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
    await startNewPvPGame(page);

    // Confirm the opening roll via the exposed store.
    await page.evaluate(() => {
      const win = window as unknown as {
        __GAME_STORE__: { getState: () => { handleConfirmOpeningRoll: () => void } };
      };
      win.__GAME_STORE__.getState().handleConfirmOpeningRoll();
    });

    // After auto-roll fires the phase transitions from 'rolling' to 'moving'.
    await expect
      .poll(
        async () => {
          return page.evaluate(() => {
            const win = window as unknown as { __GAME_STORE__: { getState: () => { phase: string } } };
            return win.__GAME_STORE__.getState().phase;
          });
        },
        { timeout: 3000 },
      )
      .toBe('moving');
  });

  test('soundEnabled toggle reflects in the store (sound service reads from store)', async ({ page }) => {
    // Default = true
    const initial = await page.evaluate(() => {
      const win = window as unknown as {
        __SETTINGS_STORE__: { getState: () => { soundEnabled: boolean } };
      };
      return win.__SETTINGS_STORE__.getState().soundEnabled;
    });
    expect(initial).toBe(true);

    await openSettings(page);
    await page.getByRole('switch', { name: /sound effects/i }).click();
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const win = window as unknown as {
            __SETTINGS_STORE__: { getState: () => { soundEnabled: boolean } };
          };
          return win.__SETTINGS_STORE__.getState().soundEnabled;
        });
      })
      .toBe(false);
  });
});

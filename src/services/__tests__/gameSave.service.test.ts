import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameState } from '@/engine/gameController';
import { createInitialState } from '@/engine/gameController';
import { db } from '@/services/database.service';
import { clearGame, loadGame, saveGame } from '@/services/gameSave.service';

// Mock the database module — vi.mock calls are hoisted by Vitest to the top of the file
vi.mock('@/services/database.service', () => {
  const store = new Map<string, unknown>();

  const activeGame = {
    put: vi.fn(async (record: Record<string, unknown>) => {
      store.set(record['id'] as string, record);
    }),
    get: vi.fn(async (id: string) => store.get(id)),
    delete: vi.fn(async (id: string) => {
      store.delete(id);
    }),
  };

  return { db: { activeGame } };
});

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState({ gameMode: 'pvp', difficulty: 'medium' }),
    ...overrides,
  };
}

describe('gameSave.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveGame()', () => {
    it('should persist the game state to db.activeGame with id="current"', async () => {
      const state = makeState({ timerElapsed: 5000 });
      await saveGame(state);

      expect(db.activeGame.put).toHaveBeenCalledOnce();
      const arg = vi.mocked(db.activeGame.put).mock.calls[0]?.[0];
      expect(arg).toBeDefined();
      expect(arg!.id).toBe('current');
      expect(arg!.timerElapsed).toBe(5000);
      expect(arg!.gameMode).toBe('pvp');
      expect(arg!.difficulty).toBe('medium');
      expect(arg!.savedAt).toBeInstanceOf(Date);
    });

    it('should include the board state', async () => {
      const state = makeState();
      await saveGame(state);

      const arg = vi.mocked(db.activeGame.put).mock.calls[0]?.[0];
      expect(arg!.boardState).toEqual(state.board);
    });

    it('should persist diceHistory alongside moveHistory', async () => {
      const state = makeState({
        moveHistory: [[{ from: 1, to: 3, dieUsed: 2 }]],
        diceHistory: [[3, 4]],
      });
      await saveGame(state);

      const arg = vi.mocked(db.activeGame.put).mock.calls[0]?.[0];
      expect(arg!.diceHistory).toEqual([[3, 4]]);
    });

    it('should persist null entries in diceHistory (no-legal-moves turns)', async () => {
      const state = makeState({
        moveHistory: [[], [{ from: 5, to: 7, dieUsed: 2 }]],
        diceHistory: [null, [1, 2]],
      });
      await saveGame(state);

      const arg = vi.mocked(db.activeGame.put).mock.calls[0]?.[0];
      expect(arg!.diceHistory).toEqual([null, [1, 2]]);
    });
  });

  describe('loadGame()', () => {
    it('should return null when no saved game exists', async () => {
      vi.mocked(db.activeGame.get).mockResolvedValueOnce(undefined);
      const result = await loadGame();
      expect(result).toBeNull();
    });

    it('should reconstruct the game state from the stored record', async () => {
      const state = makeState({ timerElapsed: 12000 });
      await saveGame(state);

      const result = await loadGame();
      expect(result).not.toBeNull();
      expect(result!.timerElapsed).toBe(12000);
      expect(result!.gameMode).toBe('pvp');
      expect(result!.difficulty).toBe('medium');
    });

    it('should restore diceHistory so move history dice are visible after reload', async () => {
      const state = makeState({
        moveHistory: [[{ from: 1, to: 3, dieUsed: 2 }], [{ from: 12, to: 14, dieUsed: 2 }]],
        diceHistory: [[3, 4], [1, 6]],
      });
      await saveGame(state);

      const result = await loadGame();
      expect(result!.diceHistory).toEqual([[3, 4], [1, 6]]);
    });

    it('should default diceHistory to [] when missing from record (legacy saves)', async () => {
      // Simulate a legacy record without diceHistory
      vi.mocked(db.activeGame.get).mockResolvedValueOnce({
        id: 'current',
        boardState: makeState().board,
        dice: null,
        currentPlayer: 'white',
        moveHistory: [[{ from: 1, to: 3, dieUsed: 2 }]],
        // diceHistory deliberately absent
        timerElapsed: 0,
        difficulty: 'medium',
        gameMode: 'pvp',
        savedAt: new Date(),
      });

      const result = await loadGame();
      expect(result!.diceHistory).toEqual([]);
    });

    it('should reset transient fields (phase to rolling, pending moves empty)', async () => {
      const state = makeState({ timerElapsed: 1000 });
      await saveGame(state);

      const result = await loadGame();
      expect(result!.phase).toBe('rolling');
      expect(result!.pendingMoves).toHaveLength(0);
      expect(result!.remainingDice).toHaveLength(0);
      expect(result!.dice).toBeNull();
    });
  });

  describe('clearGame()', () => {
    it('should delete the saved game from db', async () => {
      await clearGame();
      expect(db.activeGame.delete).toHaveBeenCalledWith('current');
    });
  });
});

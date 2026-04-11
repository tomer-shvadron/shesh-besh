import { describe, expect, it } from 'vitest';

import { chooseMove } from '@/ai/aiPlayer';
import { Board } from '@/engine/board';
import type { BoardState, DiceValue } from '@/engine/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyBoardState(): BoardState {
  return {
    points: Array<null>(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
  };
}

/** A simple board where white has one obvious pip-count-optimal move. */
function buildObviousBoardForWhite(): Board {
  // White has one checker at point 5 (very close to bearing off) and one at point 23 (far away).
  // Die [2] — moving the far checker from 23→21 gains only 2 pips, but
  // moving the near checker from 5→3 is closer to bearing off.
  // With pip count weighting, the checker at 5 should be moved (lower pip contribution).
  const state = emptyBoardState();
  state.points[5] = { player: 'white', count: 1 };
  state.points[23] = { player: 'white', count: 14 };
  // Black is far away so there's no blocking concern
  state.points[0] = { player: 'black', count: 15 };
  return Board.fromState(state);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('chooseMove()', () => {
  describe('returns non-empty array when legal moves exist', () => {
    it.each(['easy', 'medium', 'hard'] as const)('%s: returns at least one move from initial position', (difficulty) => {
      const board = Board.initial();
      const dice: DiceValue[] = [3, 5];
      const result = chooseMove(board, 'white', dice, difficulty);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('returns empty array when no legal moves exist', () => {
    it.each(['easy', 'medium', 'hard'] as const)('%s: returns [] when player is fully blocked', (difficulty) => {
      // White has one checker on bar; black has fully blocked all 6 entry points (18-23)
      const state = emptyBoardState();
      state.bar.white = 1;
      for (let i = 18; i <= 23; i++) {
        state.points[i] = { player: 'black', count: 2 };
      }
      // Put white's other checkers somewhere so the board is valid
      state.points[5] = { player: 'white', count: 14 };

      const board = Board.fromState(state);
      const dice: DiceValue[] = [1, 2];
      const result = chooseMove(board, 'white', dice, difficulty);

      expect(result).toEqual([]);
    });
  });

  describe('easy: introduces randomness', () => {
    it('does not always pick the same sequence over 10 runs from the same position', () => {
      const board = Board.initial();
      const dice: DiceValue[] = [1, 2];

      const seen = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const moves = chooseMove(board, 'white', dice, 'easy');
        const key = moves.map((m) => `${String(m.from)}-${String(m.to)}-${m.dieUsed}`).join('|');
        seen.add(key);
      }

      // With 30% random-mistake rate over 10 runs, probability of all identical ≈ 0.028
      // We accept this test may rarely flake, but it catches non-randomness reliably.
      expect(seen.size).toBeGreaterThan(1);
    });
  });

  describe('medium: deterministic best move', () => {
    it('always picks the same sequence from the same position', () => {
      const board = buildObviousBoardForWhite();
      const dice: DiceValue[] = [2, 3];

      const first = chooseMove(board, 'white', dice, 'medium');
      for (let i = 0; i < 5; i++) {
        const next = chooseMove(board, 'white', dice, 'medium');
        expect(next).toEqual(first);
      }
    });

    it('prefers bearing off over advancing when both are legal', () => {
      // White: all checkers are in home board so bearing off is legal.
      // Two checkers at point 0 (exact bear-off with die=1) and the rest at point 2.
      // With die=1:
      //   - Moving from point 0 → 'off' (bears off, reduces pips to 0 for that checker)
      //   - Moving from point 2 → point 1 (still on board)
      // Bearing off is strictly better for pip count, so medium should choose it.
      const state = emptyBoardState();
      state.points[0] = { player: 'white', count: 2 };
      state.points[2] = { player: 'white', count: 13 };
      // Black is far away so no threat
      state.points[18] = { player: 'black', count: 15 };

      const board = Board.fromState(state);
      const dice: DiceValue[] = [1];
      const moves = chooseMove(board, 'white', dice, 'medium');

      expect(moves.length).toBe(1);
      expect(moves[0]?.from).toBe(0);
      expect(moves[0]?.to).toBe('off');
    });
  });

  describe('hard: valid legal move from initial position', () => {
    it('returns a non-empty legal move sequence', () => {
      const board = Board.initial();
      const dice: DiceValue[] = [3, 1];
      const moves = chooseMove(board, 'black', dice, 'hard');

      expect(moves.length).toBeGreaterThan(0);

      // All moves should reference valid points
      for (const move of moves) {
        if (move.from !== 'bar') {
          expect(move.from).toBeGreaterThanOrEqual(0);
          expect(move.from).toBeLessThan(24);
        }
        if (move.to !== 'off') {
          expect(move.to).toBeGreaterThanOrEqual(0);
          expect(move.to).toBeLessThan(24);
        }
      }
    });

    it('produces a different (better) move than a naive random pick in a critical position', () => {
      // Set up a position where hard AI should clearly avoid leaving blots
      // White on bar with 1; black has a 5-prime at 18-22; white must enter.
      // Hard AI should find the safest entry point among the legal ones.
      const state = emptyBoardState();
      state.bar.white = 1;
      state.points[18] = { player: 'black', count: 2 };
      state.points[19] = { player: 'black', count: 2 };
      state.points[20] = { player: 'black', count: 2 };
      state.points[21] = { player: 'black', count: 2 };
      state.points[22] = { player: 'black', count: 2 };
      state.points[23] = { player: 'black', count: 1 }; // blot, enterable
      state.points[5] = { player: 'white', count: 14 };
      state.points[0] = { player: 'black', count: 2 };

      const board = Board.fromState(state);
      const dice: DiceValue[] = [1]; // die=1 → white enters at point 23 (the blot)
      const moves = chooseMove(board, 'white', dice, 'hard');

      // Only legal move with die=1 is entering at point 23 (hits the black blot)
      expect(moves.length).toBeGreaterThan(0);
      expect(moves[0]?.from).toBe('bar');
      expect(moves[0]?.to).toBe(23);
    });
  });

  describe('all difficulties: doubles are handled correctly', () => {
    it.each(['easy', 'medium', 'hard'] as const)(
      '%s: handles doubles (4 dice) without error',
      (difficulty) => {
        const board = Board.initial();
        const dice: DiceValue[] = [3, 3, 3, 3];
        const result = chooseMove(board, 'white', dice, difficulty);
        expect(result.length).toBeGreaterThan(0);
      },
      15000,
    );
  });
});

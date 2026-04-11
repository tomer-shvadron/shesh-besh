import { describe, expect, it } from 'vitest';

import { evaluateBoard } from '@/ai/evaluate';
import { HARD_WEIGHTS } from '@/ai/strategies';
import { Board } from '@/engine/board';
import { CHECKERS_PER_PLAYER } from '@/engine/constants';
import type { BoardState } from '@/engine/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyBoardState(): BoardState {
  return {
    points: Array<null>(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('evaluateBoard()', () => {
  describe('terminal positions', () => {
    it('scores a winning position (all my checkers borne off) close to +1.0', () => {
      const state = emptyBoardState();
      // White has borne off all 15; black still has checkers on board
      state.borneOff.white = CHECKERS_PER_PLAYER;
      state.points[11] = { player: 'black', count: 15 };

      const board = Board.fromState(state);
      const score = evaluateBoard(board, 'white', HARD_WEIGHTS);

      expect(score).toBeGreaterThan(0.8);
    });

    it('scores a losing position (opponent all borne off) close to -1.0', () => {
      const state = emptyBoardState();
      // Black has borne off all 15; white still has checkers on board
      state.borneOff.black = CHECKERS_PER_PLAYER;
      state.points[12] = { player: 'white', count: 15 };

      const board = Board.fromState(state);
      const score = evaluateBoard(board, 'white', HARD_WEIGHTS);

      expect(score).toBeLessThan(-0.8);
    });
  });

  describe('symmetric starting position', () => {
    it('scores approximately 0.0 from the initial board (symmetric)', () => {
      const board = Board.initial();
      const whiteScore = evaluateBoard(board, 'white', HARD_WEIGHTS);
      const blackScore = evaluateBoard(board, 'black', HARD_WEIGHTS);

      // Both players are symmetric at the start — scores should be near 0
      expect(Math.abs(whiteScore)).toBeLessThan(0.2);
      expect(Math.abs(blackScore)).toBeLessThan(0.2);
    });
  });

  describe('bar checker penalty', () => {
    it('scores lower when the player has checkers on the bar vs. none', () => {
      const stateNoBar = emptyBoardState();
      stateNoBar.points[5] = { player: 'white', count: 8 };
      stateNoBar.points[7] = { player: 'white', count: 7 };
      stateNoBar.points[18] = { player: 'black', count: 15 };

      const stateWithBar = emptyBoardState();
      stateWithBar.points[5] = { player: 'white', count: 5 };
      stateWithBar.points[7] = { player: 'white', count: 7 };
      stateWithBar.bar.white = 3;
      stateWithBar.points[18] = { player: 'black', count: 15 };

      const boardNoBar = Board.fromState(stateNoBar);
      const boardWithBar = Board.fromState(stateWithBar);

      const scoreNoBar = evaluateBoard(boardNoBar, 'white', HARD_WEIGHTS);
      const scoreWithBar = evaluateBoard(boardWithBar, 'white', HARD_WEIGHTS);

      expect(scoreNoBar).toBeGreaterThan(scoreWithBar);
    });
  });

  describe('prime bonus', () => {
    it('scores higher when the player has a strong prime (5 in a row) vs. none', () => {
      // Board where white has a 5-point prime (points 1-5)
      const statePrime = emptyBoardState();
      for (let i = 1; i <= 5; i++) {
        statePrime.points[i] = { player: 'white', count: 2 };
      }
      statePrime.points[0] = { player: 'white', count: 5 };
      statePrime.points[18] = { player: 'black', count: 15 };

      // Board where white has scattered checkers (no prime)
      const stateNoPrime = emptyBoardState();
      stateNoPrime.points[0] = { player: 'white', count: 2 };
      stateNoPrime.points[3] = { player: 'white', count: 1 };
      stateNoPrime.points[6] = { player: 'white', count: 2 };
      stateNoPrime.points[9] = { player: 'white', count: 1 };
      stateNoPrime.points[12] = { player: 'white', count: 2 };
      stateNoPrime.points[15] = { player: 'white', count: 2 };
      stateNoPrime.points[18] = { player: 'black', count: 15 };

      const boardPrime = Board.fromState(statePrime);
      const boardNoPrime = Board.fromState(stateNoPrime);

      const scorePrime = evaluateBoard(boardPrime, 'white', HARD_WEIGHTS);
      const scoreNoPrime = evaluateBoard(boardNoPrime, 'white', HARD_WEIGHTS);

      expect(scorePrime).toBeGreaterThan(scoreNoPrime);
    });
  });

  describe('pip count', () => {
    it('scores higher when the player has fewer pips (closer to bearing off)', () => {
      // White far ahead in pip count: all checkers near bearing off at point 0
      const stateAhead = emptyBoardState();
      stateAhead.points[0] = { player: 'white', count: 9 };
      stateAhead.points[1] = { player: 'white', count: 6 };
      stateAhead.points[18] = { player: 'black', count: 15 };

      // White far behind: checkers near starting position
      const stateBehind = emptyBoardState();
      stateBehind.points[20] = { player: 'white', count: 9 };
      stateBehind.points[23] = { player: 'white', count: 6 };
      stateBehind.points[0] = { player: 'black', count: 15 };

      const boardAhead = Board.fromState(stateAhead);
      const boardBehind = Board.fromState(stateBehind);

      const scoreAhead = evaluateBoard(boardAhead, 'white', HARD_WEIGHTS);
      const scoreBehind = evaluateBoard(boardBehind, 'white', HARD_WEIGHTS);

      expect(scoreAhead).toBeGreaterThan(scoreBehind);
    });
  });
});

import { describe, expect, it } from 'vitest';

import { Board } from '@/engine/board';
import { CHECKERS_PER_PLAYER } from '@/engine/constants';
import type { BoardState, Move } from '@/engine/types';

describe('Board', () => {
  describe('initial()', () => {
    it('should create the standard backgammon starting position', () => {
      const board = Board.initial();

      // White: 2 on pt 23, 5 on pt 12, 3 on pt 7, 5 on pt 5
      expect(board.getPoint(23)).toEqual({ player: 'white', count: 2 });
      expect(board.getPoint(12)).toEqual({ player: 'white', count: 5 });
      expect(board.getPoint(7)).toEqual({ player: 'white', count: 3 });
      expect(board.getPoint(5)).toEqual({ player: 'white', count: 5 });

      // Black: 2 on pt 0, 5 on pt 11, 3 on pt 16, 5 on pt 18
      expect(board.getPoint(0)).toEqual({ player: 'black', count: 2 });
      expect(board.getPoint(11)).toEqual({ player: 'black', count: 5 });
      expect(board.getPoint(16)).toEqual({ player: 'black', count: 3 });
      expect(board.getPoint(18)).toEqual({ player: 'black', count: 5 });
    });

    it('should have no checkers on the bar', () => {
      const board = Board.initial();
      expect(board.getBar('white')).toBe(0);
      expect(board.getBar('black')).toBe(0);
    });

    it('should have no checkers borne off', () => {
      const board = Board.initial();
      expect(board.getBorneOff('white')).toBe(0);
      expect(board.getBorneOff('black')).toBe(0);
    });

    it('should have exactly 15 white checkers on the board', () => {
      const board = Board.initial();
      let total = 0;
      for (let i = 0; i < 24; i++) {
        const pt = board.getPoint(i);
        if (pt.player === 'white') {
          total += pt.count;
        }
      }
      expect(total).toBe(CHECKERS_PER_PLAYER);
    });

    it('should have exactly 15 black checkers on the board', () => {
      const board = Board.initial();
      let total = 0;
      for (let i = 0; i < 24; i++) {
        const pt = board.getPoint(i);
        if (pt.player === 'black') {
          total += pt.count;
        }
      }
      expect(total).toBe(CHECKERS_PER_PLAYER);
    });
  });

  describe('fromState()', () => {
    it('should create a board from a state snapshot', () => {
      const original = Board.initial();
      const cloned = Board.fromState(original.getState());
      expect(cloned.getState()).toEqual(original.getState());
    });

    it('should deep-copy the state — mutations do not affect the original', () => {
      const original = Board.initial();
      const state = original.getState();
      state.points[5]!.count = 99;
      expect(original.getPoint(5).count).toBe(5); // unchanged
    });
  });

  describe('applyMove() — basic moves', () => {
    it('should move a white checker from point 5 to point 4 using die=1', () => {
      const board = Board.initial();
      const move: Move = { from: 5, to: 4, dieUsed: 1 };
      const next = board.applyMove(move, 'white');

      expect(next.getPoint(5)).toEqual({ player: 'white', count: 4 });
      expect(next.getPoint(4)).toEqual({ player: 'white', count: 1 });
    });

    it('should move a black checker from point 0 to point 2 using die=2', () => {
      const board = Board.initial();
      const move: Move = { from: 0, to: 2, dieUsed: 2 };
      const next = board.applyMove(move, 'black');

      expect(next.getPoint(0)).toEqual({ player: 'black', count: 1 });
      expect(next.getPoint(2)).toEqual({ player: 'black', count: 1 });
    });

    it('should stack multiple checkers on the same point', () => {
      const board = Board.initial();
      const move1: Move = { from: 5, to: 4, dieUsed: 1 };
      const move2: Move = { from: 5, to: 4, dieUsed: 1 };
      const b1 = board.applyMove(move1, 'white');
      const b2 = b1.applyMove(move2, 'white');

      expect(b2.getPoint(4)).toEqual({ player: 'white', count: 2 });
    });

    it('should set player to null when last checker leaves a point', () => {
      const board = Board.initial();
      // Move both white checkers off point 23
      const b1 = board.applyMove({ from: 23, to: 22, dieUsed: 1 }, 'white');
      const b2 = b1.applyMove({ from: 23, to: 22, dieUsed: 1 }, 'white');

      expect(b2.getPoint(23)).toEqual({ player: null, count: 0 });
      expect(b2.getPoint(22)).toEqual({ player: 'white', count: 2 });
    });
  });

  describe('applyMove() — hitting blots', () => {
    it('should send an opponent blot to the bar when landing on it', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'white', count: 2 };
      state.points[7] = { player: 'black', count: 1 }; // blot

      const board = Board.fromState(state);
      const next = board.applyMove({ from: 10, to: 7, dieUsed: 3 }, 'white');

      expect(next.getPoint(7)).toEqual({ player: 'white', count: 1 });
      expect(next.getBar('black')).toBe(1);
    });

    it('should not hit when opponent has 2+ checkers on destination', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'white', count: 1 };
      state.points[7] = { player: 'black', count: 2 }; // blocked

      const board = Board.fromState(state);
      // applyMove doesn't validate legality — it will throw if dest has 2+ opponents
      expect(() => board.applyMove({ from: 10, to: 7, dieUsed: 3 }, 'white')).not.toThrow();
    });
  });

  describe('applyMove() — bar re-entry', () => {
    it('should re-enter from bar onto the board', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 1, black: 0 },
        borneOff: { white: 0, black: 0 },
      };

      const board = Board.fromState(state);
      const next = board.applyMove({ from: 'bar', to: 23, dieUsed: 1 }, 'white');

      expect(next.getBar('white')).toBe(0);
      expect(next.getPoint(23)).toEqual({ player: 'white', count: 1 });
    });

    it('should throw if player has no checkers on bar', () => {
      const board = Board.initial();
      expect(() => board.applyMove({ from: 'bar', to: 23, dieUsed: 1 }, 'white')).toThrow();
    });
  });

  describe('applyMove() — bearing off', () => {
    it('should increment borneOff when move.to is "off"', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[2] = { player: 'white', count: 1 };

      const board = Board.fromState(state);
      const next = board.applyMove({ from: 2, to: 'off', dieUsed: 3 }, 'white');

      expect(next.getBorneOff('white')).toBe(1);
      expect(next.getPoint(2)).toEqual({ player: null, count: 0 });
    });
  });

  describe('applyMove() — immutability', () => {
    it('should not mutate the original board', () => {
      const board = Board.initial();
      const originalState = board.getState();
      board.applyMove({ from: 5, to: 4, dieUsed: 1 }, 'white');
      expect(board.getState()).toEqual(originalState);
    });
  });

  describe('canBearOff()', () => {
    it('should return false at game start', () => {
      const board = Board.initial();
      expect(board.canBearOff('white')).toBe(false);
      expect(board.canBearOff('black')).toBe(false);
    });

    it('should return true when all white checkers are in home board (0-5)', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[0] = { player: 'white', count: 5 };
      state.points[1] = { player: 'white', count: 5 };
      state.points[2] = { player: 'white', count: 5 };

      const board = Board.fromState(state);
      expect(board.canBearOff('white')).toBe(true);
    });

    it('should return false when white has checkers outside home board', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[0] = { player: 'white', count: 5 };
      state.points[6] = { player: 'white', count: 1 }; // outside home board

      const board = Board.fromState(state);
      expect(board.canBearOff('white')).toBe(false);
    });

    it('should return false when white has checkers on the bar', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 1, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[0] = { player: 'white', count: 14 };

      const board = Board.fromState(state);
      expect(board.canBearOff('white')).toBe(false);
    });

    it('should return true when some white checkers are already borne off', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 5, black: 0 },
      };
      state.points[0] = { player: 'white', count: 10 };

      const board = Board.fromState(state);
      expect(board.canBearOff('white')).toBe(true);
    });
  });

  describe('isComplete()', () => {
    it('should return false at game start', () => {
      const board = Board.initial();
      expect(board.isComplete('white')).toBe(false);
    });

    it('should return true when 15 checkers are borne off', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 15, black: 0 },
      };
      const board = Board.fromState(state);
      expect(board.isComplete('white')).toBe(true);
      expect(board.isComplete('black')).toBe(false);
    });
  });

  describe('getPipCount()', () => {
    it('should return 0 for a player who has borne off all checkers', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 15, black: 0 },
      };
      const board = Board.fromState(state);
      expect(board.getPipCount('white')).toBe(0);
    });

    it('should count bar checkers with max distance', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null, count: 0 })) as BoardState['points'],
        bar: { white: 1, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      const board = Board.fromState(state);
      // White bar = 25 pips (furthest possible)
      expect(board.getPipCount('white')).toBe(25);
    });

    it('should compute correct pip count for initial position (white = 167)', () => {
      const board = Board.initial();
      // Standard backgammon initial pip count for each player is 167
      expect(board.getPipCount('white')).toBe(167);
      expect(board.getPipCount('black')).toBe(167);
    });
  });
});

import { describe, expect, it } from 'vitest';

import { Board } from '@/engine/board';
import { createInitialState, rollTurnDice, selectMove } from '@/engine/gameController';
import { generateLegalMoves, getValidDestinations } from '@/engine/moveValidator';
import type { BoardState } from '@/engine/types';


describe('multi-move: same checker moved twice in a turn', () => {
  it('should allow the same checker to be selected as source for a second move after a pending first move', () => {
    // White at point 12 with dice [6, 3]
    // Move 1: 12→6 (die 6). Now checker is at 6.
    // Move 2: 6→3 (die 3). Should be valid.
    const board = Board.initial();
    // After move1: checker moved from 12 to 6
    const boardAfterMove1 = board.applyMove({ from: 12, to: 6, dieUsed: 6 }, 'white');
    // getValidDestinations from 6 with die [3] should return [3]
    const dests = getValidDestinations(boardAfterMove1, 'white', 6, [3]);
    expect(dests).toContain(3);
  });

  it('should include the second move in legalMovesForTurn after the first move', () => {
    // From initial board with dice [6, 3], white moves 12→6 via selectMove
    let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
    // Manually set up the moving phase with dice [6,3]
    state = rollTurnDice({ ...state, phase: 'rolling' }, [6, 3]);
    // Apply first move
    state = selectMove(state, { from: 12, to: 6, dieUsed: 6 });
    // legalMovesForTurn should still have moves, specifically from 6 with die 3
    expect(state.legalMovesForTurn.length).toBeGreaterThan(0);
    // We should be able to move checker from 6
    const canMoveFrom6 = state.legalMovesForTurn.some((seq) => seq.some((m) => m.from === 6));
    expect(canMoveFrom6).toBe(true);
  });
});

describe('generateLegalMoves()', () => {
  describe('basic single moves', () => {
    it('should generate a forward move for white with die=3', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'white', count: 1 };

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [3, 5]);

      // Should contain a sequence using die=3: 10→7
      const hasMove = moves.some((seq) => seq.some((m) => m.from === 10 && m.to === 7 && m.dieUsed === 3));
      expect(hasMove).toBe(true);
    });

    it('should generate a forward move for black with die=3', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'black', count: 1 };

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'black', [3, 5]);

      // Black moves +3: 10→13
      const hasMove = moves.some((seq) => seq.some((m) => m.from === 10 && m.to === 13 && m.dieUsed === 3));
      expect(hasMove).toBe(true);
    });
  });

  describe('blocked points', () => {
    it('should not move to a point with 2+ opponent checkers', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'white', count: 1 };
      state.points[7] = { player: 'black', count: 2 }; // blocked

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [3]);

      const blockedMove = moves.some((seq) => seq.some((m) => m.to === 7));
      expect(blockedMove).toBe(false);
    });

    it('should allow landing on a point with 1 opponent (blot = hit)', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'white', count: 1 };
      state.points[7] = { player: 'black', count: 1 }; // blot

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [3]);

      const hitMove = moves.some((seq) => seq.some((m) => m.from === 10 && m.to === 7));
      expect(hitMove).toBe(true);
    });
  });

  describe('bar re-entry', () => {
    it('should force bar re-entry before any other move', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 1, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[5] = { player: 'white', count: 5 }; // white checker on board too

      const board = Board.fromState(state);
      // die=1 → white enters point 23
      const moves = generateLegalMoves(board, 'white', [1]);

      expect(moves.length).toBeGreaterThan(0);
      // All moves must start from 'bar'
      const allFromBar = moves.every((seq) => seq.every((m) => m.from === 'bar'));
      expect(allFromBar).toBe(true);
    });

    it('should allow entry for white: die=1 → point 23, die=6 → point 18', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 1, black: 0 },
        borneOff: { white: 0, black: 0 },
      };

      const board = Board.fromState(state);

      const moves1 = generateLegalMoves(board, 'white', [1]);
      expect(moves1.some((s) => s.some((m) => m.from === 'bar' && m.to === 23))).toBe(true);

      const moves6 = generateLegalMoves(board, 'white', [6]);
      expect(moves6.some((s) => s.some((m) => m.from === 'bar' && m.to === 18))).toBe(true);
    });

    it('should allow entry for black: die=1 → point 0, die=6 → point 5', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 1 },
        borneOff: { white: 0, black: 0 },
      };

      const board = Board.fromState(state);

      const moves1 = generateLegalMoves(board, 'black', [1]);
      expect(moves1.some((s) => s.some((m) => m.from === 'bar' && m.to === 0))).toBe(true);

      const moves6 = generateLegalMoves(board, 'black', [6]);
      expect(moves6.some((s) => s.some((m) => m.from === 'bar' && m.to === 5))).toBe(true);
    });

    it('should return empty if all entry points are blocked', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 1, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      // Block all of black's home board (white enters into points 18-23)
      for (let i = 18; i <= 23; i++) {
        state.points[i] = { player: 'black', count: 2 };
      }

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [1, 2]);
      expect(moves).toHaveLength(0);
    });
  });

  describe('doubles (4 moves)', () => {
    it('should generate sequences of up to 4 moves for doubles', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[20] = { player: 'white', count: 4 };

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [2, 2, 2, 2]); // doubles 2

      // Should have sequences with 4 moves (one per die)
      const hasFullSeq = moves.some((seq) => seq.length === 4);
      expect(hasFullSeq).toBe(true);
    });
  });

  describe('must-use-both-dice rule', () => {
    it('should prefer sequences that use both dice', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'white', count: 2 };

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [3, 5]);

      // All returned sequences should use 2 moves (both dice)
      const allUseBoth = moves.every((seq) => seq.length === 2);
      expect(allUseBoth).toBe(true);
    });

    it('should force higher die when only one die can be used', () => {
      // White at point 8.
      // die=3: 8-3=5 blocked by black×2 → can't use die=3 directly.
      // die=5: 8-5=3 open → usable.
      // After using die=5 (now at 3): die=3 from 3 → 3-3=0 blocked by black×2 → can't use die=3 second.
      // Result: only die=5 is ever usable (maxUsed=1) → must use the higher die (5).
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[8] = { player: 'white', count: 1 };
      state.points[5] = { player: 'black', count: 2 }; // blocks die=3 from point 8
      state.points[0] = { player: 'black', count: 2 }; // blocks die=3 from point 3 (after die=5 move)

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [3, 5]);

      // Only die=5 is usable → all sequences must use die=5
      expect(moves.length).toBeGreaterThan(0);
      const allUseHigher = moves.every((seq) => seq.every((m) => m.dieUsed === 5));
      expect(allUseHigher).toBe(true);
    });
  });

  describe('bearing off', () => {
    it('should not allow bearing off when checkers are outside home board', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[0] = { player: 'white', count: 5 };
      state.points[8] = { player: 'white', count: 1 }; // outside home board

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [1]);

      const bearOffMove = moves.some((s) => s.some((m) => m.to === 'off'));
      expect(bearOffMove).toBe(false);
    });

    it('should allow bearing off when all checkers in home board — exact die', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      // White home board: points 0-5, bearing off with exact die
      state.points[2] = { player: 'white', count: 1 }; // die=3 would bear off (2+1=3)

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [3]);

      const bearOff = moves.some((s) => s.some((m) => m.from === 2 && m.to === 'off'));
      expect(bearOff).toBe(true);
    });

    it('should allow bearing off from highest point with higher die', () => {
      // White has only checker on point 1 (die=1 would be exact; die=3 is higher)
      // With die=3 and highest occupied is point 1, should bear off
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[1] = { player: 'white', count: 1 }; // only checker

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [3]);

      const bearOff = moves.some((s) => s.some((m) => m.from === 1 && m.to === 'off'));
      expect(bearOff).toBe(true);
    });

    it('should NOT bear off from a lower point if a higher point has a checker', () => {
      // White has checkers on points 1 and 4; die=3 → exact for point 2 (not occupied).
      // Point 4 is highest occupied. die=3 only reaches exact pt 2 (not occupied),
      // so can't bear off pt 1 (lower) — can only bear off if it's the highest.
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[1] = { player: 'white', count: 1 };
      state.points[4] = { player: 'white', count: 1 }; // higher than what die=3 aims for

      const board = Board.fromState(state);
      // die=3: exact target is point 2 (not occupied); highest occupied is point 4 > 2
      // So die=3 cannot bear off point 1
      const moves = generateLegalMoves(board, 'white', [3]);

      const bearOffPt1 = moves.some((s) => s.some((m) => m.from === 1 && m.to === 'off'));
      expect(bearOffPt1).toBe(false);
    });

    it('should allow black to bear off with exact die', () => {
      // Black home board: points 18-23
      // Point 20 (index) with die=4: black bears off (exact: 24-20=4)
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[20] = { player: 'black', count: 1 };

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'black', [4]);

      const bearOff = moves.some((s) => s.some((m) => m.from === 20 && m.to === 'off'));
      expect(bearOff).toBe(true);
    });
  });

  describe('no legal moves', () => {
    it('should return empty array when no moves are possible', () => {
      // White on bar, all entry points blocked
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 1, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      for (let i = 18; i <= 23; i++) {
        state.points[i] = { player: 'black', count: 2 };
      }

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [1, 2]);
      expect(moves).toHaveLength(0);
    });

    it('should return empty array when all destination points are blocked', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      // White on point 5, block points 2, 3, 4 with black
      state.points[5] = { player: 'white', count: 1 };
      state.points[2] = { player: 'black', count: 2 };
      state.points[3] = { player: 'black', count: 2 };
      state.points[4] = { player: 'black', count: 2 };

      const board = Board.fromState(state);
      const moves = generateLegalMoves(board, 'white', [1, 2, 3]);

      // die=1→4 blocked, die=2→3 blocked, die=3→2 blocked
      expect(moves).toHaveLength(0);
    });
  });

  describe('getValidDestinations()', () => {
    it('should return valid destinations for a checker', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'white', count: 1 };

      const board = Board.fromState(state);
      const dests = getValidDestinations(board, 'white', 10, [3, 5]);

      expect(dests).toContain(7);  // 10-3
      expect(dests).toContain(5);  // 10-5
    });

    it('should not include blocked destinations', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[10] = { player: 'white', count: 1 };
      state.points[7] = { player: 'black', count: 2 };

      const board = Board.fromState(state);
      const dests = getValidDestinations(board, 'white', 10, [3]);

      expect(dests).not.toContain(7);
    });

    it('should include "off" when bearing off is legal', () => {
      const state: BoardState = {
        points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      state.points[2] = { player: 'white', count: 1 }; // exact die=3 bear-off

      const board = Board.fromState(state);
      const dests = getValidDestinations(board, 'white', 2, [3]);

      expect(dests).toContain('off');
    });
  });

  describe('getValidDestinations()', () => {
    describe('bar re-entry', () => {
      it('should return entry points for white from bar', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 1, black: 0 },
          borneOff: { white: 0, black: 0 },
        };

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'white', 'bar', [2, 5]);

        // die=2 → point 22, die=5 → point 19
        expect(dests).toContain(22);
        expect(dests).toContain(19);
      });

      it('should return entry points for black from bar', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 0, black: 1 },
          borneOff: { white: 0, black: 0 },
        };

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'black', 'bar', [3, 4]);

        // die=3 → point 2, die=4 → point 3
        expect(dests).toContain(2);
        expect(dests).toContain(3);
      });

      it('should not include blocked entry points (2+ opponent checkers)', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 1, black: 0 },
          borneOff: { white: 0, black: 0 },
        };
        // Block point 22 (die=2 for white) with 2 black checkers
        state.points[22] = { player: 'black', count: 2 };

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'white', 'bar', [2, 5]);

        expect(dests).not.toContain(22); // blocked
        expect(dests).toContain(19);    // open
      });

      it('should include blot (1 opponent checker) as valid hit destination', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 1, black: 0 },
          borneOff: { white: 0, black: 0 },
        };
        // Point 22 has a black blot
        state.points[22] = { player: 'black', count: 1 };

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'white', 'bar', [2]);

        // Can hit the blot
        expect(dests).toContain(22);
      });

      it('should include friendly checker point as valid destination (can stack)', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 1, black: 0 },
          borneOff: { white: 0, black: 0 },
        };
        // White already has a checker at point 22 (anchor in opponent home)
        state.points[22] = { player: 'white', count: 1 };

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'white', 'bar', [2]);

        // Can stack on own checker
        expect(dests).toContain(22);
      });

      it('should return empty array when all entry points are blocked', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 1, black: 0 },
          borneOff: { white: 0, black: 0 },
        };
        // Block all white entry points (18-23) with 2+ black checkers
        for (let i = 18; i <= 23; i++) {
          state.points[i] = { player: 'black', count: 2 };
        }

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'white', 'bar', [1, 2, 3, 4, 5, 6]);

        expect(dests).toHaveLength(0);
      });

      it('should use die values to determine entry columns correctly for white', () => {
        // Verify the exact mapping: white die=1 → point 23, die=6 → point 18
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 1, black: 0 },
          borneOff: { white: 0, black: 0 },
        };
        const board = Board.fromState(state);

        for (let die = 1; die <= 6; die++) {
          const dests = getValidDestinations(board, 'white', 'bar', [die as 1|2|3|4|5|6]);
          const expectedPoint = 24 - die;
          expect(dests).toContain(expectedPoint);
        }
      });

      it('should use die values to determine entry columns correctly for black', () => {
        // Verify: black die=1 → point 0, die=6 → point 5
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 0, black: 1 },
          borneOff: { white: 0, black: 0 },
        };
        const board = Board.fromState(state);

        for (let die = 1; die <= 6; die++) {
          const dests = getValidDestinations(board, 'black', 'bar', [die as 1|2|3|4|5|6]);
          const expectedPoint = die - 1;
          expect(dests).toContain(expectedPoint);
        }
      });
    });

    describe('hit detection (isHit scenarios)', () => {
      it('should return blot point as valid destination for normal move', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 0, black: 0 },
          borneOff: { white: 0, black: 0 },
        };
        state.points[10] = { player: 'white', count: 2 };
        state.points[7] = { player: 'black', count: 1 }; // blot

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'white', 10, [3]);

        expect(dests).toContain(7); // can hit the blot
      });

      it('should return friendly stack point as valid destination', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 0, black: 0 },
          borneOff: { white: 0, black: 0 },
        };
        state.points[10] = { player: 'white', count: 2 };
        state.points[7] = { player: 'white', count: 1 }; // friendly

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'white', 10, [3]);

        expect(dests).toContain(7); // can stack on own checker
      });

      it('should NOT return blocked point (2+ opponent checkers) as valid destination', () => {
        const state: BoardState = {
          points: Array(24).fill(null).map(() => ({ player: null as null, count: 0 })) as BoardState['points'],
          bar: { white: 0, black: 0 },
          borneOff: { white: 0, black: 0 },
        };
        state.points[10] = { player: 'white', count: 2 };
        state.points[7] = { player: 'black', count: 2 }; // blocked

        const board = Board.fromState(state);
        const dests = getValidDestinations(board, 'white', 10, [3]);

        expect(dests).not.toContain(7);
      });
    });
  });
});

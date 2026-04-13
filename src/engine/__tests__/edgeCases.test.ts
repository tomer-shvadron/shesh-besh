import { describe, expect, it } from 'vitest';

import { Board } from '@/engine/board';
import {
  confirmOpeningRoll,
  confirmTurn,
  createInitialState,
  dismissNoMovesMessage,
  pauseGame,
  resumeGame,
  rollAiDice,
  rollOpeningDie,
  rollTurnDice,
  selectMove,
  skipTurn,
  undoLastMove,
  undoTurn,
} from '@/engine/gameController';
import type { GameState } from '@/engine/gameController';
import { generateLegalMoves, getValidDestinations, isMoveLegal } from '@/engine/moveValidator';
import type { BoardState, Move } from '@/engine/types';

/**
 * Build a minimal board state with only the listed points populated. Everything
 * else is empty so tests can focus on one scenario at a time.
 */
function boardWith(
  populated: { index: number; player: 'white' | 'black'; count: number }[],
  opts: {
    bar?: { white?: number; black?: number };
    borneOff?: { white?: number; black?: number };
  } = {},
): BoardState {
  const points: BoardState['points'] = Array.from({ length: 24 }, () => ({ player: null, count: 0 }));
  for (const { index, player, count } of populated) {
    points[index] = { player, count };
  }
  return {
    points,
    bar: { white: opts.bar?.white ?? 0, black: opts.bar?.black ?? 0 },
    borneOff: { white: opts.borneOff?.white ?? 0, black: opts.borneOff?.black ?? 0 },
  };
}

function makeMovingState(board: BoardState, overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
  return {
    ...base,
    board,
    phase: 'moving',
    currentPlayer: 'white',
    dice: [3, 5],
    remainingDice: [3, 5],
    ...overrides,
  };
}

describe('engine edge cases', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Bear-off overshoot
  // ─────────────────────────────────────────────────────────────────────────────
  describe('bear-off overshoot', () => {
    it('allows bearing off with an exact-match die', () => {
      // White all in home (points 0..5), one checker on point 3. Dice [4,2].
      // A 4 from point 3 is exact → should be allowed as a bear-off move.
      const board = boardWith([
        { index: 0, player: 'white', count: 5 },
        { index: 1, player: 'white', count: 5 },
        { index: 2, player: 'white', count: 4 },
        { index: 3, player: 'white', count: 1 },
      ]);
      const b = Board.fromState(board);
      const dests = getValidDestinations(b, 'white', 3, [4, 2]);
      expect(dests).toContain('off');
    });

    it('allows overshoot bear-off only when no higher checkers exist', () => {
      // White all in home; highest occupied point is 3. Roll a 6.
      // Since no checkers on points 4 or 5, the 6 should bear off the point-3 checker.
      const board = boardWith([
        { index: 0, player: 'white', count: 5 },
        { index: 1, player: 'white', count: 5 },
        { index: 2, player: 'white', count: 4 },
        { index: 3, player: 'white', count: 1 },
      ]);
      const b = Board.fromState(board);
      const dests = getValidDestinations(b, 'white', 3, [6]);
      expect(dests).toContain('off');
    });

    it('forbids overshoot when a higher checker exists — must move it first', () => {
      // White mostly in home but one checker still on point 5. Rolling a 6 from
      // point 3 would overshoot; that is illegal while a higher point is occupied.
      const board = boardWith([
        { index: 0, player: 'white', count: 4 },
        { index: 1, player: 'white', count: 5 },
        { index: 2, player: 'white', count: 4 },
        { index: 3, player: 'white', count: 1 },
        { index: 5, player: 'white', count: 1 },
      ]);
      const b = Board.fromState(board);
      const dests = getValidDestinations(b, 'white', 3, [6]);
      expect(dests).not.toContain('off');
    });

    it('does not bear off while any checker is still outside the home board', () => {
      // White with one straggler on point 23 cannot bear off anything yet.
      const board = boardWith([
        { index: 0, player: 'white', count: 4 },
        { index: 1, player: 'white', count: 5 },
        { index: 2, player: 'white', count: 5 },
        { index: 23, player: 'white', count: 1 },
      ]);
      const b = Board.fromState(board);
      const dests = getValidDestinations(b, 'white', 0, [1]);
      expect(dests).not.toContain('off');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Bar re-entry with a hit (double-hit sequence)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('bar re-entry with a hit', () => {
    it('hits a blot when re-entering from the bar', () => {
      // Black has one checker on bar. Black enters on point (die - 1), so die 4 → point 3.
      // Place a white blot at point 3 and verify the bar entry hits it.
      const board = boardWith(
        [
          { index: 3, player: 'white', count: 1 }, // blot
        ],
        { bar: { black: 1 } },
      );
      const b = Board.fromState(board);
      const dests = getValidDestinations(b, 'black', 'bar', [4]);
      expect(dests).toContain(3);

      // Apply the move and confirm the white blot was sent to the bar
      const after = b.applyMove({ from: 'bar', to: 3, dieUsed: 4 }, 'black').getState();
      expect(after.bar.white).toBe(1);
      expect(after.bar.black).toBe(0);
      expect(after.points[3]).toEqual({ player: 'black', count: 1 });
    });

    it('cannot re-enter onto an anchored opponent point', () => {
      // White has 2+ checkers on point 3 → anchored. Black (die 4 → point 3) cannot enter.
      const board = boardWith(
        [
          { index: 3, player: 'white', count: 2 },
        ],
        { bar: { black: 1 } },
      );
      const b = Board.fromState(board);
      const dests = getValidDestinations(b, 'black', 'bar', [4]);
      expect(dests).not.toContain(3);
    });

    it('must re-enter before making any other move', () => {
      // Black has a checker on bar AND on point 12. Legal move generation should
      // only produce bar-entry moves until the bar is cleared.
      const board = boardWith(
        [
          { index: 12, player: 'black', count: 2 },
          { index: 23, player: 'white', count: 2 }, // points where black can enter are open
        ],
        { bar: { black: 1 } },
      );
      const b = Board.fromState(board);
      const sequences = generateLegalMoves(b, 'black', [4, 5]);
      // Every sequence must start from bar
      for (const seq of sequences) {
        expect(seq[0]?.from).toBe('bar');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Opening-roll ties
  // ─────────────────────────────────────────────────────────────────────────────
  describe('opening-roll ties', () => {
    it('resets both rolls after a tie', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 4);
      state = rollOpeningDie(state, 'black', 4);
      expect(state.openingRolls).toEqual({ white: null, black: null });
      expect(state.phase).toBe('opening-roll');
    });

    it('handles three consecutive ties then resolves', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      // Tie 1
      state = rollOpeningDie(state, 'white', 2);
      state = rollOpeningDie(state, 'black', 2);
      // Tie 2
      state = rollOpeningDie(state, 'white', 5);
      state = rollOpeningDie(state, 'black', 5);
      // Tie 3
      state = rollOpeningDie(state, 'white', 6);
      state = rollOpeningDie(state, 'black', 6);
      // Final decisive roll
      state = rollOpeningDie(state, 'white', 3);
      state = rollOpeningDie(state, 'black', 1);
      expect(state.phase).toBe('opening-roll-done');
      expect(state.currentPlayer).toBe('white');
      expect(state.dice).toEqual([3, 1]);
    });

    it('correctly assigns currentPlayer when black wins the opening roll', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 2);
      state = rollOpeningDie(state, 'black', 5);
      expect(state.currentPlayer).toBe('black');
      expect(state.dice).toEqual([2, 5]);
    });

    it('ignores forcedValue after transition is complete', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 6);
      state = rollOpeningDie(state, 'black', 1);
      expect(state.phase).toBe('opening-roll-done');
      // Further rolls should not un-decide — rollOpeningDie only fires during opening-roll
      const again = rollOpeningDie(state, 'white', 1);
      // The only effect should be overwriting the white entry, not restarting the phase
      expect(again.phase).toBe('opening-roll-done');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Pause / resume preserves in-flight turn state
  // ─────────────────────────────────────────────────────────────────────────────
  describe('pause / resume preserves turn state', () => {
    it('resumes into moving when pending moves exist', () => {
      const state = makeMovingState(Board.initial().getState(), {
        pendingMoves: [{ from: 23, to: 20, dieUsed: 3 }],
        remainingDice: [5],
      });
      const paused = pauseGame(state);
      expect(paused.phase).toBe('paused');
      expect(paused.pendingMoves).toEqual(state.pendingMoves);
      expect(paused.remainingDice).toEqual(state.remainingDice);

      const resumed = resumeGame(paused);
      expect(resumed.phase).toBe('moving');
      expect(resumed.pendingMoves).toEqual(state.pendingMoves);
      expect(resumed.remainingDice).toEqual(state.remainingDice);
    });

    it('resumes into rolling when no pending moves', () => {
      const state = makeMovingState(Board.initial().getState(), {
        phase: 'rolling',
        dice: null,
        remainingDice: [],
      });
      const paused = pauseGame(state);
      const resumed = resumeGame(paused);
      expect(resumed.phase).toBe('rolling');
    });

    it('resumes into ai-thinking when pva + black and no pending moves', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'rolling',
        currentPlayer: 'black',
      };
      const paused = pauseGame(state);
      const resumed = resumeGame(paused);
      expect(resumed.phase).toBe('ai-thinking');
    });

    it('is a no-op when called from game-over / not-started / paused', () => {
      const gameOver: GameState = { ...makeMovingState(Board.initial().getState()), phase: 'game-over' };
      expect(pauseGame(gameOver)).toBe(gameOver);

      const notStarted: GameState = { ...makeMovingState(Board.initial().getState()), phase: 'not-started' };
      expect(pauseGame(notStarted)).toBe(notStarted);

      const already: GameState = { ...makeMovingState(Board.initial().getState()), phase: 'paused' };
      expect(pauseGame(already)).toBe(already);
    });

    it('resumeGame is a no-op when state is not paused', () => {
      const state = makeMovingState(Board.initial().getState());
      expect(resumeGame(state)).toBe(state);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-skip on no legal moves
  // ─────────────────────────────────────────────────────────────────────────────
  describe('skip turn when no legal moves exist', () => {
    it('produces an empty TurnMoves entry in moveHistory', () => {
      const state = makeMovingState(Board.initial().getState(), {
        dice: [6, 6],
        remainingDice: [6, 6, 6, 6],
      });
      const after = skipTurn(state);
      expect(after.moveHistory[after.moveHistory.length - 1]).toEqual([]);
    });

    it('switches current player', () => {
      const state = makeMovingState(Board.initial().getState());
      const after = skipTurn(state);
      expect(after.currentPlayer).toBe('black');
    });

    it('records the dice in diceHistory even on skip', () => {
      const state = makeMovingState(Board.initial().getState(), { dice: [2, 3] });
      const after = skipTurn(state);
      expect(after.diceHistory[after.diceHistory.length - 1]).toEqual([2, 3]);
    });

    it('transitions to ai-thinking when next player is AI', () => {
      const state: GameState = {
        ...makeMovingState(Board.initial().getState()),
        gameMode: 'pva',
      };
      const after = skipTurn(state);
      expect(after.phase).toBe('ai-thinking');
    });

    it('rollTurnDice sets noMovesMessage when zero legal moves result', () => {
      // Black barred, white owns every entry point (0..5) with 2+ checkers.
      // Any roll black makes yields no legal moves.
      const board = boardWith(
        [
          { index: 0, player: 'white', count: 2 },
          { index: 1, player: 'white', count: 2 },
          { index: 2, player: 'white', count: 2 },
          { index: 3, player: 'white', count: 2 },
          { index: 4, player: 'white', count: 2 },
          { index: 5, player: 'white', count: 2 },
        ],
        { bar: { black: 1 } },
      );
      const state: GameState = {
        ...createInitialState({ gameMode: 'pvp', difficulty: 'medium' }),
        phase: 'rolling',
        currentPlayer: 'black',
        board,
      };
      const after = rollTurnDice(state, [1, 2]);
      expect(after.legalMovesForTurn).toEqual([]);
      expect(after.noMovesMessage).toBe(true);
    });

    it('dismissNoMovesMessage clears the flag', () => {
      const state = makeMovingState(Board.initial().getState(), { noMovesMessage: true });
      const after = dismissNoMovesMessage(state);
      expect(after.noMovesMessage).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Undo
  // ─────────────────────────────────────────────────────────────────────────────
  describe('undo', () => {
    it('undoLastMove restores the die to remainingDice', () => {
      let state = makeMovingState(Board.initial().getState(), {
        dice: [3, 5],
        remainingDice: [3, 5],
      });
      const move: Move = { from: 23, to: 20, dieUsed: 3 };
      state = selectMove(state, move);
      expect(state.remainingDice).toEqual([5]);
      expect(state.pendingMoves).toHaveLength(1);

      const undone = undoLastMove(state);
      expect(undone.remainingDice).toContain(3);
      expect(undone.remainingDice).toContain(5);
      expect(undone.pendingMoves).toHaveLength(0);
    });

    it('undoLastMove is a no-op when no pending moves', () => {
      const state = makeMovingState(Board.initial().getState());
      const after = undoLastMove(state);
      expect(after).toBe(state);
    });

    it('undoLastMove refuses when phase is not moving', () => {
      const state = makeMovingState(Board.initial().getState(), { phase: 'rolling' });
      const after = undoLastMove(state);
      expect(after).toBe(state);
    });

    it('undoTurn restores the previous committed board', () => {
      // Play out one full turn and then undo it.
      let state: GameState = {
        ...makeMovingState(Board.initial().getState()),
        dice: [3, 5],
        remainingDice: [3, 5],
      };
      const boardBefore = state.board;
      state = selectMove(state, { from: 23, to: 20, dieUsed: 3 });
      state = selectMove(state, { from: 20, to: 15, dieUsed: 5 });
      state = confirmTurn(state);
      expect(state.currentPlayer).toBe('black');
      expect(state.moveHistory).toHaveLength(1);

      const undone = undoTurn(state);
      expect(undone.board).toEqual(boardBefore);
      expect(undone.currentPlayer).toBe('white');
      expect(undone.moveHistory).toHaveLength(0);
      expect(undone.phase).toBe('rolling');
    });

    it('undoTurn is a no-op when there is no history', () => {
      const state = makeMovingState(Board.initial().getState());
      const after = undoTurn(state);
      expect(after).toBe(state);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // rollAiDice — dice reuse when opening-roll dice are already set
  // ─────────────────────────────────────────────────────────────────────────────
  describe('rollAiDice', () => {
    it('reuses opening-roll dice instead of rolling fresh', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'ai-thinking',
        currentPlayer: 'black',
        dice: [6, 1],
        remainingDice: [6, 1],
      };
      const after = rollAiDice(state);
      expect(after.dice).toEqual([6, 1]);
      expect(after.phase).toBe('moving');
    });

    it('rolls fresh dice when starting a new AI turn', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'ai-thinking',
        currentPlayer: 'black',
        dice: null,
        remainingDice: [],
      };
      const after = rollAiDice(state, [4, 2]);
      expect(after.dice).toEqual([4, 2]);
      expect(after.remainingDice).toEqual([4, 2]);
      expect(after.phase).toBe('moving');
    });

    it('is a no-op when called outside ai-thinking phase', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'rolling',
        currentPlayer: 'black',
      };
      const after = rollAiDice(state);
      expect(after).toBe(state);
    });

    it('sets noMovesMessage when AI has no legal moves', () => {
      const board = boardWith(
        [
          { index: 0, player: 'white', count: 2 },
          { index: 1, player: 'white', count: 2 },
          { index: 2, player: 'white', count: 2 },
          { index: 3, player: 'white', count: 2 },
          { index: 4, player: 'white', count: 2 },
          { index: 5, player: 'white', count: 2 },
        ],
        { bar: { black: 1 } },
      );
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'ai-thinking',
        currentPlayer: 'black',
        board,
      };
      const after = rollAiDice(state, [1, 2]);
      expect(after.noMovesMessage).toBe(true);
      expect(after.legalMovesForTurn).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // confirmOpeningRoll branches
  // ─────────────────────────────────────────────────────────────────────────────
  describe('confirmOpeningRoll', () => {
    it('transitions pva state into ai-thinking when black wins opening roll', () => {
      let state = createInitialState({ gameMode: 'pva', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 1);
      state = rollOpeningDie(state, 'black', 6);
      expect(state.currentPlayer).toBe('black');
      const confirmed = confirmOpeningRoll(state);
      expect(confirmed.phase).toBe('ai-thinking');
    });

    it('transitions pvp state into moving regardless of winner', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 6);
      state = rollOpeningDie(state, 'black', 1);
      const confirmed = confirmOpeningRoll(state);
      expect(confirmed.phase).toBe('moving');
    });

    it('is a no-op when phase is not opening-roll-done', () => {
      const state = makeMovingState(Board.initial().getState());
      expect(confirmOpeningRoll(state)).toBe(state);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // isMoveLegal invariants
  // ─────────────────────────────────────────────────────────────────────────────
  describe('isMoveLegal', () => {
    it('rejects moves where the die value does not match the from→to distance', () => {
      const board = Board.initial();
      // White from 23 with die 3 lands on 20 (empty on initial board) — legal.
      const legal: Move = { from: 23, to: 20, dieUsed: 3 };
      expect(isMoveLegal(board, 'white', legal)).toBe(true);

      // Same from/to but claiming die 4 — computeDestination(23, 4) = 19 ≠ 20, illegal.
      const mismatchedDie: Move = { from: 23, to: 20, dieUsed: 4 };
      expect(isMoveLegal(board, 'white', mismatchedDie)).toBe(false);
    });

    it('rejects moves made by the wrong player (no checker at source)', () => {
      const board = Board.initial();
      // Point 23 belongs to white; black has no checker there.
      const move: Move = { from: 23, to: 20, dieUsed: 3 };
      expect(isMoveLegal(board, 'black', move)).toBe(false);
    });

    it('rejects non-bar moves while player has a checker on the bar', () => {
      const board = Board.fromState(
        boardWith(
          [{ index: 23, player: 'white', count: 2 }],
          { bar: { white: 1 } },
        ),
      );
      const move: Move = { from: 23, to: 20, dieUsed: 3 };
      expect(isMoveLegal(board, 'white', move)).toBe(false);
    });
  });
});

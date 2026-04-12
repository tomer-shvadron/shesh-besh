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
import type { BoardState, DiceRoll, GamePhase, Move } from '@/engine/types';

function makeRollingState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState({ gameMode: 'pvp', difficulty: 'medium' }),
    phase: 'rolling',
    currentPlayer: 'white',
    ...overrides,
  };
}

describe('gameController', () => {
  describe('createInitialState()', () => {
    it('should create state with opening-roll phase', () => {
      const state = createInitialState({ gameMode: 'pvp', difficulty: 'easy' });
      expect(state.phase).toBe('opening-roll');
    });

    it('should start with white as first player slot', () => {
      const state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      expect(state.currentPlayer).toBe('white');
    });

    it('should have no dice rolled', () => {
      const state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      expect(state.dice).toBeNull();
      expect(state.remainingDice).toHaveLength(0);
    });

    it('should have the initial board position', () => {
      const state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      const board = Board.fromState(state.board);
      expect(board.getPoint(23)).toEqual({ player: 'white', count: 2 });
    });
  });

  describe('rollOpeningDie()', () => {
    it('should record white rolling their opening die', () => {
      const state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      const next = rollOpeningDie(state, 'white', 4);
      expect(next.openingRolls.white).toBe(4);
      expect(next.openingRolls.black).toBeNull();
      expect(next.phase).toBe('opening-roll');
    });

    it('should transition to opening-roll-done when white rolls higher', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 5);
      state = rollOpeningDie(state, 'black', 3);

      expect(state.phase).toBe('opening-roll-done');
      expect(state.currentPlayer).toBe('white');
      expect(state.dice).toEqual([5, 3]);
    });

    it('should transition to opening-roll-done with black first when black rolls higher', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 2);
      state = rollOpeningDie(state, 'black', 6);

      expect(state.phase).toBe('opening-roll-done');
      expect(state.currentPlayer).toBe('black');
      expect(state.dice).toEqual([2, 6]);
    });

    it('should reset both rolls on a tie', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 4);
      state = rollOpeningDie(state, 'black', 4);

      expect(state.openingRolls.white).toBeNull();
      expect(state.openingRolls.black).toBeNull();
      expect(state.phase).toBe('opening-roll');
    });
  });

  describe('confirmOpeningRoll()', () => {
    it('should return same state if phase is not opening-roll-done', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 5);
      // Only one player rolled — still opening-roll phase
      const next = confirmOpeningRoll(state);
      expect(next).toBe(state);
    });

    it('should transition opening-roll-done to moving in pvp mode', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 5);
      state = rollOpeningDie(state, 'black', 3);
      expect(state.phase).toBe('opening-roll-done');
      expect(state.currentPlayer).toBe('white');

      const next = confirmOpeningRoll(state);
      expect(next.phase).toBe('moving');
    });

    it('should transition opening-roll-done to moving in pva mode when white won', () => {
      let state = createInitialState({ gameMode: 'pva', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 5);
      state = rollOpeningDie(state, 'black', 3);
      expect(state.phase).toBe('opening-roll-done');
      expect(state.currentPlayer).toBe('white');

      const next = confirmOpeningRoll(state);
      expect(next.phase).toBe('moving');
    });

    it('should transition opening-roll-done to ai-thinking in pva mode when black won', () => {
      let state = createInitialState({ gameMode: 'pva', difficulty: 'medium' });
      state = rollOpeningDie(state, 'white', 2);
      state = rollOpeningDie(state, 'black', 6);
      expect(state.phase).toBe('opening-roll-done');
      expect(state.currentPlayer).toBe('black');

      const next = confirmOpeningRoll(state);
      expect(next.phase).toBe('ai-thinking');
    });
  });

  describe('rollTurnDice()', () => {
    it('should not roll if not in rolling phase', () => {
      const state = makeRollingState({ phase: 'moving' });
      const next = rollTurnDice(state, [3, 5]);
      expect(next).toBe(state);
    });

    it('should set dice and transition to moving', () => {
      const state = makeRollingState();
      const next = rollTurnDice(state, [3, 5]);

      expect(next.dice).toEqual([3, 5]);
      expect(next.phase).toBe('moving');
      expect(next.remainingDice).toHaveLength(2);
    });

    it('should set 4 remaining dice for doubles', () => {
      const state = makeRollingState();
      const next = rollTurnDice(state, [4, 4]);

      expect(next.remainingDice).toHaveLength(4);
      expect(next.remainingDice).toEqual([4, 4, 4, 4]);
    });

    it('should set noMovesMessage when no legal moves exist', () => {
      // Block white completely
      const emptyPoints: BoardState['points'] = Array(24)
        .fill(null)
        .map(() => ({ player: null as null, count: 0 }));
      emptyPoints[23] = { player: 'white', count: 1 };
      // Block all reachable points
      for (let i = 17; i <= 22; i++) {
        emptyPoints[i] = { player: 'black', count: 2 };
      }
      const board: BoardState = {
        points: emptyPoints,
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };

      const state = makeRollingState({ board });
      const next = rollTurnDice(state, [1, 6]);

      expect(next.noMovesMessage).toBe(true);
    });
  });

  describe('selectMove()', () => {
    it('should not select a move when not in moving phase', () => {
      const state = makeRollingState({ phase: 'rolling' });
      const move: Move = { from: 5, to: 4, dieUsed: 1 };
      const next = selectMove(state, move);
      expect(next).toBe(state);
    });

    it('should add a pending move and consume the die', () => {
      const rolledState = rollTurnDice(makeRollingState(), [3, 5]);

      // Find a legal move from the white initial position
      // White has checkers at 5, 7, 12, 23 — die=3 from 5→2 is valid
      const move: Move = { from: 5, to: 2, dieUsed: 3 };
      const next = selectMove(rolledState, move);

      expect(next.pendingMoves).toHaveLength(1);
      expect(next.remainingDice).not.toContain(3);
      expect(next.remainingDice).toContain(5);
    });

    it('should return unchanged state if die is not available', () => {
      const rolledState = rollTurnDice(makeRollingState(), [3, 5]);
      const move: Move = { from: 5, to: 3, dieUsed: 2 }; // die=2 not in [3,5]
      const next = selectMove(rolledState, move);
      expect(next).toBe(rolledState);
    });
  });

  describe('undoLastMove()', () => {
    it('should restore the die and remove the pending move', () => {
      const rolledState = rollTurnDice(makeRollingState(), [3, 5]);
      const move: Move = { from: 5, to: 2, dieUsed: 3 };
      const afterMove = selectMove(rolledState, move);
      const afterUndo = undoLastMove(afterMove);

      expect(afterUndo.pendingMoves).toHaveLength(0);
      expect(afterUndo.remainingDice).toContain(3);
    });

    it('should do nothing if no pending moves', () => {
      const state = makeRollingState({ phase: 'moving', remainingDice: [3, 5] });
      const next = undoLastMove(state);
      expect(next).toBe(state);
    });
  });

  describe('confirmTurn()', () => {
    it('should update the board and switch player', () => {
      const rolledState = rollTurnDice(makeRollingState(), [3, 5]);
      const move1: Move = { from: 5, to: 2, dieUsed: 3 };
      const move2: Move = { from: 5, to: 0, dieUsed: 5 };
      const afterMoves = selectMove(selectMove(rolledState, move1), move2);
      const confirmed = confirmTurn(afterMoves);

      expect(confirmed.currentPlayer).toBe('black');
      expect(confirmed.phase).toBe('rolling');
      expect(confirmed.pendingMoves).toHaveLength(0);
      expect(confirmed.moveHistory).toHaveLength(1);
    });

    it('should detect win when 15 checkers borne off', () => {
      // Set up board where white bears off last checker
      const emptyPoints: BoardState['points'] = Array(24)
        .fill(null)
        .map(() => ({ player: null as null, count: 0 }));
      emptyPoints[0] = { player: 'white', count: 1 }; // last white checker at point 0
      const board: BoardState = {
        points: emptyPoints,
        bar: { white: 0, black: 0 },
        borneOff: { white: 14, black: 0 }, // 14 already borne off
      };

      const state = makeRollingState({ board, phase: 'moving', pendingMoves: [], remainingDice: [1] });
      const withMove = selectMove(state, { from: 0, to: 'off', dieUsed: 1 });
      const confirmed = confirmTurn(withMove);

      expect(confirmed.phase).toBe('game-over');
      expect(confirmed.winner).toBe('white');
    });

    it('should not confirm when not in moving phase', () => {
      const state = makeRollingState({ phase: 'rolling' });
      const next = confirmTurn(state);
      expect(next).toBe(state);
    });
  });

  describe('undoTurn()', () => {
    it('should restore previous board and switch back to previous player', () => {
      const rolledState = rollTurnDice(makeRollingState(), [3, 5]);
      const move: Move = { from: 5, to: 2, dieUsed: 3 };
      const afterMove = selectMove(rolledState, move);

      // Confirm turn: white → black
      const confirmed = confirmTurn(afterMove);
      expect(confirmed.currentPlayer).toBe('black');

      // Now undo the full turn (only works from rolling phase)
      const rollingBlack = rollTurnDice(confirmed, [2, 4]);
      const undoneTurn = undoTurn({ ...rollingBlack, phase: 'rolling', pendingMoves: [] });

      expect(undoneTurn.currentPlayer).toBe('white');
      expect(undoneTurn.phase).toBe('rolling');
    });

    it('should do nothing if no history', () => {
      const state = makeRollingState();
      const next = undoTurn(state);
      expect(next).toBe(state);
    });
  });

  describe('skipTurn()', () => {
    it('should switch player and clear dice', () => {
      const state = makeRollingState({
        phase: 'moving',
        dice: [3, 5],
        remainingDice: [3, 5],
        legalMovesForTurn: [],
      });
      const next = skipTurn(state);

      expect(next.currentPlayer).toBe('black');
      expect(next.dice).toBeNull();
      expect(next.remainingDice).toHaveLength(0);
    });
  });

  describe('pauseGame() / resumeGame()', () => {
    it('should pause the game', () => {
      const state = makeRollingState({ phase: 'rolling' });
      const paused = pauseGame(state);
      expect(paused.phase).toBe('paused');
    });

    it('should resume to rolling when no pending moves', () => {
      const state = makeRollingState({ phase: 'paused', pendingMoves: [] });
      const resumed = resumeGame(state);
      expect(resumed.phase).toBe('rolling');
    });

    it('should resume to moving when there are pending moves', () => {
      const state = makeRollingState({
        phase: 'paused',
        pendingMoves: [{ from: 5, to: 2, dieUsed: 3 }],
      });
      const resumed = resumeGame(state);
      expect(resumed.phase).toBe('moving');
    });

    it('should not pause an already paused game', () => {
      const state = makeRollingState({ phase: 'paused' });
      const next = pauseGame(state);
      expect(next).toBe(state);
    });

    it('should not resume a non-paused game', () => {
      const state = makeRollingState({ phase: 'rolling' });
      const next = resumeGame(state);
      expect(next).toBe(state);
    });

    it('should not pause a completed game', () => {
      const state = makeRollingState({ phase: 'game-over', winner: 'white' });
      const next = pauseGame(state);
      expect(next).toBe(state);
    });
  });

  describe('dismissNoMovesMessage()', () => {
    it('should clear the noMovesMessage flag', () => {
      const state = makeRollingState({ noMovesMessage: true });
      const next = dismissNoMovesMessage(state);
      expect(next.noMovesMessage).toBe(false);
    });
  });

  describe('rollAiDice()', () => {
    function makeAiThinkingState(overrides: Partial<GameState> = {}): GameState {
      return {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'ai-thinking',
        currentPlayer: 'black',
        dice: null,
        remainingDice: [],
        ...overrides,
      };
    }

    it('should return unchanged state if not in ai-thinking phase', () => {
      const state = makeAiThinkingState({ phase: 'rolling' });
      const next = rollAiDice(state);
      expect(next).toBe(state);
    });

    it('should transition from ai-thinking to moving', () => {
      const state = makeAiThinkingState();
      const next = rollAiDice(state, [3, 5]);
      expect(next.phase).toBe('moving');
      expect(next.dice).toEqual([3, 5]);
      expect(next.remainingDice).toHaveLength(2);
    });

    it('should compute legal moves after rolling', () => {
      const state = makeAiThinkingState();
      const next = rollAiDice(state, [1, 2]);
      expect(Array.isArray(next.legalMovesForTurn)).toBe(true);
    });

    it('should reuse existing dice when already set (opening roll case)', () => {
      const state = makeAiThinkingState({
        dice: [4, 6],
        remainingDice: [6, 4],
      });
      const next = rollAiDice(state); // should not re-roll
      expect(next.phase).toBe('moving');
      expect(next.dice).toEqual([4, 6]); // unchanged
      expect(next.remainingDice).toEqual([6, 4]); // unchanged
    });

    it('should set noMovesMessage when no legal moves exist for AI', () => {
      // Black has one checker but all forward points are blocked
      const emptyPoints: BoardState['points'] = Array(24)
        .fill(null)
        .map(() => ({ player: null as null, count: 0 }));
      emptyPoints[0] = { player: 'black', count: 1 };
      for (let i = 1; i <= 6; i++) {
        emptyPoints[i] = { player: 'white', count: 2 };
      }
      const board: BoardState = {
        points: emptyPoints,
        bar: { white: 0, black: 0 },
        borneOff: { white: 0, black: 0 },
      };
      const state = makeAiThinkingState({ board });
      const next = rollAiDice(state, [1, 2]);
      expect(next.noMovesMessage).toBe(true);
    });
  });

  describe('confirmTurn() — pva mode phase transitions', () => {
    it('should set phase to ai-thinking after white confirms in pva mode', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'moving',
        currentPlayer: 'white',
        remainingDice: [],
        pendingMoves: [],
      };
      const next = confirmTurn(state);
      expect(next.currentPlayer).toBe('black');
      expect(next.phase).toBe('ai-thinking');
    });

    it('should set phase to rolling after black (AI) confirms in pva mode', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'moving',
        currentPlayer: 'black',
        remainingDice: [],
        pendingMoves: [],
      };
      const next = confirmTurn(state);
      expect(next.currentPlayer).toBe('white');
      expect(next.phase).toBe('rolling');
    });

    it('should set phase to rolling after white confirms in pvp mode', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pvp', difficulty: 'medium' }),
        phase: 'moving',
        currentPlayer: 'white',
        remainingDice: [],
        pendingMoves: [],
      };
      const next = confirmTurn(state);
      expect(next.currentPlayer).toBe('black');
      expect(next.phase).toBe('rolling');
    });
  });

  describe('skipTurn() — pva mode phase transitions', () => {
    it('should set phase to ai-thinking after white skips in pva mode', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'moving',
        currentPlayer: 'white',
        dice: [1, 2],
        remainingDice: [1, 2],
        legalMovesForTurn: [],
        noMovesMessage: false,
      };
      const next = skipTurn(state);
      expect(next.currentPlayer).toBe('black');
      expect(next.phase).toBe('ai-thinking');
    });

    it('should set phase to rolling after black (AI) skips in pva mode', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'moving',
        currentPlayer: 'black',
        dice: [1, 2],
        remainingDice: [1, 2],
        legalMovesForTurn: [],
        noMovesMessage: false,
      };
      const next = skipTurn(state);
      expect(next.currentPlayer).toBe('white');
      expect(next.phase).toBe('rolling');
    });
  });

  describe('diceHistory tracking', () => {
    it('starts empty', () => {
      const state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      expect(state.diceHistory).toEqual([]);
    });

    it('records dice after confirmTurn', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollTurnDice({ ...state, phase: 'rolling' }, [3, 2]);
      state = selectMove(state, state.legalMovesForTurn[0]![0]!);
      const stateBeforeConfirm = { ...state, pendingMoves: state.pendingMoves };
      const confirmed = confirmTurn(stateBeforeConfirm);
      expect(confirmed.diceHistory).toHaveLength(1);
      expect(confirmed.diceHistory[0]).toEqual([3, 2]);
    });

    it('records null dice after skipTurn', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      // Manually put state in a skipable situation
      state = { ...state, dice: [1, 2] as DiceRoll, phase: 'moving' as GamePhase };
      const skipped = skipTurn(state);
      expect(skipped.diceHistory).toHaveLength(1);
      expect(skipped.diceHistory[0]).toEqual([1, 2]);
    });

    it('removes dice history entry after undoTurn', () => {
      let state = createInitialState({ gameMode: 'pvp', difficulty: 'medium' });
      state = rollTurnDice({ ...state, phase: 'rolling' }, [3, 2]);
      state = selectMove(state, state.legalMovesForTurn[0]![0]!);
      state = confirmTurn(state);
      expect(state.diceHistory).toHaveLength(1);
      const undone = undoTurn(state);
      expect(undone.diceHistory).toHaveLength(0);
    });
  });

  describe('resumeGame() — pva mode ai-thinking recovery', () => {
    it('should resume to ai-thinking when AI turn was paused with no pending moves', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'paused',
        currentPlayer: 'black',
        pendingMoves: [],
      };
      const next = resumeGame(state);
      expect(next.phase).toBe('ai-thinking');
    });

    it('should resume to rolling when human turn was paused', () => {
      const state: GameState = {
        ...createInitialState({ gameMode: 'pva', difficulty: 'medium' }),
        phase: 'paused',
        currentPlayer: 'white',
        pendingMoves: [],
      };
      const next = resumeGame(state);
      expect(next.phase).toBe('rolling');
    });
  });
});

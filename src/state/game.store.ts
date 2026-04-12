import { create } from 'zustand';

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
import { getValidDestinations } from '@/engine/moveValidator';
import type { Difficulty, DiceRoll, DiceValue, GameMode, Move, MoveFrom, MoveTo, Player } from '@/engine/types';

interface GameStoreState extends GameState {
  // UI-only state
  selectedPoint: MoveFrom | null;
  validDestinations: MoveTo[];

  // Game lifecycle
  initGame: (mode: GameMode, difficulty: Difficulty) => void;

  // Opening roll
  handleOpeningRoll: (player: Player) => void;
  handleConfirmOpeningRoll: () => void;

  // Turn flow
  handleRollDice: () => void;
  handleSelectPoint: (point: MoveFrom) => void;
  handleSelectDestination: (to: MoveTo) => void;
  handleConfirmTurn: () => void;
  handleUndoMove: () => void;
  handleUndoTurn: () => void;
  handleSkipTurn: () => void;

  // AI turn actions
  handleAiRollDice: () => void;
  handleAiSelectMove: (move: Move) => void;

  // Game control
  handlePause: () => void;
  handleResume: () => void;
  handleDismissNoMoves: () => void;

  // Timer
  incrementTimer: (ms: number) => void;

  // State restoration (used by load game)
  loadState: (state: GameState) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  // ── Initial engine state ────────────────────────────────────────────────────
  ...createInitialState({ gameMode: 'pvp', difficulty: 'medium' }),

  // ── UI state ────────────────────────────────────────────────────────────────
  selectedPoint: null,
  validDestinations: [],

  // ── Game lifecycle ───────────────────────────────────────────────────────────
  initGame: (mode, difficulty) => {
    // Auto-perform the opening roll (each player rolls one die; higher goes first).
    // Keep re-rolling until there is no tie, then transition straight to 'moving'.
    let state = createInitialState({ gameMode: mode, difficulty });
    let attempts = 0;
    while (state.phase === 'opening-roll' && attempts < 20) {
      state = rollOpeningDie(state, 'white');
      state = rollOpeningDie(state, 'black');
      attempts++;
    }

    set({
      ...state,
      selectedPoint: null,
      validDestinations: [],
    });
  },

  // ── Opening roll ─────────────────────────────────────────────────────────────
  handleOpeningRoll: (player) => {
    const state = get();
    const next = rollOpeningDie(state, player);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  // ── Confirm opening roll (start first turn) ─────────────────────────────────
  handleConfirmOpeningRoll: () => {
    const state = get();
    const next = confirmOpeningRoll(state);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  // ── Roll dice ─────────────────────────────────────────────────────────────────
  handleRollDice: () => {
    const state = get();
    const next = rollTurnDice(state);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  // ── Select a point (checker source) ─────────────────────────────────────────
  handleSelectPoint: (point) => {
    const state = get();

    // Deselect if same point clicked again
    if (state.selectedPoint === point) {
      set({ selectedPoint: null, validDestinations: [] });
      return;
    }

    // Compute valid destinations for this checker
    const board = buildCurrentBoard(state);
    const destinations = getValidDestinations(board, state.currentPlayer, point, state.remainingDice);

    set({ selectedPoint: point, validDestinations: destinations });
  },

  // ── Select destination (executes the move) ───────────────────────────────────
  handleSelectDestination: (to) => {
    const state = get();

    if (state.selectedPoint === null || state.phase !== 'moving') {
      return;
    }

    const from = state.selectedPoint;

    // Find the best matching die for this move (prefer smallest die that works)
    const dieUsed = findDieForMove(state, from, to);
    if (dieUsed === null) {
      return;
    }

    const move = { from, to, dieUsed };
    const next = selectMove(state, move);

    // Always set the intermediate state so the animation effect can fire this render cycle.
    set({ ...next, selectedPoint: null, validDestinations: [] });

    // Defer auto-confirm to the next task so animations have time to start.
    if (next.remainingDice.length === 0 || next.legalMovesForTurn.length === 0) {
      setTimeout(() => {
        const current = get();
        if (current.phase === 'moving') {
          const confirmed = confirmTurn(current);
          set({ ...confirmed, selectedPoint: null, validDestinations: [] });
        }
      }, 0);
    }
  },

  // ── Confirm turn ─────────────────────────────────────────────────────────────
  handleConfirmTurn: () => {
    const state = get();
    const next = confirmTurn(state);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  // ── Undo last move within current turn ───────────────────────────────────────
  handleUndoMove: () => {
    const state = get();
    const next = undoLastMove(state);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  // ── Undo entire last confirmed turn ──────────────────────────────────────────
  handleUndoTurn: () => {
    const state = get();
    const next = undoTurn(state);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  // ── Skip turn (no legal moves) ────────────────────────────────────────────────
  handleSkipTurn: () => {
    const state = get();
    const next = skipTurn(state);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  // ── AI turn actions ──────────────────────────────────────────────────────────
  handleAiRollDice: () => {
    const state = get();
    const next = rollAiDice(state);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  handleAiSelectMove: (move) => {
    const state = get();
    if (state.phase !== 'moving') {
      return;
    }
    const next = selectMove(state, move);
    set({ ...next, selectedPoint: null, validDestinations: [] });
  },

  // ── Pause / Resume ───────────────────────────────────────────────────────────
  handlePause: () => {
    const state = get();
    const next = pauseGame(state);
    set(next);
  },

  handleResume: () => {
    const state = get();
    const next = resumeGame(state);
    set(next);
  },

  // ── Dismiss no-moves message ─────────────────────────────────────────────────
  handleDismissNoMoves: () => {
    const state = get();
    const next = dismissNoMovesMessage(state);
    set(next);
  },

  // ── Timer ─────────────────────────────────────────────────────────────────────
  incrementTimer: (ms: number) => {
    const { timerElapsed } = get();
    set({ timerElapsed: timerElapsed + ms });
  },

  // ── Load persisted game state ─────────────────────────────────────────────────
  loadState: (state: GameState) => {
    set({
      ...state,
      diceHistory: (state as GameState & { diceHistory?: (DiceRoll | null)[] }).diceHistory ?? [],
      selectedPoint: null,
      validDestinations: [],
    });
  },
}));

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Reconstruct the current working board by starting from the committed board state
 * and re-applying all pending moves (which haven't been confirmed yet).
 */
function buildCurrentBoard(state: GameStoreState): ReturnType<typeof Board.fromState> {
  let board = Board.fromState(state.board);
  for (const move of state.pendingMoves) {
    board = board.applyMove(move, state.currentPlayer);
  }
  return board;
}

/**
 * Find the die value to use for a move from `from` to `to`.
 * Tries each unique remaining die and picks the smallest one that produces the
 * correct destination (to minimise die waste).
 */
function findDieForMove(
  state: GameStoreState,
  from: MoveFrom,
  to: MoveTo,
): DiceValue | null {
  const { legalMovesForTurn } = state;

  // Search the pre-computed legal move list for a sequence that starts with this from→to
  for (const sequence of legalMovesForTurn) {
    const match = sequence.find((m) => m.from === from && m.to === to);
    if (match) {
      return match.dieUsed;
    }
  }

  return null;
}

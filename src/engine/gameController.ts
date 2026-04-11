import { Board } from '@/engine/board';
import { getMovesFromRoll, rollDice, rollSingle } from '@/engine/dice';
import { generateLegalMoves } from '@/engine/moveValidator';
import type { BoardState, Difficulty, DiceRoll, DiceValue, GameMode, GamePhase, Move, Player, TurnMoves } from '@/engine/types';

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  phase: GamePhase;
  dice: DiceRoll | null;
  remainingDice: DiceValue[];
  pendingMoves: Move[];        // Moves made this turn, not yet confirmed
  moveHistory: TurnMoves[];    // Confirmed turns (for undo)
  boardHistory: BoardState[];  // Board snapshots for undo (one per confirmed turn)
  openingRolls: { white: DiceValue | null; black: DiceValue | null };
  winner: Player | null;
  gameMode: GameMode;
  difficulty: Difficulty;
  legalMovesForTurn: TurnMoves[];
  noMovesMessage: boolean;
  timerElapsed: number;        // Total time elapsed in ms (active play only)
}

interface GameControllerOptions {
  gameMode: GameMode;
  difficulty: Difficulty;
}

/**
 * Pure game controller — all state transitions are deterministic given the same inputs.
 * The store layer holds the GameState and calls these functions to produce new states.
 * This makes the entire game logic testable without React.
 */

export function createInitialState(opts: GameControllerOptions): GameState {
  return {
    board: Board.initial().getState(),
    currentPlayer: 'white',
    phase: 'opening-roll',
    dice: null,
    remainingDice: [],
    pendingMoves: [],
    moveHistory: [],
    boardHistory: [],
    openingRolls: { white: null, black: null },
    winner: null,
    gameMode: opts.gameMode,
    difficulty: opts.difficulty,
    legalMovesForTurn: [],
    noMovesMessage: false,
    timerElapsed: 0,
  };
}

/**
 * Roll one die for the opening roll for a given player.
 * Returns the updated state. If both players have rolled and there's a winner,
 * transitions to 'rolling' for the winning player.
 */
export function rollOpeningDie(state: GameState, player: Player, forcedValue?: DiceValue): GameState {
  const value = forcedValue ?? rollSingle();
  const nextRolls = { ...state.openingRolls, [player]: value };

  // Both players have rolled
  if (nextRolls.white !== null && nextRolls.black !== null) {
    if (nextRolls.white === nextRolls.black) {
      // Tie — reset both rolls
      return { ...state, openingRolls: { white: null, black: null } };
    }

    // Determine who goes first
    const firstPlayer: Player = nextRolls.white > nextRolls.black ? 'white' : 'black';
    const openingDice: DiceRoll = [nextRolls.white, nextRolls.black];

    // First player uses both opening dice as their roll
    const board = Board.fromState(state.board);
    const remainingDice = getMovesFromRoll(openingDice);
    const legalMovesForTurn = generateLegalMoves(board, firstPlayer, remainingDice);

    return {
      ...state,
      openingRolls: nextRolls,
      currentPlayer: firstPlayer,
      phase: 'moving',
      dice: openingDice,
      remainingDice,
      legalMovesForTurn,
      noMovesMessage: legalMovesForTurn.length === 0,
    };
  }

  return { ...state, openingRolls: nextRolls };
}

/**
 * Roll dice for the current player's turn.
 * Transitions phase to 'moving' and computes legal moves.
 */
export function rollTurnDice(state: GameState, forcedRoll?: DiceRoll): GameState {
  if (state.phase !== 'rolling') {
    return state;
  }

  const roll = forcedRoll ?? rollDice();
  const board = Board.fromState(state.board);
  const remainingDice = getMovesFromRoll(roll);
  const legalMovesForTurn = generateLegalMoves(board, state.currentPlayer, remainingDice);

  return {
    ...state,
    dice: roll,
    remainingDice,
    phase: 'moving',
    pendingMoves: [],
    legalMovesForTurn,
    noMovesMessage: legalMovesForTurn.length === 0,
  };
}

/**
 * Select and apply a single move within the current turn (before confirm).
 * Validates that the move is in the current legal moves set.
 */
export function selectMove(state: GameState, move: Move): GameState {
  if (state.phase !== 'moving') {
    return state;
  }

  // Check the move is valid given remaining dice
  const newRemainingDice = consumeDie(state.remainingDice, move.dieUsed);
  if (newRemainingDice === null) {
    return state; // Die not available
  }

  const board = Board.fromState(state.board);
  // Apply all pending moves first to get current board state
  let currentBoard = board;
  for (const pending of state.pendingMoves) {
    currentBoard = currentBoard.applyMove(pending, state.currentPlayer);
  }

  // Apply this move
  const nextBoard = currentBoard.applyMove(move, state.currentPlayer);
  const nextRemaining = newRemainingDice;
  const nextPending = [...state.pendingMoves, move];

  // Recompute legal moves for remaining dice
  const legalMovesForTurn =
    nextRemaining.length > 0 ? generateLegalMoves(nextBoard, state.currentPlayer, nextRemaining) : [];

  return {
    ...state,
    remainingDice: nextRemaining,
    pendingMoves: nextPending,
    legalMovesForTurn,
  };
}

/**
 * Undo the last individual move within the current turn (before confirm).
 */
export function undoLastMove(state: GameState): GameState {
  if (state.phase !== 'moving' || state.pendingMoves.length === 0) {
    return state;
  }

  const lastMove = state.pendingMoves[state.pendingMoves.length - 1];
  if (!lastMove) {
    return state;
  }

  const restoredDice = [...state.remainingDice, lastMove.dieUsed].sort((a, b) => b - a) as DiceValue[];
  const prevPending = state.pendingMoves.slice(0, -1);

  // Recompute legal moves from original board + remaining pending moves
  const board = Board.fromState(state.board);
  let currentBoard = board;
  for (const pending of prevPending) {
    currentBoard = currentBoard.applyMove(pending, state.currentPlayer);
  }

  const legalMovesForTurn = generateLegalMoves(currentBoard, state.currentPlayer, restoredDice);

  return {
    ...state,
    remainingDice: restoredDice,
    pendingMoves: prevPending,
    legalMovesForTurn,
  };
}

/**
 * Confirm the current turn: commit all pending moves to the board, switch player.
 */
export function confirmTurn(state: GameState): GameState {
  if (state.phase !== 'moving') {
    return state;
  }

  // Apply all pending moves to get the final board
  let board = Board.fromState(state.board);
  for (const move of state.pendingMoves) {
    board = board.applyMove(move, state.currentPlayer);
  }

  const nextBoardState = board.getState();

  // Check win condition
  if (board.isComplete(state.currentPlayer)) {
    return {
      ...state,
      board: nextBoardState,
      boardHistory: [...state.boardHistory, state.board],
      moveHistory: [...state.moveHistory, state.pendingMoves],
      phase: 'game-over',
      winner: state.currentPlayer,
      pendingMoves: [],
      remainingDice: [],
    };
  }

  const nextPlayer: Player = state.currentPlayer === 'white' ? 'black' : 'white';
  const nextPhase: GamePhase =
    state.gameMode === 'pva' && nextPlayer === 'black' ? 'ai-thinking' : 'rolling';

  return {
    ...state,
    board: nextBoardState,
    boardHistory: [...state.boardHistory, state.board],
    moveHistory: [...state.moveHistory, state.pendingMoves],
    currentPlayer: nextPlayer,
    phase: nextPhase,
    dice: null,
    remainingDice: [],
    pendingMoves: [],
    legalMovesForTurn: [],
    noMovesMessage: false,
  };
}

/**
 * Auto-skip a turn when no legal moves are available.
 * Called after a roll results in 0 legal moves.
 */
export function skipTurn(state: GameState): GameState {
  const nextPlayer: Player = state.currentPlayer === 'white' ? 'black' : 'white';
  const nextPhase: GamePhase =
    state.gameMode === 'pva' && nextPlayer === 'black' ? 'ai-thinking' : 'rolling';

  return {
    ...state,
    boardHistory: [...state.boardHistory, state.board],
    moveHistory: [...state.moveHistory, []],
    currentPlayer: nextPlayer,
    phase: nextPhase,
    dice: null,
    remainingDice: [],
    pendingMoves: [],
    legalMovesForTurn: [],
    noMovesMessage: false,
  };
}

/**
 * Undo the last confirmed turn (restores to board state before that turn).
 * Only available during 'rolling' phase (before the current player has rolled).
 */
export function undoTurn(state: GameState): GameState {
  if (state.boardHistory.length === 0) {
    return state;
  }

  const prevBoard = state.boardHistory[state.boardHistory.length - 1];
  if (!prevBoard) {
    return state;
  }

  const prevHistory = state.boardHistory.slice(0, -1);
  const prevMoveHistory = state.moveHistory.slice(0, -1);
  const prevPlayer: Player = state.currentPlayer === 'white' ? 'black' : 'white';

  return {
    ...state,
    board: prevBoard,
    boardHistory: prevHistory,
    moveHistory: prevMoveHistory,
    currentPlayer: prevPlayer,
    phase: 'rolling',
    dice: null,
    remainingDice: [],
    pendingMoves: [],
    legalMovesForTurn: [],
    noMovesMessage: false,
  };
}

/**
 * Pause the game, saving the current phase.
 */
export function pauseGame(state: GameState): GameState {
  if (state.phase === 'game-over' || state.phase === 'not-started' || state.phase === 'paused') {
    return state;
  }
  return { ...state, phase: 'paused' };
}

/**
 * Resume a paused game, returning to the rolling phase for the current player.
 */
export function resumeGame(state: GameState): GameState {
  if (state.phase !== 'paused') {
    return state;
  }

  let nextPhase: GamePhase;
  if (state.pendingMoves.length > 0) {
    nextPhase = 'moving';
  } else if (state.gameMode === 'pva' && state.currentPlayer === 'black') {
    nextPhase = 'ai-thinking';
  } else {
    nextPhase = 'rolling';
  }

  return { ...state, phase: nextPhase };
}

/**
 * Dismiss the no-moves message (after auto-skip animation/display).
 */
export function dismissNoMovesMessage(state: GameState): GameState {
  return { ...state, noMovesMessage: false };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Remove one occurrence of `die` from `dice` and return the new array.
 * Returns null if the die is not available.
 */
function consumeDie(dice: DiceValue[], die: DiceValue): DiceValue[] | null {
  const idx = dice.indexOf(die);
  if (idx === -1) {
    return null;
  }
  const next = [...dice];
  next.splice(idx, 1);
  return next;
}

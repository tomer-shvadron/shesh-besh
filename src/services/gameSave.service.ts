import type { GameState } from '@/engine/gameController';
import { db } from '@/services/database.service';

const ACTIVE_GAME_ID = 'current';

export async function saveGame(state: GameState): Promise<void> {
  await db.activeGame.put({
    id: ACTIVE_GAME_ID,
    boardState: state.board,
    dice: state.dice,
    currentPlayer: state.currentPlayer,
    moveHistory: state.moveHistory,
    timerElapsed: state.timerElapsed,
    difficulty: state.difficulty,
    gameMode: state.gameMode,
    savedAt: new Date(),
  });
}

export async function loadGame(): Promise<GameState | null> {
  const record = await db.activeGame.get(ACTIVE_GAME_ID);
  if (!record) {
    return null;
  }

  // Reconstruct a minimal GameState from the persisted record.
  // Fields not stored (pendingMoves, dice in-flight, etc.) are reset to safe defaults.
  const restored: GameState = {
    board: record.boardState,
    currentPlayer: record.currentPlayer,
    // Always resume to 'rolling' so the player must re-roll after a reload
    phase: 'rolling',
    dice: null,
    remainingDice: [],
    pendingMoves: [],
    moveHistory: record.moveHistory,
    boardHistory: [],
    openingRolls: { white: null, black: null },
    winner: null,
    gameMode: record.gameMode,
    difficulty: record.difficulty,
    legalMovesForTurn: [],
    noMovesMessage: false,
    timerElapsed: record.timerElapsed,
  };

  return restored;
}

export async function clearGame(): Promise<void> {
  await db.activeGame.delete(ACTIVE_GAME_ID);
}

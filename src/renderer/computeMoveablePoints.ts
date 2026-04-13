import { Board } from '@/engine/board';
import { getValidDestinations } from '@/engine/moveValidator';
import type { BoardState, DiceValue, Move, Player } from '@/engine/types';

/**
 * Compute the set of points (and possibly the bar) from which the current
 * player has at least one legal move given the remaining dice. Used by the
 * board renderer to decide whether to show hover cursors / glows on a source
 * checker — pieces that technically belong to the player but cannot be moved
 * this turn should not look interactive.
 *
 * The computation operates on the DISPLAY board (committed board + any pending
 * moves) so that checkers already moved as part of an unfinished turn are
 * evaluated from their current visible position, not their pre-turn one.
 */
export function computeMoveablePoints(
  board: BoardState,
  pendingMoves: Move[],
  currentPlayer: Player,
  remainingDice: DiceValue[],
): Set<number | 'bar'> {
  const moveable = new Set<number | 'bar'>();

  if (remainingDice.length === 0) {
    return moveable;
  }

  // Apply pending moves to get the actual visible board state
  let displayBoardState = board;
  if (pendingMoves.length > 0) {
    let b = Board.fromState(board);
    for (const move of pendingMoves) {
      b = b.applyMove(move, currentPlayer);
    }
    displayBoardState = b.getState();
  }

  const boardInstance = Board.fromState(displayBoardState);

  // Checkers on the bar must re-enter first; nothing else is moveable while any
  // sit on the bar. Bail out after checking the bar in that case.
  if (displayBoardState.bar[currentPlayer] > 0) {
    const dests = getValidDestinations(boardInstance, currentPlayer, 'bar', remainingDice);
    if (dests.length > 0) {
      moveable.add('bar');
    }
    return moveable;
  }

  for (let i = 0; i < 24; i++) {
    const pt = displayBoardState.points[i];
    if (pt?.player === currentPlayer && (pt?.count ?? 0) > 0) {
      const dests = getValidDestinations(boardInstance, currentPlayer, i, remainingDice);
      if (dests.length > 0) {
        moveable.add(i);
      }
    }
  }

  return moveable;
}

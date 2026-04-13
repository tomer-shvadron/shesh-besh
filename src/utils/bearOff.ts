import { CHECKERS_PER_PLAYER } from '@/engine/constants';

/**
 * Fraction of a player's checkers that have been borne off, in the range
 * [0, 1]. Used by the bear-off progress bar in the renderer and by any
 * other UI that wants to show completion progress.
 */
export function bearOffFillRatio(count: number): number {
  if (count <= 0) {
    return 0;
  }
  if (count >= CHECKERS_PER_PLAYER) {
    return 1;
  }
  return count / CHECKERS_PER_PLAYER;
}

/**
 * Checkers still on the board (not yet borne off) for the player.
 * Handy for end-of-game margin-of-victory summaries.
 */
export function checkersRemaining(borneOff: number): number {
  return Math.max(0, CHECKERS_PER_PLAYER - borneOff);
}

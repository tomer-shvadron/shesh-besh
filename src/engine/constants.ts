import type { BoardState, Player } from '@/engine/types';

/**
 * Point index conventions:
 * - Points are numbered 0-23 (0 = white's bearing-off edge, 23 = black's bearing-off edge)
 * - White moves from high → low (23 → 0), bears off at index < 0
 * - Black moves from low → high (0 → 23), bears off at index > 23
 *
 * Standard backgammon starting layout (from white's perspective):
 * White checkers:  2 on pt 23, 5 on pt 12, 3 on pt 7, 5 on pt 5
 * Black checkers:  2 on pt 0,  5 on pt 11, 3 on pt 16, 5 on pt 18
 */

/** White home board: points 0-5 (bearing off below 0) */
export const WHITE_HOME_START = 0;
export const WHITE_HOME_END = 5;
/** Black home board: points 18-23 (bearing off above 23) */
export const BLACK_HOME_START = 18;
export const BLACK_HOME_END = 23;

/** Number of checkers each player has */
export const CHECKERS_PER_PLAYER = 15;

/** Total number of board points */
export const TOTAL_POINTS = 24;

/** Direction multiplier per player: white moves -1 (toward 0), black moves +1 (toward 23) */
export const DIRECTION: Record<Player, -1 | 1> = {
  white: -1,
  black: 1,
};

/** Home board range per player [start, end] inclusive */
export const HOME_RANGE: Record<Player, [number, number]> = {
  white: [WHITE_HOME_START, WHITE_HOME_END],
  black: [BLACK_HOME_START, BLACK_HOME_END],
};

/** Initial board state — standard backgammon starting position */
export const INITIAL_BOARD_STATE: BoardState = {
  points: [
    { player: 'black', count: 2 },  // 0  — black's 2-checker anchor
    { player: null, count: 0 },      // 1
    { player: null, count: 0 },      // 2
    { player: null, count: 0 },      // 3
    { player: null, count: 0 },      // 4
    { player: 'white', count: 5 },   // 5  — white home, 5 checkers
    { player: null, count: 0 },      // 6
    { player: 'white', count: 3 },   // 7  — white, 3 checkers
    { player: null, count: 0 },      // 8
    { player: null, count: 0 },      // 9
    { player: null, count: 0 },      // 10
    { player: 'black', count: 5 },   // 11 — black mid, 5 checkers
    { player: 'white', count: 5 },   // 12 — white mid, 5 checkers
    { player: null, count: 0 },      // 13
    { player: null, count: 0 },      // 14
    { player: null, count: 0 },      // 15
    { player: 'black', count: 3 },   // 16 — black, 3 checkers
    { player: null, count: 0 },      // 17
    { player: 'black', count: 5 },   // 18 — black home, 5 checkers
    { player: null, count: 0 },      // 19
    { player: null, count: 0 },      // 20
    { player: null, count: 0 },      // 21
    { player: null, count: 0 },      // 22
    { player: 'white', count: 2 },   // 23 — white's 2-checker anchor
  ],
  bar: { white: 0, black: 0 },
  borneOff: { white: 0, black: 0 },
};

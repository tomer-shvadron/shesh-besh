import {
  CHECKERS_PER_PLAYER,
  DIRECTION,
  HOME_RANGE,
  INITIAL_BOARD_STATE,
  TOTAL_POINTS,
} from '@/engine/constants';
import type { BoardState, Move, Player, PointState } from '@/engine/types';

/**
 * Immutable board state class.
 * All mutation methods return a new Board instance — the original is never modified.
 * This enables undo (keep a history stack) and safe AI tree exploration.
 */
export class Board {
  private readonly state: BoardState;

  private constructor(state: BoardState) {
    this.state = state;
  }

  /** Create a Board from an existing BoardState snapshot (e.g., from saved game). */
  static fromState(state: BoardState): Board {
    return new Board(deepCloneState(state));
  }

  /** Create a Board in the standard backgammon starting position. */
  static initial(): Board {
    return new Board(deepCloneState(INITIAL_BOARD_STATE));
  }

  // ─── Read-only accessors ────────────────────────────────────────────────────

  getState(): BoardState {
    return deepCloneState(this.state);
  }

  getPoint(index: number): PointState {
    const pt = this.state.points[index];
    if (!pt) {
      throw new Error(`Point index ${index} out of range`);
    }
    return { ...pt };
  }

  getBar(player: Player): number {
    return this.state.bar[player];
  }

  getBorneOff(player: Player): number {
    return this.state.borneOff[player];
  }

  /**
   * Returns true when ALL 15 of this player's checkers are in their home board
   * (or already borne off), making bearing off legal.
   */
  canBearOff(player: Player): boolean {
    const [homeStart, homeEnd] = HOME_RANGE[player];
    let checkersOutsideHome = this.state.bar[player];

    for (let i = 0; i < TOTAL_POINTS; i++) {
      const pt = this.state.points[i];
      if (!pt || pt.player !== player) {
        continue;
      }
      const inHome = i >= homeStart && i <= homeEnd;
      if (!inHome) {
        checkersOutsideHome += pt.count;
      }
    }

    return checkersOutsideHome === 0;
  }

  /** Returns true when this player has borne off all 15 checkers (game won). */
  isComplete(player: Player): boolean {
    return this.state.borneOff[player] === CHECKERS_PER_PLAYER;
  }

  /**
   * Returns the pip count for a player — the total distance all their checkers
   * still need to travel to bear off. Used by AI evaluation.
   */
  getPipCount(player: Player): number {
    let pips = 0;
    const direction = DIRECTION[player];

    if (player === 'white') {
      // White bears off below point 0 — pip count = sum of (index + 1) for each checker
      for (let i = 0; i < TOTAL_POINTS; i++) {
        const pt = this.state.points[i];
        if (pt?.player === 'white') {
          pips += (i + 1) * pt.count;
        }
      }
      pips += this.state.bar.white * (TOTAL_POINTS + 1);
    } else {
      // Black bears off above point 23 — pip count = sum of (24 - index) for each checker
      void direction; // direction unused here but kept for clarity
      for (let i = 0; i < TOTAL_POINTS; i++) {
        const pt = this.state.points[i];
        if (pt?.player === 'black') {
          pips += (TOTAL_POINTS - i) * pt.count;
        }
      }
      pips += this.state.bar.black * (TOTAL_POINTS + 1);
    }

    return pips;
  }

  // ─── Mutation (returns new Board) ──────────────────────────────────────────

  /**
   * Apply a single move and return the resulting board.
   * Throws if the move is structurally invalid (wrong from/to types).
   * Does NOT validate game legality — use MoveValidator for that.
   */
  applyMove(move: Move, player: Player): Board {
    const next = deepCloneState(this.state);
    const opponent: Player = player === 'white' ? 'black' : 'white';

    // ── Remove checker from source ──────────────────────────────────────────
    if (move.from === 'bar') {
      if (next.bar[player] <= 0) {
        throw new Error(`Player ${player} has no checkers on the bar`);
      }
      next.bar[player]--;
    } else {
      const fromPt = next.points[move.from];
      if (!fromPt || fromPt.player !== player || fromPt.count <= 0) {
        throw new Error(`No ${player} checker at point ${move.from}`);
      }
      fromPt.count--;
      if (fromPt.count === 0) {
        fromPt.player = null;
      }
    }

    // ── Place checker at destination ────────────────────────────────────────
    if (move.to === 'off') {
      next.borneOff[player]++;
    } else {
      const toPt = next.points[move.to];
      if (!toPt) {
        throw new Error(`Point index ${move.to} out of range`);
      }

      if (toPt.player === opponent && toPt.count === 1) {
        // Hit — send opponent's blot to the bar
        toPt.player = player;
        toPt.count = 1;
        next.bar[opponent]++;
      } else {
        // Normal placement (empty point or friendly point)
        toPt.player = player;
        toPt.count = (toPt.count || 0) + 1;
      }
    }

    return new Board(next);
  }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function deepCloneState(state: BoardState): BoardState {
  return {
    points: state.points.map((pt) => ({ ...pt })),
    bar: { ...state.bar },
    borneOff: { ...state.borneOff },
  };
}

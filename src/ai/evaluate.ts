import type { EvalWeights } from '@/ai/types';
import type { Board } from '@/engine/board';
import {
  BLACK_HOME_END,
  BLACK_HOME_START,
  CHECKERS_PER_PLAYER,
  TOTAL_POINTS,
  WHITE_HOME_END,
  WHITE_HOME_START,
} from '@/engine/constants';
import type { Player } from '@/engine/types';

/**
 * Evaluate the board from `player`'s perspective.
 * Returns a score in [-1.0, +1.0] where +1.0 = certain win, -1.0 = certain loss.
 */
export function evaluateBoard(board: Board, player: Player, weights: EvalWeights): number {
  const opponent: Player = player === 'white' ? 'black' : 'white';

  // ── Heuristic 8: race detection ───────────────────────────────────────────
  // If no contact exists (no checker can be hit), use pure pip count only.
  if (isRacePosition(board)) {
    return computePipScore(board, player);
  }

  // ── Heuristic 1: pip count ─────────────────────────────────────────────────
  const myPips = board.getPipCount(player);
  const opponentPips = board.getPipCount(opponent);
  const totalPips = myPips + opponentPips;
  const pipScore = totalPips > 0 ? ((opponentPips - myPips) / totalPips) * weights.pipCount : 0;

  // ── Heuristic 2: blot exposure ─────────────────────────────────────────────
  let myBlots = 0;
  for (let i = 0; i < TOTAL_POINTS; i++) {
    const pt = board.getPoint(i);
    if (pt.player === player && pt.count === 1) {
      myBlots++;
    }
  }
  const blotScore = Math.max(-0.5, -myBlots * 0.05 * weights.blotExposure);

  // ── Heuristic 3: home board strength ──────────────────────────────────────
  const [homeStart, homeEnd] = getHomeRange(player);
  let madeHomePoints = 0;
  for (let i = homeStart; i <= homeEnd; i++) {
    const pt = board.getPoint(i);
    if (pt.player === player && pt.count >= 2) {
      madeHomePoints++;
    }
  }
  const homeScore = (madeHomePoints / 6) * 0.5 * weights.homeBoardStrength;

  // ── Heuristic 4: blocking primes ──────────────────────────────────────────
  const longestPrime = computeLongestPrime(board, player);
  const primeScore = scorePrime(longestPrime) * weights.blockingPrimes;

  // ── Heuristic 5: bar checkers ─────────────────────────────────────────────
  const opponentOnBar = board.getBar(opponent);
  const myOnBar = board.getBar(player);
  const barScore = (opponentOnBar * 0.15 - myOnBar * 0.15) * weights.barCheckers;

  // ── Heuristic 6: bearing off progress ─────────────────────────────────────
  const myBorneOff = board.getBorneOff(player);
  const bearOffScore = (myBorneOff / CHECKERS_PER_PLAYER) * weights.bearingOff;

  // ── Heuristic 7: anchor position ──────────────────────────────────────────
  const [oppHomeStart, oppHomeEnd] = getHomeRange(opponent);
  let myAnchors = 0;
  for (let i = oppHomeStart; i <= oppHomeEnd; i++) {
    const pt = board.getPoint(i);
    if (pt.player === player && pt.count >= 2) {
      myAnchors++;
    }
  }
  const anchorScore = (myAnchors / 3) * 0.2 * weights.anchorPosition;

  // ── Sum all components ────────────────────────────────────────────────────
  const raw = pipScore + blotScore + homeScore + primeScore + barScore + bearOffScore + anchorScore;

  // Clamp to [-1.0, 1.0]
  return Math.max(-1.0, Math.min(1.0, raw));
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function computePipScore(board: Board, player: Player): number {
  const opponent: Player = player === 'white' ? 'black' : 'white';
  const myPips = board.getPipCount(player);
  const opponentPips = board.getPipCount(opponent);
  const total = myPips + opponentPips;
  if (total === 0) {
    return 0;
  }
  return (opponentPips - myPips) / total;
}

/**
 * Returns true if the game is in a pure race — no checker belonging to one
 * player is positioned such that it could encounter an opponent's checker.
 * Simplified check: no white checker has a higher index than any black checker.
 */
function isRacePosition(board: Board): boolean {
  // Find the rearmost (highest index) white checker and
  // the rearmost (lowest index) black checker.
  // If all white checkers are at lower indices than all black checkers, it's a race.
  let maxWhiteIndex = -1;
  let minBlackIndex = TOTAL_POINTS;

  for (let i = 0; i < TOTAL_POINTS; i++) {
    const pt = board.getPoint(i);
    if (pt.player === 'white' && pt.count > 0) {
      if (i > maxWhiteIndex) {
        maxWhiteIndex = i;
      }
    }
    if (pt.player === 'black' && pt.count > 0) {
      if (i < minBlackIndex) {
        minBlackIndex = i;
      }
    }
  }

  // Also account for bar checkers — if anyone is on the bar it's not a pure race
  if (board.getBar('white') > 0 || board.getBar('black') > 0) {
    return false;
  }

  // Race: all white checkers are at strictly lower indices than all black checkers
  return maxWhiteIndex < minBlackIndex;
}

/**
 * Find the longest consecutive run of "made points" (2+ checkers) for the player
 * anywhere on the board.
 */
function computeLongestPrime(board: Board, player: Player): number {
  let longest = 0;
  let current = 0;

  for (let i = 0; i < TOTAL_POINTS; i++) {
    const pt = board.getPoint(i);
    if (pt.player === player && pt.count >= 2) {
      current++;
      if (current > longest) {
        longest = current;
      }
    } else {
      current = 0;
    }
  }

  return longest;
}

function scorePrime(length: number): number {
  if (length >= 6) {
    return 1.0;
  }
  if (length === 5) {
    return 0.7;
  }
  if (length === 4) {
    return 0.4;
  }
  if (length === 3) {
    return 0.2;
  }
  if (length === 2) {
    return 0.1;
  }
  return 0;
}

function getHomeRange(player: Player): [number, number] {
  if (player === 'white') {
    return [WHITE_HOME_START, WHITE_HOME_END];
  }
  return [BLACK_HOME_START, BLACK_HOME_END];
}

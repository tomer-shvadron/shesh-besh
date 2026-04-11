import type { Board } from '@/engine/board';
import { BLACK_HOME_START, DIRECTION, TOTAL_POINTS } from '@/engine/constants';
import type { DiceValue, Move, MoveFrom, MoveTo, Player, TurnMoves } from '@/engine/types';

/**
 * Generate all possible complete move sequences for a player on a given turn.
 *
 * Returns an array of TurnMoves — each TurnMoves is one valid sequence of moves
 * that maximises dice usage (both dice used if possible; if only one can be used,
 * the higher die must be used).
 *
 * Returns an empty array if there are no legal moves at all.
 */
export function generateLegalMoves(board: Board, player: Player, remainingDice: DiceValue[]): TurnMoves[] {
  // Recursively build all move sequences
  const allSequences = buildSequences(board, player, remainingDice, []);

  if (allSequences.length === 0) {
    return [];
  }

  // Apply the must-use rule: maximise the number of dice used.
  // Among sequences that use the most dice, if we're choosing between using
  // a higher or lower single die, the higher die must be used.
  const filtered = filterByMaxDiceUsage(allSequences, remainingDice);

  // If every sequence is empty (no dice could be used), there are no legal moves.
  if (filtered.every((s) => s.length === 0)) {
    return [];
  }

  return filtered;
}

/**
 * Get valid destination points for a single checker at `from` given remaining dice.
 * Used by the UI to highlight legal moves for the selected checker.
 */
export function getValidDestinations(
  board: Board,
  player: Player,
  from: MoveFrom,
  remainingDice: DiceValue[],
): MoveTo[] {
  const destinations = new Set<MoveTo>();

  for (const die of new Set(remainingDice)) {
    const to = computeDestination(board, player, from, die);
    if (to !== null && isDestinationLegal(board, player, to)) {
      destinations.add(to);
    }
  }

  return Array.from(destinations);
}

/**
 * Validate a single move in isolation (without dice context).
 * Used for quick legality checks.
 */
export function isMoveLegal(board: Board, player: Player, move: Move): boolean {
  // If player has checkers on bar, must move from bar first
  if (board.getBar(player) > 0 && move.from !== 'bar') {
    return false;
  }

  const to = computeDestination(board, player, move.from, move.dieUsed);
  if (to !== move.to) {
    return false;
  }

  return isDestinationLegal(board, player, move.to);
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Recursively build all possible move sequences, applying moves to a running board state.
 */
function buildSequences(
  board: Board,
  player: Player,
  remainingDice: DiceValue[],
  currentSequence: TurnMoves,
): TurnMoves[] {
  if (remainingDice.length === 0) {
    return [currentSequence];
  }

  const results: TurnMoves[] = [];
  const triedDice = new Set<DiceValue>();

  for (let dieIdx = 0; dieIdx < remainingDice.length; dieIdx++) {
    const die = remainingDice[dieIdx];
    if (!die) {
      continue;
    }
    // Skip duplicate die values to avoid generating identical sequences
    if (triedDice.has(die)) {
      continue;
    }
    triedDice.add(die);

    const nextDice = remainingDice.filter((_, i) => i !== dieIdx);
    const legalMoves = getLegalMovesForDie(board, player, die);

    if (legalMoves.length === 0) {
      // Can't use this die — try without it (keeping remaining dice)
      results.push(currentSequence);
      continue;
    }

    for (const move of legalMoves) {
      const nextBoard = board.applyMove(move, player);
      const subSequences = buildSequences(nextBoard, player, nextDice, [...currentSequence, move]);
      results.push(...subSequences);
    }
  }

  // Deduplicate sequences (same moves in same order)
  return deduplicateSequences(results);
}

/**
 * Get all legal individual moves for a specific die value.
 */
function getLegalMovesForDie(board: Board, player: Player, die: DiceValue): Move[] {
  const moves: Move[] = [];

  // If player has checkers on bar, they can ONLY enter from bar
  if (board.getBar(player) > 0) {
    const entryPoint = getBarEntryPoint(player, die);
    if (entryPoint !== null && isDestinationLegal(board, player, entryPoint)) {
      moves.push({ from: 'bar', to: entryPoint, dieUsed: die });
    }
    return moves;
  }

  // Normal moves: iterate over all points with player's checkers
  for (let i = 0; i < TOTAL_POINTS; i++) {
    const pt = board.getPoint(i);
    if (pt.player !== player) {
      continue;
    }

    const to = computeDestination(board, player, i, die);
    if (to !== null && isDestinationLegal(board, player, to)) {
      moves.push({ from: i, to, dieUsed: die });
    }
  }

  return moves;
}

/**
 * Compute the destination for a move from `from` using `die`.
 * Returns null if the destination is out of bounds (and bearing off is not possible/legal).
 */
function computeDestination(board: Board, player: Player, from: MoveFrom, die: DiceValue): MoveTo | null {
  const direction = DIRECTION[player];

  if (from === 'bar') {
    const entryPoint = getBarEntryPoint(player, die);
    return entryPoint;
  }

  const targetIndex = from + direction * die;

  // Past the bearing-off edge
  if (player === 'white' && targetIndex < 0) {
    if (!board.canBearOff(player)) {
      return null;
    }
    // Bear off exact: checker is exactly at distance `die` from the edge
    const exactPoint = die - 1; // die=1 → point 0, die=2 → point 1, etc.
    if (from === exactPoint) {
      return 'off';
    }
    // Higher die: from < exactPoint means checker is closer to edge than die reaches.
    // Can only bear off if there is no checker at a higher index (further from edge).
    if (from < exactPoint && !hasCheckerAtOrAbove(board, player, from + 1, 5)) {
      return 'off';
    }
    return null;
  }

  if (player === 'black' && targetIndex > TOTAL_POINTS - 1) {
    if (!board.canBearOff(player)) {
      return null;
    }
    // Bear off exact: checker at distance `die` from the bearing-off edge
    const exactPoint = TOTAL_POINTS - die; // die=1 → point 23, die=2 → point 22, etc.
    if (from === exactPoint) {
      return 'off';
    }
    // Higher die: from > exactPoint means checker is closer to edge than die reaches.
    // Can only bear off if there is no checker at a lower index (further from edge).
    if (from > exactPoint && !hasCheckerAtOrAbove(board, player, BLACK_HOME_START, from - 1)) {
      return 'off';
    }
    return null;
  }

  if (targetIndex < 0 || targetIndex >= TOTAL_POINTS) {
    return null;
  }

  return targetIndex;
}

/**
 * Check whether a destination point is legally playable for a player.
 */
function isDestinationLegal(board: Board, player: Player, to: MoveTo): boolean {
  if (to === 'off') {
    return true; // Already validated by computeDestination
  }

  const pt = board.getPoint(to);
  const opponent: Player = player === 'white' ? 'black' : 'white';

  // Can land if: empty, friendly, or opponent blot (exactly 1 opponent checker)
  return pt.player !== opponent || pt.count <= 1;
}

/**
 * Get the board entry point for a bar re-entry move.
 * White enters in black's home board (points 18-23), die value maps directly.
 * White: die 1 → point 23, die 2 → point 22, ... die 6 → point 18
 * Black: die 1 → point 0,  die 2 → point 1,  ... die 6 → point 5
 */
function getBarEntryPoint(player: Player, die: DiceValue): number | null {
  if (player === 'white') {
    const point = TOTAL_POINTS - die; // die 1 → 23, die 6 → 18
    return point;
  } else {
    const point = die - 1; // die 1 → 0, die 6 → 5
    return point;
  }
}

/**
 * Check if a player has any checker on points in the range [low, high] inclusive.
 * Used for higher-die bear-off rule.
 */
function hasCheckerAtOrAbove(board: Board, player: Player, low: number, high: number): boolean {
  for (let i = low; i <= high; i++) {
    const pt = board.getPoint(i);
    if (pt.player === player && pt.count > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Filter sequences to enforce the must-use-both-dice rule:
 * 1. Among all sequences, keep only those that use the most dice.
 * 2. If two 1-die sequences differ only in which die they used, prefer the higher die.
 */
function filterByMaxDiceUsage(sequences: TurnMoves[], originalDice: DiceValue[]): TurnMoves[] {
  const maxUsed = Math.max(...sequences.map((s) => s.length));
  let filtered = sequences.filter((s) => s.length === maxUsed);

  // If we can only use 1 die (out of 2 different dice), must use the higher one
  if (maxUsed === 1 && originalDice.length === 2 && originalDice[0] !== originalDice[1]) {
    const d1 = originalDice[0];
    const d2 = originalDice[1];
    if (d1 === undefined || d2 === undefined) {
      return filtered;
    }
    const higherDie = Math.max(d1, d2) as DiceValue;
    const higherDieSequences = filtered.filter((s) => s[0]?.dieUsed === higherDie);
    if (higherDieSequences.length > 0) {
      filtered = higherDieSequences;
    }
  }

  return deduplicateSequences(filtered);
}

/**
 * Remove duplicate move sequences (same from/to/die in same order).
 */
function deduplicateSequences(sequences: TurnMoves[]): TurnMoves[] {
  const seen = new Set<string>();
  const result: TurnMoves[] = [];

  for (const seq of sequences) {
    const key = seq.map((m) => `${String(m.from)}-${String(m.to)}-${m.dieUsed}`).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(seq);
    }
  }

  return result;
}

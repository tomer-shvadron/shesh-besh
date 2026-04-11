import { evaluateBoard } from '@/ai/evaluate';
import { EASY_WEIGHTS, HARD_WEIGHTS, MEDIUM_WEIGHTS } from '@/ai/strategies';
import type { Board } from '@/engine/board';
import { generateLegalMoves } from '@/engine/moveValidator';
import type { Difficulty, DiceValue, Move, Player, TurnMoves } from '@/engine/types';

/**
 * All 21 unique dice combinations (d1 <= d2) with their probabilities.
 * Non-doubles appear twice on real dice, so their probability weight is 2/36.
 * Doubles appear once, so their probability weight is 1/36.
 */
interface DiceOutcome {
  d1: DiceValue;
  d2: DiceValue;
  weight: number;
}

const ALL_DICE_OUTCOMES: DiceOutcome[] = buildDiceOutcomes();

function buildDiceOutcomes(): DiceOutcome[] {
  const outcomes: DiceOutcome[] = [];
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = d1; d2 <= 6; d2++) {
      const weight = d1 === d2 ? 1 / 36 : 2 / 36;
      outcomes.push({ d1: d1 as DiceValue, d2: d2 as DiceValue, weight });
    }
  }
  return outcomes;
}

/**
 * Choose the best move sequence for the given player using the specified difficulty strategy.
 * Returns an empty array if there are no legal moves.
 */
export function chooseMove(
  board: Board,
  player: Player,
  dice: DiceValue[],
  difficulty: Difficulty,
): Move[] {
  const sequences = generateLegalMoves(board, player, dice);

  if (sequences.length === 0) {
    return [];
  }

  if (difficulty === 'easy') {
    return chooseMoveEasy(board, player, sequences);
  }

  if (difficulty === 'medium') {
    return chooseMoveMedium(board, player, sequences);
  }

  return chooseMoveHard(board, player, sequences);
}

// ─── Easy strategy ───────────────────────────────────────────────────────────

function chooseMoveEasy(board: Board, player: Player, sequences: TurnMoves[]): Move[] {
  const scored = scoreSequences(board, player, sequences, EASY_WEIGHTS);
  // Sort ascending so index 0 = worst
  scored.sort((a, b) => a.score - b.score);

  const roll = Math.random();

  if (roll < 0.30) {
    // 30%: pick randomly from the bottom 50% (mistake)
    const bottomHalf = scored.slice(0, Math.max(1, Math.floor(scored.length / 2)));
    const pick = bottomHalf[Math.floor(Math.random() * bottomHalf.length)];
    return pick?.moves ?? [];
  }

  // 70%: pick randomly from the top 50%
  const topStart = Math.floor(scored.length / 2);
  const topHalf = scored.slice(topStart);
  const pick = topHalf[Math.floor(Math.random() * topHalf.length)];
  return pick?.moves ?? [];
}

// ─── Medium strategy ─────────────────────────────────────────────────────────

function chooseMoveMedium(board: Board, player: Player, sequences: TurnMoves[]): Move[] {
  const scored = scoreSequences(board, player, sequences, MEDIUM_WEIGHTS);
  const best = scored.reduce((a, b) => (a.score >= b.score ? a : b));
  return best.moves;
}

/**
 * Maximum number of candidate sequences the Hard AI will evaluate in full.
 * This cap keeps the expectiminimax search within budget even for doubles
 * (which can produce hundreds of equivalent sequences).
 */
const HARD_CANDIDATE_LIMIT = 20;

// ─── Hard strategy (1-ply expectiminimax) ────────────────────────────────────

function chooseMoveHard(board: Board, player: Player, sequences: TurnMoves[]): Move[] {
  const opponent: Player = player === 'white' ? 'black' : 'white';

  // Pre-score all sequences with a cheap heuristic and keep the top candidates.
  // This prunes down to a manageable set before the expensive expectiminimax loop.
  const prescored = scoreSequences(board, player, sequences, HARD_WEIGHTS);
  prescored.sort((a, b) => b.score - a.score);
  const candidates = prescored.slice(0, HARD_CANDIDATE_LIMIT).map((s) => s.moves);

  let bestScore = -Infinity;
  let bestMoves: Move[] = candidates[0] ?? [];

  for (const seq of candidates) {
    // Apply all moves in this candidate sequence to get the resulting board
    let resultBoard = board;
    for (const move of seq) {
      resultBoard = resultBoard.applyMove(move, player);
    }

    // For each of the 21 unique opponent dice outcomes, compute the opponent's
    // best response (they maximize their own score = minimize my score).
    let expectedOpponentScore = 0;

    for (const outcome of ALL_DICE_OUTCOMES) {
      const opponentDice = expandDice(outcome.d1, outcome.d2);
      const allOpponentSequences = generateLegalMoves(resultBoard, opponent, opponentDice);
      // Cap opponent sequences evaluated to keep the inner loop fast
      const opponentSequences = allOpponentSequences.slice(0, HARD_CANDIDATE_LIMIT);

      let bestOpponentScore: number;

      if (opponentSequences.length === 0) {
        // Opponent can't move — evaluate the board as-is from opponent's perspective
        bestOpponentScore = evaluateBoard(resultBoard, opponent, HARD_WEIGHTS);
      } else {
        // Find the opponent's best-scoring response
        bestOpponentScore = -Infinity;
        for (const opponentSeq of opponentSequences) {
          let opponentBoard = resultBoard;
          for (const move of opponentSeq) {
            opponentBoard = opponentBoard.applyMove(move, opponent);
          }
          const score = evaluateBoard(opponentBoard, opponent, HARD_WEIGHTS);
          if (score > bestOpponentScore) {
            bestOpponentScore = score;
          }
        }
      }

      expectedOpponentScore += bestOpponentScore * outcome.weight;
    }

    // My expected score = negative of opponent's expected score
    const myExpectedScore = -expectedOpponentScore;

    if (myExpectedScore > bestScore) {
      bestScore = myExpectedScore;
      bestMoves = seq;
    }
  }

  return bestMoves;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

interface ScoredSequence {
  moves: TurnMoves;
  score: number;
}

function scoreSequences(
  board: Board,
  player: Player,
  sequences: TurnMoves[],
  weights: typeof EASY_WEIGHTS,
): ScoredSequence[] {
  return sequences.map((seq) => {
    let resultBoard = board;
    for (const move of seq) {
      resultBoard = resultBoard.applyMove(move, player);
    }
    const score = evaluateBoard(resultBoard, player, weights);
    return { moves: seq, score };
  });
}

function expandDice(d1: DiceValue, d2: DiceValue): DiceValue[] {
  if (d1 === d2) {
    return [d1, d1, d1, d1];
  }
  return [d1, d2];
}

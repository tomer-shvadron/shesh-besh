import type { EvalWeights } from '@/ai/types';
import type { Difficulty } from '@/engine/types';

/**
 * Easy weights — reduced heuristics with intentional noise built into move selection.
 * Mostly pip-count-aware but ignores advanced concepts like primes and anchors.
 */
export const EASY_WEIGHTS: EvalWeights = {
  pipCount: 0.4,
  blotExposure: 0.3,
  homeBoardStrength: 0.2,
  blockingPrimes: 0.0,
  barCheckers: 0.3,
  bearingOff: 0.5,
  anchorPosition: 0.0,
};

/**
 * Medium weights — solid positional play using core heuristics.
 * Understands pip count, avoiding blots, and home board strength.
 */
export const MEDIUM_WEIGHTS: EvalWeights = {
  pipCount: 0.8,
  blotExposure: 0.7,
  homeBoardStrength: 0.6,
  blockingPrimes: 0.2,
  barCheckers: 0.8,
  bearingOff: 0.9,
  anchorPosition: 0.2,
};

/**
 * Hard weights — all 8 heuristics at full strength for competitive play.
 * Values are tuned to reflect expert backgammon strategy priorities.
 */
export const HARD_WEIGHTS: EvalWeights = {
  pipCount: 1.0,
  blotExposure: 1.0,
  homeBoardStrength: 1.0,
  blockingPrimes: 1.0,
  barCheckers: 1.0,
  bearingOff: 1.0,
  anchorPosition: 1.0,
};

export function getWeights(difficulty: Difficulty): EvalWeights {
  if (difficulty === 'easy') {
    return EASY_WEIGHTS;
  }
  if (difficulty === 'medium') {
    return MEDIUM_WEIGHTS;
  }
  return HARD_WEIGHTS;
}

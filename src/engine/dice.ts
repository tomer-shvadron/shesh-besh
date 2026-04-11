import type { DiceRoll, DiceValue } from '@/engine/types';

/** Roll two dice, returning a pair of values 1-6. */
export function rollDice(): DiceRoll {
  return [rollSingle(), rollSingle()];
}

/** Roll a single die, returning a value 1-6. Used for the opening roll. */
export function rollSingle(): DiceValue {
  return (Math.floor(Math.random() * 6) + 1) as DiceValue;
}

/**
 * Expand a dice roll into individual die values to use for moves.
 * Doubles (e.g., [3,3]) give four moves with that value.
 * Non-doubles give two values (possibly different).
 */
export function getMovesFromRoll(roll: DiceRoll): DiceValue[] {
  const [a, b] = roll;
  if (a === b) {
    return [a, a, a, a];
  }
  return [a, b];
}

/** Returns true if the roll is doubles. */
export function isDoubles(roll: DiceRoll): boolean {
  return roll[0] === roll[1];
}

/**
 * Calculate the score for a completed game.
 *
 * Formula:
 *   score = (100 * diffMultiplier * speedBonus) + marginBonus
 *
 * - diffMultiplier: easy=1, medium=2, hard=3
 * - speedBonus: max(0, round(300 / totalSeconds)) — full bonus under 5 min
 * - marginBonus: opponent's remaining checkers * 10
 */
export function calcScore(timerElapsed: number, difficulty: string, margin: number): number {
  let diffMultiplier: number;
  if (difficulty === 'hard') {
    diffMultiplier = 3;
  } else if (difficulty === 'medium') {
    diffMultiplier = 2;
  } else {
    diffMultiplier = 1;
  }

  const totalSeconds = Math.max(1, Math.floor(timerElapsed / 1000));
  const speedBonus = Math.max(0, Math.round(300 / totalSeconds));

  const marginBonus = margin * 10;

  return 100 * diffMultiplier * speedBonus + marginBonus;
}

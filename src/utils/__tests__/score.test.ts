import { describe, expect, it } from 'vitest';

import { calcScore } from '@/utils/score';

describe('calcScore', () => {
  it('should return 0 when time is very long and no margin', () => {
    // 10 000 seconds → speedBonus = round(300/10000) = 0
    const score = calcScore(10_000_000, 'easy', 0);
    expect(score).toBe(0);
  });

  it('should apply difficulty multiplier (easy=1, medium=2, hard=3)', () => {
    // 60s → speedBonus = round(300/60) = 5
    const easy = calcScore(60_000, 'easy', 0);
    const medium = calcScore(60_000, 'medium', 0);
    const hard = calcScore(60_000, 'hard', 0);

    expect(easy).toBe(100 * 1 * 5);
    expect(medium).toBe(100 * 2 * 5);
    expect(hard).toBe(100 * 3 * 5);
  });

  it('should add margin bonus (10 pts per remaining checker)', () => {
    // Very long game (speedBonus = 0), margin = 8 → 80 pts
    const score = calcScore(10_000_000, 'easy', 8);
    expect(score).toBe(80);
  });

  it('should combine speed and margin bonuses', () => {
    // 100s → speedBonus = round(300/100) = 3, difficulty=medium(2), margin=5
    // = 100 * 2 * 3 + 50 = 650
    const score = calcScore(100_000, 'medium', 5);
    expect(score).toBe(650);
  });

  it('should handle sub-second timer (clamp to 1s)', () => {
    // 500ms → totalSeconds = max(1, 0) = 1 → speedBonus = 300
    const score = calcScore(500, 'easy', 0);
    expect(score).toBe(100 * 1 * 300);
  });
});

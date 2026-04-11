import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  animState,
  clearAllAnimations,
  isAnimating,
  startDiceRoll,
  tickAnimations,
} from '@/renderer/animationState';
import {
  easeInOut,
  easeOutCubic,
  interpolateCheckerMove,
  interpolateHitToBar,
} from '@/renderer/drawAnimations';

// ─── interpolateCheckerMove ────────────────────────────────────────────────────

describe('interpolateCheckerMove', () => {
  it('returns from coordinates at progress=0', () => {
    const result = interpolateCheckerMove(10, 20, 100, 200, 0);
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(20);
  });

  it('returns to coordinates at progress=1', () => {
    const result = interpolateCheckerMove(10, 20, 100, 200, 1);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(200);
  });

  it('returns a point between start and end at progress=0.5', () => {
    const result = interpolateCheckerMove(0, 0, 100, 100, 0.5);
    expect(result.x).toBeGreaterThan(0);
    expect(result.x).toBeLessThan(100);
    expect(result.y).toBeGreaterThan(0);
    expect(result.y).toBeLessThan(100);
  });

  it('midpoint x is at the horizontal midpoint', () => {
    const result = interpolateCheckerMove(0, 100, 200, 100, 0.5);
    expect(result.x).toBeCloseTo(100);
  });

  it('arc lifts the midpoint above the straight-line midpoint', () => {
    // Both endpoints share the same y; mid y on straight line = 100
    // The arc should go above (y < 100 since y-axis increases downward)
    const result = interpolateCheckerMove(0, 100, 200, 100, 0.5);
    expect(result.y).toBeLessThan(100);
  });
});

// ─── interpolateHitToBar ───────────────────────────────────────────────────────

describe('interpolateHitToBar', () => {
  it('returns from coordinates at progress=0', () => {
    const result = interpolateHitToBar(50, 300, 300, 150, 0);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(300);
  });

  it('returns bar coordinates at progress=1', () => {
    const result = interpolateHitToBar(50, 300, 300, 150, 1);
    expect(result.x).toBeCloseTo(300);
    expect(result.y).toBeCloseTo(150);
  });

  it('midpoint is between start and end', () => {
    const result = interpolateHitToBar(0, 200, 400, 200, 0.5);
    expect(result.x).toBeGreaterThan(0);
    expect(result.x).toBeLessThan(400);
  });

  it('arc goes higher than both fromY and barY at midpoint (tall arc)', () => {
    // fromY=200, barY=200 — on a flat line the mid would also be 200
    // The hit arc should be clearly above (smaller y value)
    const result = interpolateHitToBar(0, 200, 400, 200, 0.5);
    expect(result.y).toBeLessThan(200);
  });

  it('hit arc lifts higher than a normal move arc for the same distance', () => {
    const normalMid = interpolateCheckerMove(0, 200, 400, 200, 0.5);
    const hitMid = interpolateHitToBar(0, 200, 400, 200, 0.5);
    // Hit arc midpoint should be higher (smaller y) than normal arc midpoint
    expect(hitMid.y).toBeLessThan(normalMid.y);
  });
});

// ─── easeOutCubic ─────────────────────────────────────────────────────────────

describe('easeOutCubic', () => {
  it('easeOutCubic(0) === 0', () => {
    expect(easeOutCubic(0)).toBe(0);
  });

  it('easeOutCubic(1) === 1', () => {
    expect(easeOutCubic(1)).toBe(1);
  });

  it('easeOutCubic(0.5) > 0.5 (ease-out means fast start)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('clamps values below 0', () => {
    expect(easeOutCubic(-0.5)).toBe(0);
  });

  it('clamps values above 1', () => {
    expect(easeOutCubic(1.5)).toBe(1);
  });

  it('is monotonically increasing', () => {
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    for (let i = 0; i < values.length - 1; i++) {
      const a = values[i] as number;
      const b = values[i + 1] as number;
      expect(easeOutCubic(a)).toBeLessThan(easeOutCubic(b));
    }
  });
});

// ─── easeInOut ────────────────────────────────────────────────────────────────

describe('easeInOut', () => {
  it('easeInOut(0) === 0', () => {
    expect(easeInOut(0)).toBe(0);
  });

  it('easeInOut(1) === 1', () => {
    expect(easeInOut(1)).toBe(1);
  });

  it('easeInOut(0.5) === 0.5 (symmetric midpoint)', () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });

  it('clamps values below 0', () => {
    expect(easeInOut(-1)).toBe(0);
  });

  it('clamps values above 1', () => {
    expect(easeInOut(2)).toBe(1);
  });

  it('first quarter < 0.5 (slow start)', () => {
    expect(easeInOut(0.25)).toBeLessThan(0.5);
  });

  it('last quarter > 0.5 (slow end still past midpoint)', () => {
    expect(easeInOut(0.75)).toBeGreaterThan(0.5);
  });
});

// ─── animState.startDiceRoll ──────────────────────────────────────────────────

describe('startDiceRoll', () => {
  beforeEach(() => {
    clearAllAnimations();
    // Mock performance.now for deterministic tests
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllAnimations();
  });

  it('sets diceAnimation with correct finalValues', () => {
    startDiceRoll([3, 5]);
    expect(animState.diceAnimation).not.toBeNull();
    expect(animState.diceAnimation?.finalValues).toEqual([3, 5]);
  });

  it('sets diceAnimation type to dice-roll', () => {
    startDiceRoll([1, 2]);
    expect(animState.diceAnimation?.type).toBe('dice-roll');
  });

  it('sets startTime from performance.now()', () => {
    startDiceRoll([4]);
    expect(animState.diceAnimation?.startTime).toBe(1000);
  });

  it('sets duration to 500ms', () => {
    startDiceRoll([6, 6]);
    expect(animState.diceAnimation?.duration).toBe(500);
  });
});

// ─── isAnimating + tickAnimations ─────────────────────────────────────────────

describe('isAnimating', () => {
  beforeEach(() => {
    clearAllAnimations();
  });

  afterEach(() => {
    clearAllAnimations();
  });

  it('returns false initially', () => {
    expect(isAnimating()).toBe(false);
  });

  it('returns true after startDiceRoll', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    startDiceRoll([1, 2]);
    expect(isAnimating()).toBe(true);
    vi.restoreAllMocks();
  });

  it('returns false after tickAnimations moves past the duration', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    startDiceRoll([1, 2]);
    vi.restoreAllMocks();

    // Tick well past 500ms duration
    tickAnimations(600);
    expect(animState.diceAnimation).toBeNull();
    expect(isAnimating()).toBe(false);
  });

  it('keeps diceAnimation alive before duration elapses', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    startDiceRoll([3, 4]);
    vi.restoreAllMocks();

    tickAnimations(300); // 300ms < 500ms duration
    expect(animState.diceAnimation).not.toBeNull();
    expect(isAnimating()).toBe(true);
  });

  it('returns true when winCelebration is set', () => {
    animState.winCelebration = true;
    expect(isAnimating()).toBe(true);
  });

  it('clearAllAnimations resets everything', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    startDiceRoll([2]);
    animState.winCelebration = true;
    clearAllAnimations();
    vi.restoreAllMocks();

    expect(isAnimating()).toBe(false);
    expect(animState.diceAnimation).toBeNull();
    expect(animState.checkerAnimations).toHaveLength(0);
    expect(animState.winCelebration).toBe(false);
  });
});

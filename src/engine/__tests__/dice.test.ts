import { describe, expect, it, vi } from 'vitest';

import { getMovesFromRoll, isDoubles, rollDice, rollSingle } from '@/engine/dice';
import type { DiceRoll } from '@/engine/types';

describe('dice', () => {
  describe('rollSingle()', () => {
    it('should return a value between 1 and 6', () => {
      for (let i = 0; i < 100; i++) {
        const value = rollSingle();
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      }
    });

    it('should return an integer', () => {
      const value = rollSingle();
      expect(Number.isInteger(value)).toBe(true);
    });
  });

  describe('rollDice()', () => {
    it('should return an array of exactly 2 values', () => {
      const roll = rollDice();
      expect(roll).toHaveLength(2);
    });

    it('should return values between 1 and 6', () => {
      for (let i = 0; i < 50; i++) {
        const [a, b] = rollDice();
        expect(a).toBeGreaterThanOrEqual(1);
        expect(a).toBeLessThanOrEqual(6);
        expect(b).toBeGreaterThanOrEqual(1);
        expect(b).toBeLessThanOrEqual(6);
      }
    });

    it('should be able to produce doubles', () => {
      // Mock Math.random to produce doubles
      vi.spyOn(Math, 'random').mockReturnValue(0); // always returns 0 → die value 1
      const roll = rollDice();
      expect(roll[0]).toBe(roll[1]);
      vi.restoreAllMocks();
    });
  });

  describe('getMovesFromRoll()', () => {
    it('should return 2 values for non-doubles', () => {
      const roll: DiceRoll = [3, 5];
      const moves = getMovesFromRoll(roll);
      expect(moves).toHaveLength(2);
      expect(moves).toContain(3);
      expect(moves).toContain(5);
    });

    it('should return 4 identical values for doubles', () => {
      const roll: DiceRoll = [4, 4];
      const moves = getMovesFromRoll(roll);
      expect(moves).toHaveLength(4);
      expect(moves).toEqual([4, 4, 4, 4]);
    });

    it('should return correct values for each doubles case', () => {
      for (let d = 1; d <= 6; d++) {
        const roll: DiceRoll = [d as 1 | 2 | 3 | 4 | 5 | 6, d as 1 | 2 | 3 | 4 | 5 | 6];
        const moves = getMovesFromRoll(roll);
        expect(moves).toHaveLength(4);
        expect(moves.every((v) => v === d)).toBe(true);
      }
    });
  });

  describe('isDoubles()', () => {
    it('should return true for doubles', () => {
      expect(isDoubles([1, 1])).toBe(true);
      expect(isDoubles([3, 3])).toBe(true);
      expect(isDoubles([6, 6])).toBe(true);
    });

    it('should return false for non-doubles', () => {
      expect(isDoubles([1, 2])).toBe(false);
      expect(isDoubles([3, 5])).toBe(false);
      expect(isDoubles([1, 6])).toBe(false);
    });
  });
});

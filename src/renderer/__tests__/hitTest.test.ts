import { describe, expect, it } from 'vitest';

import { computeBoardDimensions } from '@/renderer/dimensions';
import { hitTest } from '@/renderer/hitTest';

// ─── Shared dimensions ─────────────────────────────────────────────────────────

/** Standard 600×400 board for all tests. */
const DIMS = computeBoardDimensions(600, 400);

// Helper: get the x center for a given column within a half
function halfColX(dims: typeof DIMS, isRight: boolean, col: number): number {
  const halfLeft = isRight ? dims.rightHalfLeft : dims.leftHalfLeft;
  return halfLeft + col * dims.triWidth + dims.triWidth / 2;
}

// Top row y = 25% from top (well within top half)
const TOP_Y = DIMS.boardTop + DIMS.boardHeight * 0.2;
// Bottom row y = 75% from top (well within bottom half)
const BOT_Y = DIMS.boardTop + DIMS.boardHeight * 0.8;

// ─── Bar tests ────────────────────────────────────────────────────────────────

describe('hitTest — bar zone', () => {
  it('returns { type: "bar" } when clicking inside the bar column', () => {
    const barCx = DIMS.barLeft + DIMS.barWidth / 2;
    const result = hitTest(barCx, DIMS.boardTop + DIMS.boardHeight / 2, DIMS);
    expect(result).toEqual({ type: 'bar' });
  });

  it('returns { type: "bar" } at bar top edge', () => {
    const barCx = DIMS.barLeft + DIMS.barWidth / 2;
    const result = hitTest(barCx, DIMS.boardTop + 2, DIMS);
    expect(result).toEqual({ type: 'bar' });
  });

  it('returns { type: "bar" } at bar bottom edge', () => {
    const barCx = DIMS.barLeft + DIMS.barWidth / 2;
    const result = hitTest(barCx, DIMS.boardTop + DIMS.boardHeight - 2, DIMS);
    expect(result).toEqual({ type: 'bar' });
  });
});

// ─── Frame / non-interactive tests ────────────────────────────────────────────

describe('hitTest — frame returns null', () => {
  it('returns null for click in top frame padding', () => {
    const result = hitTest(DIMS.width / 2, DIMS.padding / 2, DIMS);
    expect(result).toBeNull();
  });

  it('returns null for click in left frame padding', () => {
    const result = hitTest(DIMS.padding / 2, DIMS.height / 2, DIMS);
    expect(result).toBeNull();
  });

  it('returns null for click in bottom frame padding', () => {
    const result = hitTest(DIMS.width / 2, DIMS.height - DIMS.padding / 2, DIMS);
    expect(result).toBeNull();
  });

  it('returns null for click at (0, 0)', () => {
    const result = hitTest(0, 0, DIMS);
    expect(result).toBeNull();
  });
});

// ─── Bear-off zone tests ───────────────────────────────────────────────────────

describe('hitTest — bear-off zone', () => {
  it('returns { type: "bearOff" } for click in right padding area', () => {
    const x = DIMS.boardLeft + DIMS.boardWidth + DIMS.padding * 0.5;
    const y = DIMS.boardTop + DIMS.boardHeight / 2;
    const result = hitTest(x, y, DIMS);
    expect(result).toEqual({ type: 'bearOff' });
  });
});

// ─── Top row — left half (points 12-17) ──────────────────────────────────────

describe('hitTest — top row, left half (points 12-17)', () => {
  it('col 0 → point 12', () => {
    const x = halfColX(DIMS, false, 0);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 12 });
  });

  it('col 1 → point 13', () => {
    const x = halfColX(DIMS, false, 1);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 13 });
  });

  it('col 2 → point 14', () => {
    const x = halfColX(DIMS, false, 2);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 14 });
  });

  it('col 3 → point 15', () => {
    const x = halfColX(DIMS, false, 3);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 15 });
  });

  it('col 4 → point 16', () => {
    const x = halfColX(DIMS, false, 4);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 16 });
  });

  it('col 5 → point 17', () => {
    const x = halfColX(DIMS, false, 5);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 17 });
  });
});

// ─── Top row — right half (points 18-23) ─────────────────────────────────────

describe('hitTest — top row, right half (points 18-23)', () => {
  it('col 0 → point 18', () => {
    const x = halfColX(DIMS, true, 0);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 18 });
  });

  it('col 3 → point 21', () => {
    const x = halfColX(DIMS, true, 3);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 21 });
  });

  it('col 5 → point 23', () => {
    const x = halfColX(DIMS, true, 5);
    expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: 23 });
  });
});

// ─── Bottom row — left half (points 6-11) ────────────────────────────────────

describe('hitTest — bottom row, left half (points 6-11)', () => {
  it('col 0 → point 11', () => {
    const x = halfColX(DIMS, false, 0);
    expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: 11 });
  });

  it('col 1 → point 10', () => {
    const x = halfColX(DIMS, false, 1);
    expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: 10 });
  });

  it('col 2 → point 9', () => {
    const x = halfColX(DIMS, false, 2);
    expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: 9 });
  });

  it('col 5 → point 6', () => {
    const x = halfColX(DIMS, false, 5);
    expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: 6 });
  });
});

// ─── Bottom row — right half (points 0-5) ────────────────────────────────────

describe('hitTest — bottom row, right half (points 0-5)', () => {
  it('col 0 → point 5', () => {
    const x = halfColX(DIMS, true, 0);
    expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: 5 });
  });

  it('col 1 → point 4', () => {
    const x = halfColX(DIMS, true, 1);
    expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: 4 });
  });

  it('col 4 → point 1', () => {
    const x = halfColX(DIMS, true, 4);
    expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: 1 });
  });

  it('col 5 → point 0 (white home corner)', () => {
    const x = halfColX(DIMS, true, 5);
    expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: 0 });
  });
});

// ─── All 24 points — comprehensive round-trip ─────────────────────────────────

describe('hitTest — all 24 points map to correct indices', () => {
  const topLeft: [number, number][] = [
    [12, 0], [13, 1], [14, 2], [15, 3], [16, 4], [17, 5],
  ];
  const topRight: [number, number][] = [
    [18, 0], [19, 1], [20, 2], [21, 3], [22, 4], [23, 5],
  ];
  const botLeft: [number, number][] = [
    [11, 0], [10, 1], [9, 2], [8, 3], [7, 4], [6, 5],
  ];
  const botRight: [number, number][] = [
    [5, 0], [4, 1], [3, 2], [2, 3], [1, 4], [0, 5],
  ];

  for (const [ptIdx, col] of topLeft) {
    it(`top-left col ${col} → point ${ptIdx}`, () => {
      const x = halfColX(DIMS, false, col);
      expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: ptIdx });
    });
  }

  for (const [ptIdx, col] of topRight) {
    it(`top-right col ${col} → point ${ptIdx}`, () => {
      const x = halfColX(DIMS, true, col);
      expect(hitTest(x, TOP_Y, DIMS)).toEqual({ type: 'point', index: ptIdx });
    });
  }

  for (const [ptIdx, col] of botLeft) {
    it(`bot-left col ${col} → point ${ptIdx}`, () => {
      const x = halfColX(DIMS, false, col);
      expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: ptIdx });
    });
  }

  for (const [ptIdx, col] of botRight) {
    it(`bot-right col ${col} → point ${ptIdx}`, () => {
      const x = halfColX(DIMS, true, col);
      expect(hitTest(x, BOT_Y, DIMS)).toEqual({ type: 'point', index: ptIdx });
    });
  }
});

import type { DiceValue } from '@/engine/types';

/**
 * Normalised pip positions for each die face.
 *
 * Each pip is expressed as a `[fx, fy]` pair in the {-1, 0, 1} grid, so:
 *   -1 = top / left, 0 = centre, 1 = bottom / right
 *
 * Callers multiply the component by whatever half-extent the target
 * rendering uses (e.g. `inner / 2 - pipR - margin` for SVG, or
 * `size * 0.28` for the canvas die drawer).
 *
 * This is shared by:
 *   - src/renderer/drawDice.ts       (canvas dice at the bottom of the board)
 *   - src/components/MoveHistory.tsx (mini SVG dice in the move history)
 */
export const DICE_FACES: Record<DiceValue, readonly [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

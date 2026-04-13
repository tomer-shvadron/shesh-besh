import type { BoardDimensions } from '@/renderer/dimensions';

/**
 * Shared coordinate helpers for the board canvas. Anything that needs to
 * reason about pixel positions affected by `boardFlipped` should live here so
 * we only have one source of truth.
 */

/**
 * Raw x-position of the bear-off lane (in the outer frame, beyond the play
 * area). Right side by default, left when the board is flipped.
 */
export function getBearOffXRaw(dims: BoardDimensions, boardFlipped: boolean): number {
  return boardFlipped
    ? dims.boardLeft - dims.padding * 0.5
    : dims.boardLeft + dims.boardWidth + dims.padding * 0.5;
}

/**
 * Clamp a bear-off x so that a glow/highlight of the given radius is never
 * clipped by the canvas edge. Matches the existing highlight behaviour.
 */
export function clampBearOffX(
  xRaw: number,
  dims: BoardDimensions,
  glowRadius: number,
  boardFlipped: boolean,
): number {
  return boardFlipped
    ? Math.max(xRaw, glowRadius + 2)
    : Math.min(xRaw, dims.width - glowRadius - 2);
}

/**
 * Centre y-position of the bear-off lane. Always the vertical middle of the
 * play area (symmetric for both players).
 */
export function getBearOffCenterY(dims: BoardDimensions): number {
  return dims.boardTop + dims.boardHeight / 2;
}

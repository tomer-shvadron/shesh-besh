import type { BoardDimensions } from '@/renderer/dimensions';

export type HitZone =
  | { type: 'point'; index: number }
  | { type: 'bar' }
  | { type: 'bearOff' }
  | null;

/**
 * Map canvas CSS pixel coordinates to a board zone.
 *
 * Visual layout (from white's perspective):
 *   Top    left  half: points 12-17 (col 0-5)
 *   Top    right half: points 18-23 (col 0-5)
 *   Bottom left  half: points 11-6  (col 0-5)
 *   Bottom right half: points 5-0   (col 0-5)
 *
 * @param x    - CSS pixel x within canvas
 * @param y    - CSS pixel y within canvas
 * @param dims - current board dimensions
 * @returns HitZone describing what was clicked, or null for non-interactive areas
 */
export function hitTest(x: number, y: number, dims: BoardDimensions): HitZone {
  // ── Outside playing area entirely ────────────────────────────────────────────
  if (
    x < dims.boardLeft ||
    x > dims.boardLeft + dims.boardWidth ||
    y < dims.boardTop ||
    y > dims.boardTop + dims.boardHeight
  ) {
    // Check bear-off zone in frame on right side
    if (isBearOffZone(x, y, dims)) {
      return { type: 'bearOff' };
    }
    return null;
  }

  // ── Bar zone ─────────────────────────────────────────────────────────────────
  if (x >= dims.barLeft && x <= dims.barLeft + dims.barWidth) {
    return { type: 'bar' };
  }

  // ── Determine which half and column was clicked ───────────────────────────────
  const isRightHalf = x >= dims.rightHalfLeft;
  const halfLeft = isRightHalf ? dims.rightHalfLeft : dims.leftHalfLeft;
  const localX = x - halfLeft;
  const col = Math.floor(localX / dims.triWidth);

  // Clamp column to valid range
  if (col < 0 || col > 5) {
    return null;
  }

  // ── Determine top or bottom row ──────────────────────────────────────────────
  const boardMidY = dims.boardTop + dims.boardHeight / 2;
  const isTopRow = y < boardMidY;

  const pointIndex = resolvePointIndex(col, isTopRow, isRightHalf);
  return { type: 'point', index: pointIndex };
}

// ─── Point index resolution ───────────────────────────────────────────────────

/**
 * Convert a (col, isTopRow, isRightHalf) triple to a 0-based point index.
 *
 * Top row left  half: col0=12, col1=13, col2=14, col3=15, col4=16, col5=17
 * Top row right half: col0=18, col1=19, col2=20, col3=21, col4=22, col5=23
 * Bot row left  half: col0=11, col1=10, col2=9,  col3=8,  col4=7,  col5=6
 * Bot row right half: col0=5,  col1=4,  col2=3,  col3=2,  col4=1,  col5=0
 */
function resolvePointIndex(col: number, isTopRow: boolean, isRightHalf: boolean): number {
  if (isTopRow && !isRightHalf) {
    return 12 + col;
  }
  if (isTopRow && isRightHalf) {
    return 18 + col;
  }
  if (!isTopRow && !isRightHalf) {
    return 11 - col;
  }
  // !isTopRow && isRightHalf
  return 5 - col;
}

// ─── Bear-off zone detection ──────────────────────────────────────────────────

/**
 * Returns true if the click is in the bear-off tray area (right side of frame).
 * Bear-off zone spans the full right padding column.
 */
function isBearOffZone(x: number, y: number, dims: BoardDimensions): boolean {
  const rightEdge = dims.boardLeft + dims.boardWidth;
  const isInRightPadding = x > rightEdge && x < dims.width;
  const isInBoardVertical = y >= dims.boardTop && y <= dims.boardTop + dims.boardHeight;
  return isInRightPadding && isInBoardVertical;
}

export interface BoardDimensions {
  width: number;           // CSS width
  height: number;          // CSS height
  padding: number;         // frame padding
  boardLeft: number;
  boardTop: number;
  boardWidth: number;
  boardHeight: number;
  barWidth: number;
  barLeft: number;
  halfWidth: number;       // each playable half width
  triWidth: number;        // single triangle width
  triHeight: number;       // triangle height (checker stack area = ~43% of board height)
  checkerRadius: number;
  checkerDiameter: number;
  checkerSpacing: number;  // center-to-center spacing in a stack
  leftHalfLeft: number;
  rightHalfLeft: number;
}

/**
 * Compute all layout dimensions from a given CSS width/height.
 * The board has 3:2 aspect ratio. Padding is the walnut frame area.
 */
export function computeBoardDimensions(cssWidth: number, cssHeight: number): BoardDimensions {
  const padding = Math.round(cssWidth * 0.03);
  const barWidth = Math.round(cssWidth * 0.042);

  const boardLeft = padding;
  const boardTop = padding;
  const boardWidth = cssWidth - padding * 2;
  const boardHeight = cssHeight - padding * 2;

  // Bar sits exactly in the center of the playing surface
  const barLeft = boardLeft + Math.round((boardWidth - barWidth) / 2);

  // Each half of the board (left and right of bar)
  const halfWidth = Math.round((boardWidth - barWidth) / 2);

  // 6 triangles per half
  const triWidth = halfWidth / 6;

  // Triangles take ~43% of board height
  const triHeight = Math.round(boardHeight * 0.43);

  // Checker radius is sized to fit snugly in a triangle slot
  // triWidth / 2 gives the maximum checker radius; we use 90% of that
  const checkerRadius = Math.round((triWidth / 2) * 0.88);
  const checkerDiameter = checkerRadius * 2;

  // In a stack, checkers are spaced slightly less than a full diameter so they
  // overlap a bit when there are many. Full diameter up to 5; compressed beyond.
  const checkerSpacing = Math.round(checkerDiameter * 0.88);

  const leftHalfLeft = boardLeft;
  const rightHalfLeft = barLeft + barWidth;

  return {
    width: cssWidth,
    height: cssHeight,
    padding,
    boardLeft,
    boardTop,
    boardWidth,
    boardHeight,
    barWidth,
    barLeft,
    halfWidth,
    triWidth,
    triHeight,
    checkerRadius,
    checkerDiameter,
    checkerSpacing,
    leftHalfLeft,
    rightHalfLeft,
  };
}

/**
 * Visual layout (from white's perspective):
 *
 * Top row (left→right):    [12][13][14][15][16][17] | BAR | [18][19][20][21][22][23]
 * Bottom row (left→right): [11][10][ 9][ 8][ 7][ 6] | BAR | [ 5][ 4][ 3][ 2][ 1][ 0]
 *
 * Left half columns (0-5 left-to-right):
 *   Top row:    col0=pt12, col1=pt13, col2=pt14, col3=pt15, col4=pt16, col5=pt17
 *   Bottom row: col0=pt11, col1=pt10, col2=pt9,  col3=pt8,  col4=pt7,  col5=pt6
 *
 * Right half columns (0-5 left-to-right):
 *   Top row:    col0=pt18, col1=pt19, col2=pt20, col3=pt21, col4=pt22, col5=pt23
 *   Bottom row: col0=pt5,  col1=pt4,  col2=pt3,  col3=pt2,  col4=pt1,  col5=pt0
 */
export function getPointX(dims: BoardDimensions, pointIndex: number): number {
  const col = getPointColumn(pointIndex);
  const isRight = pointIndex >= 18 || pointIndex <= 5;

  const halfLeft = isRight ? dims.rightHalfLeft : dims.leftHalfLeft;
  return halfLeft + col * dims.triWidth + dims.triWidth / 2;
}

/**
 * Returns the column index (0-5, left to right) within its half for a given point.
 */
function getPointColumn(pointIndex: number): number {
  // Top row left half: 12→col0, 13→col1, 14→col2, 15→col3, 16→col4, 17→col5
  if (pointIndex >= 12 && pointIndex <= 17) {
    return pointIndex - 12;
  }
  // Bottom row left half: 11→col0, 10→col1, 9→col2, 8→col3, 7→col4, 6→col5
  if (pointIndex >= 6 && pointIndex <= 11) {
    return 11 - pointIndex;
  }
  // Top row right half: 18→col0, 19→col1, 20→col2, 21→col3, 22→col4, 23→col5
  if (pointIndex >= 18 && pointIndex <= 23) {
    return pointIndex - 18;
  }
  // Bottom row right half: 5→col0, 4→col1, 3→col2, 2→col3, 1→col4, 0→col5
  if (pointIndex >= 0 && pointIndex <= 5) {
    return 5 - pointIndex;
  }
  return 0;
}

/** Returns true if the given point is on the top row (triangles point down). */
export function isTopPoint(pointIndex: number): boolean {
  return pointIndex >= 12;
}

/**
 * Get y-center of checker at stack position checkerIdx (0-based) for a given point.
 * Stacks grow inward from the edge. checkerIdx is clamped to 4 for display purposes
 * (the 5th checker is the last visible position; count shown if >5).
 */
export function getCheckerY(dims: BoardDimensions, pointIndex: number, checkerIdx: number): number {
  const clampedIdx = Math.min(checkerIdx, 4);
  const top = isTopPoint(pointIndex);

  if (top) {
    // Top row: first checker at boardTop + checkerRadius, stack grows downward
    return dims.boardTop + dims.checkerRadius + clampedIdx * dims.checkerSpacing;
  } else {
    // Bottom row: first checker at boardTop + boardHeight - checkerRadius, stack grows upward
    return dims.boardTop + dims.boardHeight - dims.checkerRadius - clampedIdx * dims.checkerSpacing;
  }
}

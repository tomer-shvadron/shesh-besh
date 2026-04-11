import type { BoardState, MoveTo } from '@/engine/types';
import { getCheckerY, getPointX, isTopPoint } from '@/renderer/dimensions';
import type { BoardDimensions } from '@/renderer/dimensions';
import type { BoardTheme } from '@/renderer/themes/types';

/**
 * Draw highlight indicators for valid move destinations.
 * - Semi-transparent filled circle for regular valid landing points
 * - Red tint for points containing an opponent blot (can be hit)
 * - Special indicator for bear-off destination ('off')
 */
export function drawHighlights(
  ctx: CanvasRenderingContext2D,
  validDestinations: MoveTo[],
  dims: BoardDimensions,
  theme: BoardTheme,
  boardState?: BoardState,
): void {
  for (const dest of validDestinations) {
    if (dest === 'off') {
      drawBearOffHighlight(ctx, dims, theme);
    } else {
      const isBlotTarget = boardState ? isOpponentBlot(boardState, dest) : false;
      drawPointHighlight(ctx, dims, theme, dest, isBlotTarget);
    }
  }
}

// ─── Individual highlight drawing ─────────────────────────────────────────────

function drawPointHighlight(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  pointIndex: number,
  isHit: boolean,
): void {
  const cx = getPointX(dims, pointIndex);
  const top = isTopPoint(pointIndex);

  // Place the highlight dot at the outermost checker position (where a checker would land)
  const cy = top
    ? dims.boardTop + dims.checkerRadius
    : dims.boardTop + dims.boardHeight - dims.checkerRadius;

  const radius = dims.checkerRadius * 0.55;
  const color = isHit ? theme.highlights.hit : theme.highlights.valid;

  // Glow ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = color.replace(/[\d.]+\)$/, (m) => {
    // Reduce opacity for glow ring
    const val = parseFloat(m) * 0.4;
    return `${val.toFixed(2)})`;
  });
  ctx.fill();

  // Solid dot
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBearOffHighlight(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  // Bear-off zone is to the right of the board (in the frame area on right side)
  // Draw a glowing indicator in both the top and bottom bear-off brackets
  const x = dims.boardLeft + dims.boardWidth + dims.padding * 0.5;

  const radius = dims.checkerRadius * 0.45;
  const color = theme.highlights.valid;

  // Top bracket (black bear-off zone)
  const blackY = dims.boardTop + dims.boardHeight * 0.2;
  drawGlowDot(ctx, x, blackY, radius, color);

  // Bottom bracket (white bear-off zone)
  const whiteY = dims.boardTop + dims.boardHeight * 0.8;
  drawGlowDot(ctx, x, whiteY, radius, color);
}

function drawGlowDot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  // Outer glow
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = replaceAlpha(color, 0.25);
  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// ─── Helper: check if a board point contains an opponent blot ─────────────────

function isOpponentBlot(boardState: BoardState, pointIndex: number): boolean {
  const pt = boardState.points[pointIndex];
  if (!pt) {
    return false;
  }
  return pt.player !== null && pt.count === 1;
}

// ─── Color utility ────────────────────────────────────────────────────────────

/** Replace the alpha value of an rgba(...) color string. */
function replaceAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba(')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }
  return color;
}

// Re-export used helpers
export { getCheckerY, isTopPoint };

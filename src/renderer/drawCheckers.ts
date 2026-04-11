import type { BoardState, MoveFrom, Player } from '@/engine/types';
import { getCheckerY, getPointX, isTopPoint } from '@/renderer/dimensions';
import type { BoardDimensions } from '@/renderer/dimensions';
import type { BoardTheme } from '@/renderer/themes/types';

const MAX_VISIBLE_STACK = 5;

/**
 * Draw all checkers: on the 24 points, on the bar, and bear-off pip counts.
 */
export function drawCheckers(
  ctx: CanvasRenderingContext2D,
  boardState: BoardState,
  dims: BoardDimensions,
  theme: BoardTheme,
  selectedPoint: MoveFrom | null,
): void {
  // Draw checkers on all 24 points
  for (let i = 0; i < 24; i++) {
    const pt = boardState.points[i];
    if (!pt || !pt.player || pt.count === 0) {
      continue;
    }
    const isSelected = selectedPoint === i;
    drawPointCheckers(ctx, dims, theme, i, pt.player, pt.count, isSelected);
  }

  // Draw checkers on bar
  drawBarCheckers(ctx, boardState, dims, theme, selectedPoint);

  // Draw bear-off counters
  drawBearOffCounters(ctx, boardState, dims, theme);
}

// ─── Point checker drawing ────────────────────────────────────────────────────

function drawPointCheckers(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  pointIndex: number,
  player: Player,
  count: number,
  isSelected: boolean,
): void {
  const cx = getPointX(dims, pointIndex);
  const visibleCount = Math.min(count, MAX_VISIBLE_STACK);

  for (let i = 0; i < visibleCount; i++) {
    const cy = getCheckerY(dims, pointIndex, i);
    const isTop = i === visibleCount - 1; // topmost checker in the visual stack
    const showCount = isTop && count > MAX_VISIBLE_STACK;
    const highlight = isSelected && isTop;

    drawChecker(ctx, dims, theme, cx, cy, player, highlight);

    if (showCount) {
      drawCheckerCountLabel(ctx, dims, theme, cx, cy, count);
    }
  }
}

// ─── Bar checker drawing ──────────────────────────────────────────────────────

function drawBarCheckers(
  ctx: CanvasRenderingContext2D,
  boardState: BoardState,
  dims: BoardDimensions,
  theme: BoardTheme,
  selectedPoint: MoveFrom | null,
): void {
  const barCx = dims.barLeft + dims.barWidth / 2;

  // White checkers: displayed in the bottom half of the bar (white's perspective)
  const whiteCount = boardState.bar.white;
  if (whiteCount > 0) {
    const isSelected = selectedPoint === 'bar';
    drawBarStack(ctx, dims, theme, barCx, 'white', whiteCount, false, isSelected);
  }

  // Black checkers: displayed in the top half of the bar
  const blackCount = boardState.bar.black;
  if (blackCount > 0) {
    drawBarStack(ctx, dims, theme, barCx, 'black', blackCount, true, false);
  }
}

function drawBarStack(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  cx: number,
  player: Player,
  count: number,
  isTopHalf: boolean,
  isSelected: boolean,
): void {
  const visibleCount = Math.min(count, MAX_VISIBLE_STACK);
  const halfMidY = isTopHalf
    ? dims.boardTop + dims.boardHeight / 4
    : dims.boardTop + (dims.boardHeight * 3) / 4;

  // Stack from center of each bar half
  const startY = halfMidY - ((visibleCount - 1) / 2) * dims.checkerSpacing;

  for (let i = 0; i < visibleCount; i++) {
    const cy = startY + i * dims.checkerSpacing;
    const isTop = i === visibleCount - 1;
    const showCount = isTop && count > MAX_VISIBLE_STACK;
    const highlight = isSelected && isTop;

    drawChecker(ctx, dims, theme, cx, cy, player, highlight);

    if (showCount) {
      drawCheckerCountLabel(ctx, dims, theme, cx, cy, count);
    }
  }
}

// ─── Bear-off counters ─────────────────────────────────────────────────────────

function drawBearOffCounters(
  ctx: CanvasRenderingContext2D,
  boardState: BoardState,
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  const fontSize = Math.max(9, Math.round(dims.checkerRadius * 0.9));
  ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // White borne off — shown at bottom-right area in the frame
  const whiteOff = boardState.borneOff.white;
  if (whiteOff > 0) {
    const x = dims.boardLeft + dims.boardWidth + dims.padding * 0.5;
    const y = dims.boardTop + dims.boardHeight * 0.85;
    ctx.fillStyle = theme.checkers.white.fill;
    ctx.fillText(String(whiteOff), x, y);
  }

  // Black borne off — shown at top-right area in the frame
  const blackOff = boardState.borneOff.black;
  if (blackOff > 0) {
    const x = dims.boardLeft + dims.boardWidth + dims.padding * 0.5;
    const y = dims.boardTop + dims.boardHeight * 0.15;
    ctx.fillStyle = theme.checkers.black.fill;
    ctx.fillText(String(blackOff), x, y);
  }
}

// ─── Single checker drawing ───────────────────────────────────────────────────

function drawChecker(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  cx: number,
  cy: number,
  player: Player,
  isSelected: boolean,
): void {
  const r = dims.checkerRadius;
  const style = player === 'white' ? theme.checkers.white : theme.checkers.black;

  // Selection glow — outer ring before drawing checker
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = theme.highlights.selected;
    ctx.fill();
  }

  // Base fill with radial gradient for 3D bevel effect
  // Light comes from top-left, shadow at bottom-right
  const grad = ctx.createRadialGradient(
    cx - r * 0.3, cy - r * 0.3, r * 0.05,   // inner light (offset top-left)
    cx, cy, r,                                 // outer circle
  );
  grad.addColorStop(0, style.gradientLight);
  grad.addColorStop(0.55, style.fill);
  grad.addColorStop(1, style.gradientDark);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Outer border (stroke)
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.stroke();

  // Inner highlight ring — a small bright arc at top-left for polished look
  const ringR = r * 0.72;
  const ringGrad = ctx.createRadialGradient(
    cx - r * 0.25, cy - r * 0.25, ringR * 0.1,
    cx - r * 0.1, cy - r * 0.1, ringR,
  );
  ringGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  ringGrad.addColorStop(0.6, 'rgba(255,255,255,0.10)');
  ringGrad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();
}

function drawCheckerCountLabel(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  cx: number,
  cy: number,
  count: number,
): void {
  const fontSize = Math.max(8, Math.round(dims.checkerRadius * 0.75));
  ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow for legibility
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(String(count), cx + 1, cy + 1);

  ctx.fillStyle = theme.text;
  ctx.fillText(String(count), cx, cy);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

// Re-export for convenience so callers don't need to import from dimensions
export { isTopPoint };

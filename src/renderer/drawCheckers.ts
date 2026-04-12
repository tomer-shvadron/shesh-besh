import type { BoardState, MoveFrom, Player } from '@/engine/types';
import { animState } from '@/renderer/animationState';
import { getCheckerY, getPointX, isTopPoint } from '@/renderer/dimensions';
import type { BoardDimensions } from '@/renderer/dimensions';
import type { BoardTheme } from '@/renderer/themes/types';

const MAX_VISIBLE_STACK = 5;

/**
 * Draw all checkers: on the 24 points, on the bar, and bear-off pip counts.
 * Pass boardFlipped=true to mirror x-positions to match a flipped board layout.
 * Pass dragFrom to hide the dragged checker from its source position.
 */
export function drawCheckers(
  ctx: CanvasRenderingContext2D,
  boardState: BoardState,
  dims: BoardDimensions,
  theme: BoardTheme,
  selectedPoint: MoveFrom | null,
  boardFlipped = false,
  dragFrom: MoveFrom | null = null,
): void {
  // Draw checkers on all 24 points
  for (let i = 0; i < 24; i++) {
    const pt = boardState.points[i];
    if (!pt || !pt.player || pt.count === 0) {
      continue;
    }
    const isSelected = selectedPoint === i;
    // When dragging from this point, hide the topmost checker (it's at the pointer)
    const displayCount = dragFrom === i ? pt.count - 1 : pt.count;
    if (displayCount <= 0) {
      continue;
    }
    drawPointCheckers(ctx, dims, theme, i, pt.player, displayCount, isSelected, boardFlipped);
  }

  // Draw checkers on bar
  const dragFromBar = dragFrom === 'bar';
  drawBarCheckers(ctx, boardState, dims, theme, selectedPoint, dragFromBar);

  // Draw bear-off counters
  drawBearOffCounters(ctx, boardState, dims, theme, boardFlipped);
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
  boardFlipped = false,
): void {
  const cx = getPointX(dims, pointIndex, boardFlipped);
  const visibleCount = Math.min(count, MAX_VISIBLE_STACK);

  // Look up any active stack animation for this point
  const stackAnim = animState.stackAnimations.find((a) => a.point === pointIndex);

  for (let i = 0; i < visibleCount; i++) {
    const cy = getCheckerY(dims, pointIndex, i);
    const isTop = i === visibleCount - 1;
    const showCount = isTop && count > MAX_VISIBLE_STACK;
    const highlight = isSelected && isTop;

    if (isTop && stackAnim) {
      const scale = stackAnimScale(stackAnim);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      drawChecker(ctx, dims, theme, cx, cy, player, highlight);
      ctx.restore();
    } else {
      drawChecker(ctx, dims, theme, cx, cy, player, highlight);
    }

    if (showCount) {
      drawCheckerCountLabel(ctx, dims, cx, cy, count, player);
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
  dragFromBar = false,
): void {
  const barCx = dims.barLeft + dims.barWidth / 2;

  // White checkers: displayed in the bottom half of the bar (white's perspective)
  const whiteCount = boardState.bar.white;
  const effectiveWhiteCount = dragFromBar ? whiteCount - 1 : whiteCount;
  if (effectiveWhiteCount > 0) {
    const isSelected = selectedPoint === 'bar';
    drawBarStack(ctx, dims, theme, barCx, 'white', effectiveWhiteCount, false, isSelected);
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
  const halfMidY = isTopHalf ? dims.boardTop + dims.boardHeight / 4 : dims.boardTop + (dims.boardHeight * 3) / 4;

  // Stack from center of each bar half
  const startY = halfMidY - ((visibleCount - 1) / 2) * dims.checkerSpacing;

  const stackAnim = animState.stackAnimations.find((a) => a.point === 'bar');

  for (let i = 0; i < visibleCount; i++) {
    const cy = startY + i * dims.checkerSpacing;
    const isTop = i === visibleCount - 1;
    const showCount = isTop && count > MAX_VISIBLE_STACK;
    const highlight = isSelected && isTop;

    if (isTop && stackAnim) {
      const scale = stackAnimScale(stackAnim);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      drawChecker(ctx, dims, theme, cx, cy, player, highlight);
      ctx.restore();
    } else {
      drawChecker(ctx, dims, theme, cx, cy, player, highlight);
    }

    if (showCount) {
      drawCheckerCountLabel(ctx, dims, cx, cy, count, player);
    }
  }
}

// ─── Bear-off counters ─────────────────────────────────────────────────────────
//
// Progress bar design: thin vertical bar that fills from the outer edge inward.
// Clean and minimal — each player's bar occupies their half of the bear-off strip.
//   ▓▓▓▓░░░░  ← filled / empty segments
//   7          ← count shown as number beside the bar
//
// ─────────────────────────────────────────────────────────────────────────────

function drawBearOffCounters(
  ctx: CanvasRenderingContext2D,
  boardState: BoardState,
  dims: BoardDimensions,
  theme: BoardTheme,
  boardFlipped = false,
): void {
  const cx = boardFlipped ? dims.boardLeft - dims.padding * 0.5 : dims.boardLeft + dims.boardWidth + dims.padding * 0.5;
  drawBearOffProgressBar(ctx, dims, theme, cx, boardState);
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function drawBearOffProgressBar(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  cx: number,
  boardState: BoardState,
): void {
  ctx.save(); // outer save — guarantees no ctx state leaks after this function

  const barW = Math.max(6, Math.round(dims.checkerRadius * 0.55));
  const halfH = dims.boardHeight / 2;
  const margin = dims.boardHeight * 0.05;
  const barH = halfH - margin * 2;
  const cornerR = barW / 2;

  for (const [player, isTop] of [
    ['white', false],
    ['black', true],
  ] as const) {
    const count = player === 'white' ? boardState.borneOff.white : boardState.borneOff.black;
    const style = player === 'white' ? theme.checkers.white : theme.checkers.black;

    const topY = isTop ? dims.boardTop + margin : dims.boardTop + halfH + margin;
    const left = cx - barW / 2;
    const fillH = (count / 15) * barH;

    // Track (empty background)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left, topY, barW, barH, cornerR);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();
    ctx.strokeStyle = style.stroke;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Filled portion — grows from outer edge inward
    if (count > 0) {
      const fillY = isTop ? topY : topY + barH - fillH;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(left, fillY, barW, fillH, cornerR);
      const grad = ctx.createLinearGradient(left, fillY, left + barW, fillY);
      grad.addColorStop(0, style.gradientLight);
      grad.addColorStop(1, style.gradientDark);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    // Count label — black's label sits ABOVE its bar, white's label sits BELOW its bar.
    // isTop=true  → black  → bar occupies top half    → label above the bar top edge
    // isTop=false → white  → bar occupies bottom half → label below the bar bottom edge
    if (count > 0) {
      const offset = dims.boardHeight * 0.015;
      const labelY = isTop
        ? topY - offset            // above the black bar
        : topY + barH + offset;    // below the white bar
      const baseline = isTop ? 'bottom' : 'top';
      const fs = Math.max(6, Math.round(barW * 0.8));
      ctx.save();
      ctx.font = `bold ${fs}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = baseline;
      // Shadow pass
      ctx.fillStyle = 'rgba(0,0,0,0.50)';
      ctx.fillText(String(count), cx + 0.4, labelY + 0.4);
      // Main pass
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = theme.text;
      ctx.fillText(String(count), cx, labelY);
      ctx.restore();
    }
  }

  ctx.restore(); // paired with outer save
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

  // Selection glow — layered effect behind + on top of checker
  if (isSelected) {
    // Wide soft outer halo
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.fillStyle = theme.highlights.selected.replace(/[\d.]+\)$/, '0.28)');
    ctx.fill();

    // Solid inner glow disc (the part visible as a ring around the checker)
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = theme.highlights.selected;
    ctx.fill();
  }

  // Base fill with radial gradient for 3D bevel effect
  // Light comes from top-left, shadow at bottom-right
  const grad = ctx.createRadialGradient(
    cx - r * 0.3,
    cy - r * 0.3,
    r * 0.05, // inner light (offset top-left)
    cx,
    cy,
    r, // outer circle
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
    cx - r * 0.25,
    cy - r * 0.25,
    ringR * 0.1,
    cx - r * 0.1,
    cy - r * 0.1,
    ringR,
  );
  ringGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  ringGrad.addColorStop(0.6, 'rgba(255,255,255,0.10)');
  ringGrad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Crisp selection ring drawn ON TOP for maximum visibility
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = theme.highlights.selected;
    ctx.lineWidth = Math.max(2.5, r * 0.13);
    ctx.stroke();
  }
}

function drawCheckerCountLabel(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  cx: number,
  cy: number,
  count: number,
  player: Player,
): void {
  const fontSize = Math.max(8, Math.round(dims.checkerRadius * 0.75));
  ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Use contrasting colors: light text on dark (black) checkers, dark text on light (white) checkers.
  const isBlack = player === 'black';
  const shadowColor = isBlack ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.60)';
  const textColor   = isBlack ? 'rgba(255,255,255,0.92)' : 'rgba(30,18,6,0.90)';

  ctx.fillStyle = shadowColor;
  ctx.fillText(String(count), cx + 1, cy + 1);

  ctx.fillStyle = textColor;
  ctx.fillText(String(count), cx, cy);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Compute the instantaneous scale factor for a stack pop/push animation.
 *   pop  → 0.82 → 1.0  (remaining stack "settles" after top checker leaves)
 *   push → 1.25 → 1.0  (new top checker "bounces" onto the pile)
 */
function stackAnimScale(anim: import('@/renderer/animationState').StackAnimation): number {
  const t = Math.min(1, (performance.now() - anim.startTime) / anim.duration);
  // Ease-out cubic
  const eased = 1 - Math.pow(1 - t, 3);
  if (anim.type === 'pop') {
    return 0.82 + 0.18 * eased; // 0.82 → 1.0
  }
  return 1.25 - 0.25 * eased; // 1.25 → 1.0
}

// Re-export for convenience so callers don't need to import from dimensions
export { isTopPoint };

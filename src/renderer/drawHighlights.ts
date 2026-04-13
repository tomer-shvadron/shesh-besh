import type { BoardState, MoveTo, Player } from '@/engine/types';
import { getCheckerY, getPointX, isTopPoint } from '@/renderer/dimensions';
import type { BoardDimensions } from '@/renderer/dimensions';
import type { BoardTheme } from '@/renderer/themes/types';
import { clampBearOffX, getBearOffCenterY, getBearOffXRaw } from '@/utils/boardCoordinates';

/**
 * Draw highlight indicators for all valid move destinations.
 *
 * Drawn AFTER static checkers so indicators are always visible:
 *   - Empty point      → filled dot at where the new checker would land
 *   - Friendly stack   → glowing ring outline around the top checker
 *   - Opponent blot    → red/danger glowing ring around the single checker
 *   - Bear-off ('off') → glowing dot in the bear-off tray
 */
export function drawHighlights(
  ctx: CanvasRenderingContext2D,
  validDestinations: MoveTo[],
  dims: BoardDimensions,
  theme: BoardTheme,
  boardState?: BoardState,
  boardFlipped = false,
  currentPlayer: Player = 'white',
  hoveredDestination: MoveTo | null = null,
): void {
  for (const dest of validDestinations) {
    const isHovered = dest === hoveredDestination;
    if (dest === 'off') {
      drawBearOffHighlight(ctx, dims, theme, boardFlipped, currentPlayer, isHovered);
    } else {
      const pt = boardState?.points[dest];
      const existingCount = pt?.count ?? 0;
      const isHit = pt !== undefined && pt !== null && pt.player !== null
        && pt.player !== currentPlayer
        && pt.count === 1;
      drawPointHighlight(ctx, dims, theme, dest, isHit, boardFlipped, existingCount, isHovered);
    }
  }
}

// ─── Per-point highlight ──────────────────────────────────────────────────────

function drawPointHighlight(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  pointIndex: number,
  isHit: boolean,
  boardFlipped: boolean,
  existingCount: number,
  isHovered = false,
): void {
  const cx = getPointX(dims, pointIndex, boardFlipped);
  const color = isHit ? theme.highlights.hit : theme.highlights.valid;

  if (existingCount === 0) {
    // ── Empty point: dot at the outermost checker position ────────────────────
    const cy = getCheckerY(dims, pointIndex, 0);
    const radius = dims.checkerRadius * (isHovered ? 0.52 : 0.42);
    const glowAlpha = isHovered ? Math.min(1, 0.18 * 1.8) : 0.18;

    // Outer glow
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2.0, 0, Math.PI * 2);
    ctx.fillStyle = replaceAlpha(color, glowAlpha);
    ctx.fill();

    // Solid dot
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    // ── Non-empty point: glowing ring over the top checker ────────────────────
    // The top checker sits at the innermost visible stack position.
    const topIdx = Math.min(existingCount - 1, 4);
    const cy = getCheckerY(dims, pointIndex, topIdx);
    const r = dims.checkerRadius;
    const glowAlpha = isHovered ? Math.min(1, 0.20 * 1.8) : 0.20;

    // Wide diffuse glow
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.65, 0, Math.PI * 2);
    ctx.fillStyle = replaceAlpha(color, glowAlpha);
    ctx.fill();

    // Crisp ring outline
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, r * (isHovered ? 0.28 : 0.18));
    ctx.stroke();

    // For a blot (opponent), also draw a small warning dot at top of checker
    if (isHit) {
      const dotR = r * 0.22;
      const dotY = isTopPoint(pointIndex)
        ? cy - r * 0.62
        : cy + r * 0.62;
      ctx.beginPath();
      ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}

// ─── Bear-off highlight ───────────────────────────────────────────────────────

function drawBearOffHighlight(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  boardFlipped: boolean,
  currentPlayer: Player,
  isHovered = false,
): void {
  const radius = dims.checkerRadius * (isHovered ? 0.58 : 0.45);
  const glowRadius = radius * 1.8;
  const color = theme.highlights.valid;

  const cy = getBearOffCenterY(dims);
  const x = clampBearOffX(getBearOffXRaw(dims, boardFlipped), dims, glowRadius, boardFlipped);

  void currentPlayer; // not needed for vertical centering
  drawGlowDot(ctx, x, cy, radius, color);
}

function drawGlowDot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = replaceAlpha(color, 0.25);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// ─── Color utility ────────────────────────────────────────────────────────────

function replaceAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba(')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }
  // Fallback: wrap as rgba if it's not already
  return color;
}

// Re-export used helpers
export { getCheckerY, isTopPoint };

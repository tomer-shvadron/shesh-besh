/**
 * Draw in-flight checker animations on top of the static board.
 * Reads from the animState singleton each frame — no React state involved.
 */

import type { Player } from '@/engine/types';
import { animState } from '@/renderer/animationState';
import type { BoardDimensions } from '@/renderer/dimensions';
import { easeOutCubic, interpolateCheckerMove, interpolateHitToBar } from '@/renderer/drawAnimations';
import type { BoardTheme } from '@/renderer/themes/types';

/**
 * Draw all active checker animations over the board.
 * Should be called after `drawCheckers` so animated pieces appear on top.
 */
export function drawCheckerAnimations(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  now: number,
): void {
  for (const anim of animState.checkerAnimations) {
    const rawProgress = (now - anim.startTime) / anim.duration;
    const progress = Math.min(1, Math.max(0, rawProgress));
    const easedProgress = easeOutCubic(progress);

    const pos =
      anim.type === 'checker-hit'
        ? interpolateHitToBar(anim.fromX, anim.fromY, anim.toX, anim.toY, easedProgress)
        : interpolateCheckerMove(anim.fromX, anim.fromY, anim.toX, anim.toY, easedProgress);

    drawAnimatedChecker(ctx, dims, theme, pos.x, pos.y, anim.checkerPlayer);
  }
}

// ─── Animated checker drawing ─────────────────────────────────────────────────

/**
 * Draw a single animated checker with 3D bevel style.
 * Identical visual style to `drawChecker` in drawCheckers.ts — copied here to
 * avoid creating a circular dependency through the module graph.
 */
function drawAnimatedChecker(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  cx: number,
  cy: number,
  player: Player,
): void {
  const r = dims.checkerRadius;
  const style = player === 'white' ? theme.checkers.white : theme.checkers.black;

  // Slight drop shadow to lift the animated piece above the board visually
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = r * 0.6;
  ctx.shadowOffsetX = r * 0.15;
  ctx.shadowOffsetY = r * 0.2;

  // Base fill with radial gradient for 3D bevel effect
  const grad = ctx.createRadialGradient(
    cx - r * 0.3, cy - r * 0.3, r * 0.05,
    cx, cy, r,
  );
  grad.addColorStop(0, style.gradientLight);
  grad.addColorStop(0.55, style.fill);
  grad.addColorStop(1, style.gradientDark);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();

  // Outer border
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Inner highlight ring
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

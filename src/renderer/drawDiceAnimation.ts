/**
 * Draw dice roll animation in the bar area.
 * While the animation is running, dice faces cycle rapidly through random values.
 * Once the animation completes, static rendering takes over (via renderDiceInBar).
 */

import type { DiceValue } from '@/engine/types';
import { animState } from '@/renderer/animationState';
import type { BoardDimensions } from '@/renderer/dimensions';
import { drawSingleDie } from '@/renderer/drawDice';
import type { BoardTheme } from '@/renderer/themes/types';

/**
 * Draw the dice roll animation in the bar area.
 * Returns true if animation was active (caller should skip static dice rendering).
 */
export function drawDiceAnimation(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  now: number,
): boolean {
  const anim = animState.diceAnimation;
  if (!anim) {
    return false;
  }

  const progress = (now - anim.startTime) / anim.duration;
  if (progress >= 1) {
    // Animation finished — let static rendering handle it
    return false;
  }

  const count = anim.finalValues.length;
  const dieSize = Math.min(dims.barWidth * 0.72, 32);
  const spacing = dieSize * 1.3;
  const totalH = dieSize * count + spacing * (count - 1);
  const barCx = dims.barLeft + dims.barWidth / 2;
  const startY = dims.boardTop + dims.boardHeight / 2 - totalH / 2 + dieSize / 2;

  // Shake offset — decreases as animation progresses
  const shakeAmp = (1 - progress) * dieSize * 0.18;

  for (let i = 0; i < count; i++) {
    // Cycle through faces rapidly: changes every ~80ms
    const faceValue = (Math.floor(now / 80 + i * 2) % 6 + 1) as DiceValue;

    const shakeX = (Math.sin(now / 40 + i * 1.5) * shakeAmp);
    const shakeY = (Math.cos(now / 35 + i * 2.2) * shakeAmp * 0.5);

    const cy = startY + i * spacing + shakeY;
    const cx = barCx + shakeX;

    ctx.save();
    ctx.globalAlpha = 0.85 + 0.15 * progress;
    drawSingleDie(ctx, cx, cy, dieSize, faceValue, theme, false);
    ctx.restore();
  }

  return true;
}

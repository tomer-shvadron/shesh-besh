import type { BoardState, DiceRoll, DiceValue, MoveFrom, Player } from '@/engine/types';
import type { BoardDimensions } from '@/renderer/dimensions';
import { getCheckerY, getPointX } from '@/renderer/dimensions';
import { drawSingleDie } from '@/renderer/drawDice';
import type { BoardTheme } from '@/renderer/themes/types';

/**
 * Draw a pulsing yellow halo under a playable source checker the pointer is
 * hovering over, so the user can see which piece they're about to pick up.
 */
export function drawSourceHoverHighlight(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  _theme: BoardTheme,
  point: MoveFrom,
  displayBoard: BoardState,
  flipped: boolean,
  currentPlayer: Player,
  now: number,
): void {
  const r = dims.checkerRadius;
  // Slow gentle pulse: alpha between 0.18 and 0.40
  const pulse = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(now / 500));

  let cx: number;
  let cy: number;

  if (point === 'bar') {
    cx = dims.barLeft + dims.barWidth / 2;
    const isTopHalf = currentPlayer === 'black';
    const halfMidY = isTopHalf ? dims.boardTop + dims.boardHeight / 4 : dims.boardTop + (dims.boardHeight * 3) / 4;
    const barCount = currentPlayer === 'white' ? displayBoard.bar.white : displayBoard.bar.black;
    const visibleCount = Math.min(Math.max(barCount, 1), 5);
    const startY = halfMidY - ((visibleCount - 1) / 2) * dims.checkerSpacing;
    cy = startY + (visibleCount - 1) * dims.checkerSpacing;
  } else {
    cx = getPointX(dims, point, flipped);
    const count = displayBoard.points[point]?.count ?? 1;
    cy = getCheckerY(dims, point, Math.min(count - 1, 4));
  }

  // Wide diffuse outer halo
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 220, 50, ${(pulse * 0.55).toFixed(3)})`;
  ctx.fill();

  // Crisp pulsing ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 220, 50, ${(pulse * 2.2).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.stroke();
}

/**
 * Render the floating checker that follows the pointer during an active drag.
 * Drawn with a soft shadow and highlight ring to suggest lift above the board.
 */
export function drawDraggedCheckerAtPosition(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  cx: number,
  cy: number,
  player: Player,
): void {
  const r = dims.checkerRadius;
  const style = player === 'white' ? theme.checkers.white : theme.checkers.black;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = r * 1.2;
  ctx.shadowOffsetX = r * 0.1;
  ctx.shadowOffsetY = r * 0.25;
  ctx.globalAlpha = 0.93;

  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r);
  grad.addColorStop(0, style.gradientLight);
  grad.addColorStop(0.55, style.fill);
  grad.addColorStop(1, style.gradientDark);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

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
}

/**
 * Draw three vertically-stacked pulsing dots in the bar center to signal AI is computing.
 */
export function drawAiThinkingDots(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  _theme: BoardTheme,
  now: number,
): void {
  const barCx = dims.barLeft + dims.barWidth / 2;
  const dotR = Math.max(3, dims.barWidth * 0.14);
  const gap = dotR * 2.8;
  const centerY = dims.boardTop + dims.boardHeight / 2;

  for (let i = 0; i < 3; i++) {
    // Stagger the bounce wave for each dot (wave period = 900ms)
    const phase = (now / 900 + i / 3) % 1;
    const bounce = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5; // 0..1
    const alpha = 0.3 + 0.7 * bounce;
    const r = dotR * (0.65 + 0.35 * bounce);

    const cy = centerY + (i - 1) * gap;
    ctx.beginPath();
    ctx.arc(barCx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 191, 36, ${alpha.toFixed(2)})`; // amber-400
    ctx.fill();
  }
}

/**
 * Draw a centered banner announcing the opening-roll winner and the two die values.
 */
export function drawOpeningRollBanner(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  openingRolls: { white: DiceValue | null; black: DiceValue | null },
  winner: Player,
): void {
  const { white: whiteRoll, black: blackRoll } = openingRolls;
  if (whiteRoll === null || blackRoll === null) {
    return;
  }

  const cx = dims.boardLeft + dims.boardWidth / 2;
  const cy = dims.boardTop + dims.boardHeight / 2;
  const bannerW = dims.boardWidth * 0.55;
  const bannerH = dims.boardHeight * 0.22;
  const r = 12;

  // Semi-transparent backdrop
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - bannerW / 2, cy - bannerH / 2, bannerW, bannerH, r);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fill();
  ctx.strokeStyle = theme.highlights.valid;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Winner label
  const winnerLabel = winner === 'white' ? 'White' : 'Black';
  ctx.save();
  ctx.font = `bold ${Math.round(dims.boardHeight * 0.048)}px system-ui, sans-serif`;
  ctx.fillStyle = theme.highlights.valid;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${winnerLabel} goes first!`, cx, cy - bannerH * 0.18);

  // Roll values
  ctx.font = `${Math.round(dims.boardHeight * 0.036)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`White: ${whiteRoll}  ·  Black: ${blackRoll}`, cx, cy + bannerH * 0.22);
  ctx.restore();
}

/**
 * Animated roll invitation: a die face that cycles through values with a pulsing
 * amber glow ring, replacing the old ugly vertical "ROLL" text.
 */
export function drawRollHint(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  now: number,
): void {
  const barCx = dims.barLeft + dims.barWidth / 2;
  const cy = dims.boardTop + dims.boardHeight / 2;
  const dieSize = Math.min(dims.barWidth * 0.82, 36);

  // Cycle through die values every 480ms
  const dieValue = ((Math.floor(now / 480) % 6) + 1) as DiceValue;

  // Slow gentle pulse
  const pulse = 0.5 + 0.5 * Math.sin(now / 700);

  // Diffuse outer glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(barCx, cy, dieSize * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(251,191,36,${(0.06 + 0.1 * pulse).toFixed(3)})`;
  ctx.fill();
  ctx.restore();

  // Die face — slightly pulsing opacity to invite interaction
  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  drawSingleDie(ctx, barCx, cy, dieSize, dieValue, theme, false);
  ctx.restore();

  // "ROLL" label below the die — bright white for max contrast against wood
  // Position is dieSize/2 (bottom edge of die) + dieSize*0.75 (gap) below center
  const labelY = cy + dieSize * 0.5 + dieSize * 0.75;
  const fontSize = Math.max(11, Math.round(dims.barWidth * 0.3));
  ctx.save();
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = `rgba(255,255,255,${(0.65 + 0.3 * pulse).toFixed(3)})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Subtle text shadow for legibility on both light and dark wood
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('ROLL', barCx, labelY);
  ctx.restore();
}

/**
 * Always shows exactly 2 dice (the original rolled values).
 * Used dice render grayed in-place instead of disappearing.
 * Doubles get a remaining-moves badge (×4 → ×3 → ×2 → ×1) instead of 4 separate dice.
 */
export function renderDiceInBar(
  ctx: CanvasRenderingContext2D,
  rolledDice: DiceRoll,
  remainingDice: DiceValue[],
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  const barCx = dims.barLeft + dims.barWidth / 2;
  const boardCy = dims.boardTop + dims.boardHeight / 2;
  const dieSize = Math.min(dims.barWidth * 0.88, 42);
  const spacing = dieSize * 1.55;

  const [rollA, rollB] = rolledDice;
  const isDoubles = rollA === rollB;

  // Position: 2 dice centered vertically
  const totalH = dieSize + spacing;
  const topDieY = boardCy - totalH / 2 + dieSize / 2;
  const botDieY = topDieY + spacing;

  if (isDoubles) {
    // Both dice show same value; gray them out only when all 4 moves consumed
    const allUsed = remainingDice.length === 0;
    drawSingleDie(ctx, barCx, topDieY, dieSize, rollA, theme, allUsed);
    drawSingleDie(ctx, barCx, botDieY, dieSize, rollB, theme, allUsed);

    // Remaining-moves badge
    const badgeCount = remainingDice.length; // 4 → 3 → 2 → 1 → 0
    if (badgeCount > 0) {
      const badgeY = botDieY + dieSize * 0.72;
      const fontSize = Math.max(9, Math.round(dieSize * 0.3));

      // Badge background pill
      const badgeW = dieSize * 0.72;
      const badgeH = fontSize * 1.6;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(barCx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, badgeH / 2);
      ctx.fillStyle = 'rgba(251,191,36,0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Badge text
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(251,191,36,0.90)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`×${badgeCount}`, barCx, badgeY);
    }
    return;
  }

  // Regular roll: determine which die has been used by diff against remainingDice
  const rem = [...remainingDice]; // mutable copy
  const aUsed = !consumeFromArr(rem, rollA);
  const bUsed = !consumeFromArr(rem, rollB);

  drawSingleDie(ctx, barCx, topDieY, dieSize, rollA, theme, aUsed);
  drawSingleDie(ctx, barCx, botDieY, dieSize, rollB, theme, bUsed);
}

/** Remove the first occurrence of `value` from `arr` in-place. Returns true if found. */
function consumeFromArr(arr: DiceValue[], value: DiceValue): boolean {
  const idx = arr.indexOf(value);
  if (idx === -1) {
    return false;
  }
  arr.splice(idx, 1);
  return true;
}

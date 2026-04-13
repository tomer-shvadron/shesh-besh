import type { DiceValue } from '@/engine/types';
import type { BoardTheme } from '@/renderer/themes/types';
import { DICE_FACES } from '@/utils/dicePatterns';

export interface DiceDisplayState {
  values: DiceValue[];   // current remaining dice values
  usedCount: number;     // how many have been used (show as grayed)
}

/**
 * Draw a single die at (x, y) center with a given size.
 * Renders a rounded-rectangle die face with standard pip layout and 3D appearance.
 *
 * @param ctx    - Canvas 2D context
 * @param dice   - remaining dice values to display (used only when used=false)
 * @param x      - center x of die
 * @param y      - center y of die
 * @param size   - total width/height of the die square
 * @param theme  - current board theme
 * @param used   - if true, render the die as grayed out (already consumed)
 */
export function drawDice(
  ctx: CanvasRenderingContext2D,
  dice: DiceValue[],
  x: number,
  y: number,
  size: number,
  theme: BoardTheme,
  used = false,
): void {
  if (dice.length === 0) {
    return;
  }

  const value = dice[0];
  if (value === undefined) {
    return;
  }

  drawSingleDie(ctx, x, y, size, value, theme, used);
}

/**
 * Draw a single die face centered at (cx, cy).
 */
export function drawSingleDie(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  value: DiceValue,
  theme: BoardTheme,
  used = false,
): void {
  const half = size / 2;
  const left = cx - half;
  const top = cy - half;
  const cornerRadius = size * 0.16;

  const bg = used ? theme.dice.usedBg : theme.dice.bg;
  const pipColor = used ? theme.dice.usedPips : theme.dice.pips;

  // ── 3D shadow ────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetX = size * 0.04;
  ctx.shadowOffsetY = size * 0.06;

  // ── Die body ─────────────────────────────────────────────────────────────────
  const bodyGrad = ctx.createLinearGradient(left, top, left + size, top + size);
  bodyGrad.addColorStop(0, lightenColor(bg, 20));
  bodyGrad.addColorStop(1, darkenColor(bg, 15));

  ctx.fillStyle = bodyGrad;
  roundedRect(ctx, left, top, size, size, cornerRadius);
  ctx.fill();
  ctx.restore();

  // ── Border ───────────────────────────────────────────────────────────────────
  ctx.strokeStyle = used ? darkenColor(theme.dice.border, 20) : theme.dice.border;
  ctx.lineWidth = Math.max(1, size * 0.04);
  roundedRect(ctx, left, top, size, size, cornerRadius);
  ctx.stroke();

  // ── Top-left bevel highlight ─────────────────────────────────────────────────
  if (!used) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.moveTo(left + cornerRadius, top + size * 0.07);
    ctx.lineTo(left + size - cornerRadius, top + size * 0.07);
    ctx.stroke();
    ctx.restore();
  }

  // ── Pips ─────────────────────────────────────────────────────────────────────
  drawPips(ctx, cx, cy, size, value, pipColor);
}

// ─── Pip layout ────────────────────────────────────────────────────────────────

function drawPips(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  value: DiceValue,
  pipColor: string,
): void {
  const positions = DICE_FACES[value];
  // Previous magic number: 0.28 × (size × 0.58). Keep the same on-screen
  // result by combining them into a single per-unit scale.
  const scale = size * 0.28 * 0.58;
  const pipRadius = Math.max(1.5, size * 0.08);

  for (const [fx, fy] of positions) {
    const px = cx + fx * scale;
    const py = cy + fy * scale;

    // Pip shadow
    ctx.beginPath();
    ctx.arc(px + pipRadius * 0.3, py + pipRadius * 0.3, pipRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.fill();

    // Pip body
    ctx.beginPath();
    ctx.arc(px, py, pipRadius, 0, Math.PI * 2);
    ctx.fillStyle = pipColor;
    ctx.fill();
  }
}

// ─── Rounded rect helper ───────────────────────────────────────────────────────

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Color utilities ───────────────────────────────────────────────────────────

function lightenColor(hex: string, amount: number): string {
  return adjustHexColor(hex, amount);
}

function darkenColor(hex: string, amount: number): string {
  return adjustHexColor(hex, -amount);
}

function adjustHexColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
  const num = parseInt(expanded, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

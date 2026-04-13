/**
 * Central animation state manager — module-level singleton, NOT React state.
 * The RAF game loop reads this directly each frame to avoid triggering re-renders.
 */

import type { DiceValue, MoveFrom, MoveTo, Player } from '@/engine/types';
import type { BoardDimensions } from '@/renderer/dimensions';
import { getCheckerY, getPointX, isTopPoint } from '@/renderer/dimensions';
import { clampBearOffX, getBearOffCenterY, getBearOffXRaw } from '@/utils/boardCoordinates';

export type AnimationType = 'checker-move' | 'checker-hit' | 'dice-roll' | 'win';

export interface CheckerAnimation {
  type: 'checker-move' | 'checker-hit';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  checkerPlayer: Player;
}

export interface DiceAnimation {
  type: 'dice-roll';
  startTime: number;
  duration: number;
  finalValues: DiceValue[];
}

export interface StackAnimation {
  type: 'pop' | 'push'; // pop = checker left (remaining stack settles), push = checker arrived
  point: number | 'bar';
  startTime: number;
  duration: number;
}

export interface AnimationState {
  checkerAnimations: CheckerAnimation[];
  diceAnimation: DiceAnimation | null;
  winCelebration: boolean;
  stackAnimations: StackAnimation[];
}

// ── Singleton ──────────────────────────────────────────────────────────────────

export const animState: AnimationState = {
  checkerAnimations: [],
  diceAnimation: null,
  winCelebration: false,
  stackAnimations: [],
};

// ── Query ──────────────────────────────────────────────────────────────────────

export function isAnimating(): boolean {
  return (
    animState.checkerAnimations.length > 0 ||
    animState.diceAnimation !== null ||
    animState.winCelebration
  );
}

// ── Checker animation ──────────────────────────────────────────────────────────

/**
 * Compute the pixel coordinates for a MoveFrom position.
 * 'bar' is the center of the bar. Point indices use the top checker position.
 */
function fromCoords(
  from: MoveFrom,
  dims: BoardDimensions,
  player: Player,
  count: number,
  boardFlipped: boolean,
): { x: number; y: number } {
  if (from === 'bar') {
    const barCx = dims.barLeft + dims.barWidth / 2;
    const isTop = player === 'black';
    const halfMidY = isTop
      ? dims.boardTop + dims.boardHeight / 4
      : dims.boardTop + (dims.boardHeight * 3) / 4;
    // Top checker in the bar stack (count - 1 position, clamped at 4)
    const visibleIdx = Math.min(count - 1, 4);
    const startY = halfMidY - ((Math.min(count, 5) - 1) / 2) * dims.checkerSpacing;
    return { x: barCx, y: startY + visibleIdx * dims.checkerSpacing };
  }
  const cx = getPointX(dims, from, boardFlipped);
  // The top checker of the stack is the one being moved
  const checkerIdx = Math.min(count - 1, 4);
  return { x: cx, y: getCheckerY(dims, from, checkerIdx) };
}

/**
 * Compute the pixel coordinates for a MoveTo position.
 * 'off' lands just outside the board in the bear-off area.
 * Point indices place the new top of stack.
 */
function toCoords(
  to: MoveTo,
  dims: BoardDimensions,
  player: Player,
  countAfter: number,
  boardFlipped: boolean,
): { x: number; y: number } {
  if (to === 'off') {
    // Land exactly on the bear-off highlight dot (vertically centered, x clamped to canvas).
    // Must match the position computed in drawBearOffHighlight in drawHighlights.ts.
    const glowR = dims.checkerRadius * 0.81; // 0.45 (base radius) × 1.8 (glow multiplier)
    const x = clampBearOffX(getBearOffXRaw(dims, boardFlipped), dims, glowR, boardFlipped);
    const y = getBearOffCenterY(dims);
    void player; // player isn't used for y-position (centered for both)
    return { x, y };
  }
  const cx = getPointX(dims, to, boardFlipped);
  const cy = getCheckerY(dims, to, Math.min(countAfter, 4));
  return { x: cx, y: cy };
}

/**
 * Start a checker move animation.
 * `fromCount` is the number of checkers at the source BEFORE the move.
 * `toCount` is the number of checkers at the destination AFTER the move (including the moved one).
 * `isHit` indicates whether an opponent's checker was hit.
 * `skipMain` — when true, skips the main checker-move arc (e.g. after a drag-drop where the
 *   checker already appears at the destination). Hit animations are still played.
 */
export function startCheckerMove(
  from: MoveFrom,
  to: MoveTo,
  dims: BoardDimensions,
  player: Player,
  isHit: boolean,
  fromCount = 1,
  toCount = 1,
  boardFlipped = false,
  skipMain = false,
): void {
  const dst = toCoords(to, dims, player, toCount, boardFlipped);
  const now = performance.now();

  if (!skipMain) {
    // Animate the current player's checker moving from source to destination (normal arc)
    const src = fromCoords(from, dims, player, fromCount, boardFlipped);
    animState.checkerAnimations.push({
      type: 'checker-move',
      fromX: src.x,
      fromY: src.y,
      toX: dst.x,
      toY: dst.y,
      startTime: now,
      duration: 300,
      checkerPlayer: player,
    });
  }

  // For hits: also animate the opponent's blot flying to bar (dramatic high arc)
  if (isHit && to !== 'off') {
    const opponent: Player = player === 'white' ? 'black' : 'white';
    const bar = getBarLandingCoords(dims, player);
    animState.checkerAnimations.push({
      type: 'checker-hit',
      fromX: dst.x,
      fromY: dst.y,
      toX: bar.x,
      toY: bar.y,
      startTime: now,
      duration: 400,
      checkerPlayer: opponent,
    });
  }
}

// ── Drag return animation ──────────────────────────────────────────────────────

/**
 * Animate a dragged checker flying back to its original board position.
 */
export function startDragReturn(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  player: Player,
): void {
  animState.checkerAnimations.push({
    type: 'checker-move',
    fromX,
    fromY,
    toX,
    toY,
    startTime: performance.now(),
    duration: 250,
    checkerPlayer: player,
  });
}

// ── Dice animation ─────────────────────────────────────────────────────────────

export function startDiceRoll(finalValues: DiceValue[]): void {
  animState.diceAnimation = {
    type: 'dice-roll',
    startTime: performance.now(),
    duration: 500,
    finalValues,
  };
}

// ── Win celebration ────────────────────────────────────────────────────────────

export function startWinCelebration(): void {
  animState.winCelebration = true;
}

export function clearWinCelebration(): void {
  animState.winCelebration = false;
}

// ── Stack animations ───────────────────────────────────────────────────────────

/**
 * Look up the in-flight stack animation for a given point (or the bar), if any.
 * Used by the checker drawer to scale/settle the stack top during push/pop.
 */
export function getStackAnimation(point: number | 'bar'): StackAnimation | undefined {
  return animState.stackAnimations.find((a) => a.point === point);
}

/**
 * Animate the remaining stack when a checker leaves (it "settles" inward, scale 0.82→1).
 */
export function startStackPop(point: number | 'bar'): void {
  animState.stackAnimations = animState.stackAnimations.filter((a) => a.point !== point);
  animState.stackAnimations.push({ type: 'pop', point, startTime: performance.now(), duration: 320 });
}

/**
 * Animate the new top checker when a checker arrives (it "bounces" on, scale 1.25→1).
 */
export function startStackPush(point: number | 'off'): void {
  if (point === 'off') { return; } // bear-off tray has no stack animation
  animState.stackAnimations = animState.stackAnimations.filter((a) => a.point !== point);
  animState.stackAnimations.push({ type: 'push', point, startTime: performance.now(), duration: 260 });
}

// ── Clear all (call on new game) ───────────────────────────────────────────────

export function clearAllAnimations(): void {
  animState.checkerAnimations = [];
  animState.diceAnimation = null;
  animState.winCelebration = false;
  animState.stackAnimations = [];
}

// ── Tick (remove finished animations) ─────────────────────────────────────────

export function tickAnimations(now: number): void {
  animState.checkerAnimations = animState.checkerAnimations.filter((anim) => {
    return now - anim.startTime < anim.duration;
  });

  if (
    animState.diceAnimation !== null &&
    now - animState.diceAnimation.startTime >= animState.diceAnimation.duration
  ) {
    animState.diceAnimation = null;
  }

  animState.stackAnimations = animState.stackAnimations.filter(
    (a) => now - a.startTime < a.duration,
  );
}

// ── Bar landing coords (used by drawCheckerAnimation) ─────────────────────────

/**
 * Get bar landing position for a hit checker (goes to opponent's bar area).
 */
export function getBarLandingCoords(
  dims: BoardDimensions,
  hittingPlayer: Player,
): { x: number; y: number } {
  // The hit checker belongs to the opponent
  const hitPlayer: Player = hittingPlayer === 'white' ? 'black' : 'white';
  const barCx = dims.barLeft + dims.barWidth / 2;
  const isTop = hitPlayer === 'black';
  const barY = isTop
    ? dims.boardTop + dims.boardHeight / 4
    : dims.boardTop + (dims.boardHeight * 3) / 4;
  return { x: barCx, y: barY };
}

// Re-export helpers used by other animation modules
export { getPointX, getCheckerY, isTopPoint };

/**
 * Central animation state manager — module-level singleton, NOT React state.
 * The RAF game loop reads this directly each frame to avoid triggering re-renders.
 */

import type { DiceValue, MoveFrom, MoveTo, Player } from '@/engine/types';
import type { BoardDimensions } from '@/renderer/dimensions';
import { getCheckerY, getPointX, isTopPoint } from '@/renderer/dimensions';

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

export interface AnimationState {
  checkerAnimations: CheckerAnimation[];
  diceAnimation: DiceAnimation | null;
  winCelebration: boolean;
}

// ── Singleton ──────────────────────────────────────────────────────────────────

export const animState: AnimationState = {
  checkerAnimations: [],
  diceAnimation: null,
  winCelebration: false,
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
  const cx = getPointX(dims, from);
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
): { x: number; y: number } {
  if (to === 'off') {
    // Bear-off area: right edge of board
    const x = dims.boardLeft + dims.boardWidth + dims.padding * 0.5;
    const y = player === 'white'
      ? dims.boardTop + dims.boardHeight * 0.85
      : dims.boardTop + dims.boardHeight * 0.15;
    return { x, y };
  }
  const cx = getPointX(dims, to);
  const cy = getCheckerY(dims, to, Math.min(countAfter, 4));
  return { x: cx, y: cy };
}

/**
 * Start a checker move animation.
 * `fromCount` is the number of checkers at the source BEFORE the move.
 * `toCount` is the number of checkers at the destination AFTER the move (including the moved one).
 * `isHit` indicates whether an opponent's checker was hit.
 */
export function startCheckerMove(
  from: MoveFrom,
  to: MoveTo,
  dims: BoardDimensions,
  player: Player,
  isHit: boolean,
  fromCount = 1,
  toCount = 1,
): void {
  const src = fromCoords(from, dims, player, fromCount);
  const dst = toCoords(to, dims, player, toCount);
  const now = performance.now();

  const anim: CheckerAnimation = {
    type: isHit ? 'checker-hit' : 'checker-move',
    fromX: src.x,
    fromY: src.y,
    toX: dst.x,
    toY: dst.y,
    startTime: now,
    duration: isHit ? 400 : 300,
    checkerPlayer: player,
  };

  animState.checkerAnimations.push(anim);
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

// ── Clear all (call on new game) ───────────────────────────────────────────────

export function clearAllAnimations(): void {
  animState.checkerAnimations = [];
  animState.diceAnimation = null;
  animState.winCelebration = false;
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

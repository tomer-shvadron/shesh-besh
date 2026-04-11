/**
 * Pure interpolation functions for checker move animations.
 * These are stateless — the caller (game loop) tracks progress (0→1) externally.
 * All functions return pixel coordinates given a progress value.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Interpolate a checker moving from source to destination along a slight arc.
 * Uses a quadratic bezier with a control point lifted above the midpoint for a
 * natural "hop" feel when moving across the board.
 *
 * @param fromX    - start pixel x
 * @param fromY    - start pixel y
 * @param toX      - end pixel x
 * @param toY      - end pixel y
 * @param progress - animation progress 0→1 (apply easing before passing in)
 */
export function interpolateCheckerMove(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  progress: number,
): Point2D {
  // Quadratic bezier control point: midpoint lifted upward (smaller y = higher on screen)
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const dist = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
  const liftAmount = Math.min(dist * 0.25, 60); // cap lift to avoid wild arcs

  const cpX = midX;
  const cpY = midY - liftAmount;

  // Quadratic bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * CP + t^2 * P1
  const t = progress;
  const mt = 1 - t;
  return {
    x: mt * mt * fromX + 2 * mt * t * cpX + t * t * toX,
    y: mt * mt * fromY + 2 * mt * t * cpY + t * t * toY,
  };
}

/**
 * Interpolate a hit checker moving to the bar.
 * Uses a higher arc than a normal move to signal the dramatic "sending to bar" moment.
 *
 * @param fromX    - start pixel x (checker being hit)
 * @param fromY    - start pixel y
 * @param barX     - bar center x
 * @param barY     - bar landing y (bar center for that player's side)
 * @param progress - animation progress 0→1
 */
export function interpolateHitToBar(
  fromX: number,
  fromY: number,
  barX: number,
  barY: number,
  progress: number,
): Point2D {
  // Taller arc: control point is well above both endpoints
  const midX = (fromX + barX) / 2;
  const minY = Math.min(fromY, barY);
  const dist = Math.sqrt((barX - fromX) ** 2 + (barY - fromY) ** 2);
  const lift = Math.min(dist * 0.4, 80);

  const cpX = midX;
  const cpY = minY - lift;

  const t = progress;
  const mt = 1 - t;
  return {
    x: mt * mt * fromX + 2 * mt * t * cpX + t * t * barX,
    y: mt * mt * fromY + 2 * mt * t * cpY + t * t * barY,
  };
}

/**
 * Ease-out cubic: fast start, decelerates toward the end.
 * Suitable for checker landing animations.
 *
 * @param t - linear progress 0→1
 * @returns eased progress 0→1
 */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/**
 * Ease-in-out (smoothstep): slow start, fast middle, slow end.
 * Suitable for piece sliding animations.
 *
 * @param t - linear progress 0→1
 * @returns eased progress 0→1
 */
export function easeInOut(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Ease-in cubic: slow start, accelerates. Good for "picked up" feel.
 *
 * @param t - linear progress 0→1
 * @returns eased progress 0→1
 */
export function easeInCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped ** 3;
}

/**
 * Bounce ease-out: checker "bounces" slightly on landing.
 *
 * @param t - linear progress 0→1
 * @returns eased progress 0→1
 */
export function easeOutBounce(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const n1 = 7.5625;
  const d1 = 2.75;

  if (clamped < 1 / d1) {
    return n1 * clamped * clamped;
  } else if (clamped < 2 / d1) {
    const adjusted = clamped - 1.5 / d1;
    return n1 * adjusted * adjusted + 0.75;
  } else if (clamped < 2.5 / d1) {
    const adjusted = clamped - 2.25 / d1;
    return n1 * adjusted * adjusted + 0.9375;
  } else {
    const adjusted = clamped - 2.625 / d1;
    return n1 * adjusted * adjusted + 0.984375;
  }
}

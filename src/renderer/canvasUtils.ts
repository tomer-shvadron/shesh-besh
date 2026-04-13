/**
 * Small helpers that encapsulate repeated canvas boilerplate so drawing
 * functions can stay focused on what they paint rather than on save/restore
 * bookkeeping.
 */

/**
 * Run `fn` with `ctx.save()` / `ctx.restore()` around it. Guarantees the
 * context state is restored even if `fn` throws.
 */
export function withSavedCtx(ctx: CanvasRenderingContext2D, fn: () => void): void {
  ctx.save();
  try {
    fn();
  } finally {
    ctx.restore();
  }
}

/**
 * Build a linear gradient from a list of `[offset, color]` stops.
 * Thin wrapper over the native API that avoids four lines of imperative
 * `createLinearGradient` + `addColorStop` noise at each call site.
 */
export function makeLinearGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: readonly (readonly [number, string])[],
): CanvasGradient {
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of stops) {
    grad.addColorStop(offset, color);
  }
  return grad;
}

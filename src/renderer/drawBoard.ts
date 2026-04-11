import type { BoardDimensions } from '@/renderer/dimensions';
import type { BoardTheme } from '@/renderer/themes/types';

/**
 * Draw the static backgammon board: frame, felt surface, triangles, bar, and bear-off areas.
 * This should be called once per frame before drawing checkers/highlights/dice.
 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  drawFrame(ctx, dims, theme);
  drawPlayingSurface(ctx, dims, theme);
  drawTriangles(ctx, dims, theme);
  drawBar(ctx, dims, theme);
  drawBearOffAreas(ctx, dims, theme);
  drawPointLabels(ctx, dims, theme);
}

// ─── Internal drawing helpers ─────────────────────────────────────────────────

function drawFrame(ctx: CanvasRenderingContext2D, dims: BoardDimensions, theme: BoardTheme): void {
  // Outer frame with a subtle grain-like gradient
  const grad = ctx.createLinearGradient(0, 0, dims.width, dims.height);
  grad.addColorStop(0, lighten(theme.board.frame, 15));
  grad.addColorStop(0.5, theme.board.frame);
  grad.addColorStop(1, darken(theme.board.frame, 10));

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dims.width, dims.height);

  // Inner bevel — subtle dark inner shadow around the playing surface
  const bevelSize = Math.max(2, dims.padding * 0.2);
  ctx.strokeStyle = darken(theme.board.frame, 20);
  ctx.lineWidth = bevelSize;
  ctx.strokeRect(
    dims.boardLeft - bevelSize / 2,
    dims.boardTop - bevelSize / 2,
    dims.boardWidth + bevelSize,
    dims.boardHeight + bevelSize,
  );
}

function drawPlayingSurface(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  // Felt-like gradient for the playing surface
  const grad = ctx.createRadialGradient(
    dims.boardLeft + dims.boardWidth / 2,
    dims.boardTop + dims.boardHeight / 2,
    dims.boardWidth * 0.1,
    dims.boardLeft + dims.boardWidth / 2,
    dims.boardTop + dims.boardHeight / 2,
    dims.boardWidth * 0.75,
  );
  grad.addColorStop(0, lighten(theme.board.surface, 8));
  grad.addColorStop(1, darken(theme.board.surface, 8));

  ctx.fillStyle = grad;
  ctx.fillRect(dims.boardLeft, dims.boardTop, dims.boardWidth, dims.boardHeight);
}

function drawTriangles(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  // Draw all 24 triangles: 12 on top (pointing down), 12 on bottom (pointing up).
  //
  // Visual layout:
  //  Top    left half:  col 0-5  → points 12-17
  //  Top    right half: col 0-5  → points 18-23
  //  Bottom left half:  col 0-5  → points 11-6
  //  Bottom right half: col 0-5  → points 5-0

  for (let pointIndex = 0; pointIndex < 24; pointIndex++) {
    const col = getColumnForPoint(pointIndex);
    const isRight = pointIndex >= 18 || pointIndex <= 5;
    const isTop = pointIndex >= 12;

    const halfLeft = isRight ? dims.rightHalfLeft : dims.leftHalfLeft;
    const baseX = halfLeft + col * dims.triWidth;

    // Alternate colors: even column = dark, odd column = light (per half)
    const color = col % 2 === 0 ? theme.triangles.dark : theme.triangles.light;

    const triGrad = ctx.createLinearGradient(
      baseX + dims.triWidth / 2,
      isTop ? dims.boardTop : dims.boardTop + dims.boardHeight,
      baseX + dims.triWidth / 2,
      isTop ? dims.boardTop + dims.triHeight : dims.boardTop + dims.boardHeight - dims.triHeight,
    );
    triGrad.addColorStop(0, color);
    triGrad.addColorStop(1, transparentize(color, 0.7));

    ctx.fillStyle = triGrad;
    ctx.beginPath();

    if (isTop) {
      // Top triangle: base at top, apex pointing downward
      ctx.moveTo(baseX, dims.boardTop);
      ctx.lineTo(baseX + dims.triWidth, dims.boardTop);
      ctx.lineTo(baseX + dims.triWidth / 2, dims.boardTop + dims.triHeight);
    } else {
      // Bottom triangle: base at bottom, apex pointing upward
      ctx.moveTo(baseX, dims.boardTop + dims.boardHeight);
      ctx.lineTo(baseX + dims.triWidth, dims.boardTop + dims.boardHeight);
      ctx.lineTo(baseX + dims.triWidth / 2, dims.boardTop + dims.boardHeight - dims.triHeight);
    }

    ctx.closePath();
    ctx.fill();

    // Subtle stroke to give triangles crisp edges
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  // Bar gradient — slightly lighter in center to simulate wood highlight
  const grad = ctx.createLinearGradient(dims.barLeft, 0, dims.barLeft + dims.barWidth, 0);
  grad.addColorStop(0, darken(theme.board.bar, 5));
  grad.addColorStop(0.4, lighten(theme.board.bar, 10));
  grad.addColorStop(0.6, lighten(theme.board.bar, 10));
  grad.addColorStop(1, darken(theme.board.bar, 5));

  ctx.fillStyle = grad;
  ctx.fillRect(dims.barLeft, dims.boardTop, dims.barWidth, dims.boardHeight);

  // Thin inner edge lines on bar
  ctx.strokeStyle = darken(theme.board.bar, 25);
  ctx.lineWidth = 1;
  ctx.strokeRect(dims.barLeft, dims.boardTop, dims.barWidth, dims.boardHeight);
}

function drawBearOffAreas(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  // Bear-off areas are indicated by subtle bracket marks on the right edge of the frame
  // (right side = white bears off, traditionally; but we show both sides for clarity)

  const labelSize = Math.max(7, dims.padding * 0.45);
  const rightEdgeX = dims.boardLeft + dims.boardWidth + dims.padding * 0.25;
  const centerX = rightEdgeX + dims.padding * 0.35;

  ctx.font = `bold ${labelSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.bearOffLabel;

  // White bear-off indicator (bottom-right quadrant of frame)
  const whiteLabelY = dims.boardTop + dims.boardHeight * 0.75;
  ctx.fillText('W', centerX, whiteLabelY);

  // Black bear-off indicator (top-right quadrant of frame)
  const blackLabelY = dims.boardTop + dims.boardHeight * 0.25;
  ctx.fillText('B', centerX, blackLabelY);

  // Draw a short vertical bracket on the right side of the frame for each half
  const bracketX = dims.boardLeft + dims.boardWidth + 2;
  const bracketW = dims.padding * 0.18;
  ctx.strokeStyle = theme.bearOffLabel;
  ctx.lineWidth = 1.5;

  // White bracket (bottom half)
  ctx.beginPath();
  ctx.moveTo(bracketX, dims.boardTop + dims.boardHeight / 2 + 4);
  ctx.lineTo(bracketX + bracketW, dims.boardTop + dims.boardHeight / 2 + 4);
  ctx.lineTo(bracketX + bracketW, dims.boardTop + dims.boardHeight - 2);
  ctx.lineTo(bracketX, dims.boardTop + dims.boardHeight - 2);
  ctx.stroke();

  // Black bracket (top half)
  ctx.beginPath();
  ctx.moveTo(bracketX, dims.boardTop + 2);
  ctx.lineTo(bracketX + bracketW, dims.boardTop + 2);
  ctx.lineTo(bracketX + bracketW, dims.boardTop + dims.boardHeight / 2 - 4);
  ctx.lineTo(bracketX, dims.boardTop + dims.boardHeight / 2 - 4);
  ctx.stroke();
}

function drawPointLabels(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  const fontSize = Math.max(7, Math.round(dims.triWidth * 0.26));
  ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.bearOffLabel;

  for (let pointIndex = 0; pointIndex < 24; pointIndex++) {
    const col = getColumnForPoint(pointIndex);
    const isRight = pointIndex >= 18 || pointIndex <= 5;
    const isTop = pointIndex >= 12;
    const halfLeft = isRight ? dims.rightHalfLeft : dims.leftHalfLeft;
    const labelX = halfLeft + col * dims.triWidth + dims.triWidth / 2;

    // Place label just inside the board edge (above/below triangles)
    const labelY = isTop
      ? dims.boardTop + fontSize * 0.7
      : dims.boardTop + dims.boardHeight - fontSize * 0.7;

    // Display 1-based point numbers for readability (point 0 → "1", etc.)
    ctx.fillText(String(pointIndex + 1), labelX, labelY);
  }
}

// ─── Column index helper ────────────────────────────────────────────────────

function getColumnForPoint(pointIndex: number): number {
  if (pointIndex >= 12 && pointIndex <= 17) {
    return pointIndex - 12;
  }
  if (pointIndex >= 6 && pointIndex <= 11) {
    return 11 - pointIndex;
  }
  if (pointIndex >= 18 && pointIndex <= 23) {
    return pointIndex - 18;
  }
  // 0-5
  return 5 - pointIndex;
}

// ─── Color utilities ─────────────────────────────────────────────────────────

/** Lighten a hex color by `amount` (0-255). */
function lighten(hex: string, amount: number): string {
  return adjustColor(hex, amount);
}

/** Darken a hex color by `amount` (0-255). */
function darken(hex: string, amount: number): string {
  return adjustColor(hex, -amount);
}

function adjustColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Return the color with reduced opacity (hex → rgba). */
function transparentize(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

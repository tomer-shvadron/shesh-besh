import { useCallback, useEffect, useRef } from 'react';

const BOARD_ASPECT_RATIO = 3 / 2;

interface BoardCanvasLogicReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useBoardCanvasLogic(): BoardCanvasLogicReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    let width = containerWidth;
    let height = containerWidth / BOARD_ASPECT_RATIO;

    if (height > containerHeight) {
      height = containerHeight;
      width = containerHeight * BOARD_ASPECT_RATIO;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      drawPlaceholderBoard(ctx, width, height);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });

    const container = containerRef.current;
    if (container) {
      observer.observe(container);
    }

    return () => {
      observer.disconnect();
    };
  }, [resizeCanvas]);

  return { canvasRef, containerRef };
}

function drawPlaceholderBoard(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const boardColor = getComputedStyle(document.documentElement).getPropertyValue('--color-board-surface').trim();
  const frameColor = getComputedStyle(document.documentElement).getPropertyValue('--color-board-frame').trim();
  const triangleDark = getComputedStyle(document.documentElement).getPropertyValue('--color-triangle-dark').trim();
  const triangleLight = getComputedStyle(document.documentElement).getPropertyValue('--color-triangle-light').trim();

  const padding = width * 0.03;
  const barWidth = width * 0.04;
  const boardLeft = padding;
  const boardTop = padding;
  const boardWidth = width - padding * 2;
  const boardHeight = height - padding * 2;

  // Frame
  ctx.fillStyle = frameColor || '#3e2723';
  ctx.fillRect(0, 0, width, height);

  // Playing surface
  ctx.fillStyle = boardColor || '#2e7d32';
  ctx.fillRect(boardLeft, boardTop, boardWidth, boardHeight);

  // Bar
  const barX = width / 2 - barWidth / 2;
  ctx.fillStyle = frameColor || '#3e2723';
  ctx.fillRect(barX, boardTop, barWidth, boardHeight);

  // Draw triangles
  const halfBoardWidth = (boardWidth - barWidth) / 2;
  const triangleWidth = halfBoardWidth / 6;
  const triangleHeight = boardHeight * 0.42;

  for (let i = 0; i < 12; i++) {
    const isTop = i < 6;
    const col = isTop ? 5 - i : i - 6;
    const isLeftHalf = i < 6;
    const baseX = isLeftHalf
      ? boardLeft + col * triangleWidth
      : boardLeft + halfBoardWidth + barWidth + (col) * triangleWidth;

    const color = i % 2 === 0 ? triangleDark || '#7b1fa2' : triangleLight || '#faf3e0';

    // Top triangles (pointing down)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(baseX, boardTop);
    ctx.lineTo(baseX + triangleWidth, boardTop);
    ctx.lineTo(baseX + triangleWidth / 2, boardTop + triangleHeight);
    ctx.closePath();
    ctx.fill();

    // Bottom triangles (pointing up)
    ctx.beginPath();
    ctx.moveTo(baseX, boardTop + boardHeight);
    ctx.lineTo(baseX + triangleWidth, boardTop + boardHeight);
    ctx.lineTo(baseX + triangleWidth / 2, boardTop + boardHeight - triangleHeight);
    ctx.closePath();
    ctx.fill();
  }

  // Center text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = `${Math.round(width * 0.03)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Shesh-Besh', width / 2, height / 2);
}

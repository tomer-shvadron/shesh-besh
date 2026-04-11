import { useEffect, useRef } from 'react';

import { computeBoardDimensions } from '@/renderer/dimensions';
import type { BoardDimensions } from '@/renderer/dimensions';

/**
 * Observe a container div and keep a canvas element sized to fill it correctly,
 * accounting for the device pixel ratio for crisp rendering on HiDPI screens.
 *
 * The canvas CSS size matches the container (capped to 3:2 aspect ratio).
 * The canvas pixel size is scaled by `window.devicePixelRatio`.
 * The canvas 2D context is pre-scaled by DPR so all drawing uses CSS coordinates.
 *
 * Dimensions are stored in a ref (not state) to avoid triggering React re-renders.
 * The game loop reads from this ref each frame.
 *
 * @param canvasRef    - ref to the <canvas> element
 * @param containerRef - ref to the containing <div>
 * @returns ref whose .current is the latest BoardDimensions, or null before first measure
 */
export function useCanvasResize(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
): React.RefObject<BoardDimensions | null> {
  const dimsRef = useRef<BoardDimensions | null>(null);
  // Track last applied size to skip no-op resize events
  const lastCssSizeRef = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const applyResize = (): void => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        return;
      }

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      if (containerWidth === 0 || containerHeight === 0) {
        return;
      }

      // Maintain 3:2 aspect ratio (landscape board)
      const ASPECT = 3 / 2;
      let cssWidth = containerWidth;
      let cssHeight = containerWidth / ASPECT;

      if (cssHeight > containerHeight) {
        cssHeight = containerHeight;
        cssWidth = containerHeight * ASPECT;
      }

      cssWidth = Math.floor(cssWidth);
      cssHeight = Math.floor(cssHeight);

      // Skip if nothing has changed
      const last = lastCssSizeRef.current;
      if (last && last.w === cssWidth && last.h === cssHeight) {
        return;
      }
      lastCssSizeRef.current = { w: cssWidth, h: cssHeight };

      const dpr = window.devicePixelRatio || 1;

      // Set CSS display size
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      // Set physical pixel size
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);

      // Scale context so all drawing coordinates are in CSS pixels
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      dimsRef.current = computeBoardDimensions(cssWidth, cssHeight);
    };

    // Initial measurement
    applyResize();

    const observer = new ResizeObserver(() => {
      applyResize();
    });

    const container = containerRef.current;
    if (container) {
      observer.observe(container);
    }

    return () => {
      observer.disconnect();
    };
  }, [canvasRef, containerRef]);

  return dimsRef;
}

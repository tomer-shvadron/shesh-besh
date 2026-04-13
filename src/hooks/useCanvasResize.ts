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
  onResize?: () => void,
): React.RefObject<BoardDimensions | null> {
  const dimsRef = useRef<BoardDimensions | null>(null);
  // Track last applied size to skip no-op resize events
  const lastCssSizeRef = useRef<{ w: number; h: number } | null>(null);

  // Keep the latest callback in a ref so the observer doesn't re-bind on every render.
  const onResizeRef = useRef(onResize);
  useEffect(() => {
    onResizeRef.current = onResize;
  });

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

      // The canvas always fills the full container width so the bear-off side
      // strips drawn in the canvas frame exactly cover the visible golden frame
      // area — no gap between canvas edge and container background.
      // Height is capped at the container height but we never shrink the width.
      const ASPECT = 3 / 2;
      let cssWidth = containerWidth;
      let cssHeight = Math.floor(cssWidth / ASPECT);

      if (cssHeight > containerHeight) {
        cssHeight = containerHeight;
        // Intentionally NOT shrinking cssWidth here.
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
      onResizeRef.current?.();
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

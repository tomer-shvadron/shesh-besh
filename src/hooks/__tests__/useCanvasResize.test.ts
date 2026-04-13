import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCanvasResize } from '@/hooks/useCanvasResize';

// Capture observer instances for manual triggering
type ResizeCallback = (entries: ResizeObserverEntry[]) => void;

let observerCallback: ResizeCallback | null = null;
let observedElements: Element[] = [];
let disconnectSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  observedElements = [];
  observerCallback = null;
  disconnectSpy = vi.fn();

  vi.stubGlobal('ResizeObserver', class MockResizeObserver {
    constructor(cb: ResizeCallback) {
      observerCallback = cb;
    }
    observe(el: Element): void {
      observedElements.push(el);
    }
    unobserve = vi.fn();
    disconnect = disconnectSpy;
  });

  vi.stubGlobal('devicePixelRatio', 1);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createMockCanvas(): HTMLCanvasElement {
  const setTransformSpy = vi.fn();
  const canvas = document.createElement('canvas');
  // Override getContext to return a mock ctx
  vi.spyOn(canvas, 'getContext').mockReturnValue({
    setTransform: setTransformSpy,
  } as unknown as CanvasRenderingContext2D);
  return canvas;
}

function createMockContainer(width: number, height: number): HTMLDivElement {
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(div, 'clientHeight', { value: height, configurable: true });
  return div;
}

describe('useCanvasResize', () => {
  it('should attach a ResizeObserver on mount', () => {
    const canvas = createMockCanvas();
    const container = createMockContainer(600, 400);

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    renderHook(() => useCanvasResize(canvasRef, containerRef));

    expect(observerCallback).not.toBeNull();
    expect(observedElements).toContain(container);
  });

  it('should disconnect observer on unmount', () => {
    const canvas = createMockCanvas();
    const container = createMockContainer(600, 400);

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    const { unmount } = renderHook(() => useCanvasResize(canvasRef, containerRef));
    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should compute dimensions respecting 3:2 aspect ratio cap', () => {
    // Container: 600 x 800 — at 3:2, height would be 600/1.5 = 400 < 800, so it caps at 400
    const canvas = createMockCanvas();
    const container = createMockContainer(600, 800);

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    const { result } = renderHook(() => useCanvasResize(canvasRef, containerRef));

    // CSS height should be capped by aspect ratio: floor(600 / (3/2)) = 400
    expect(canvas.style.width).toBe('600px');
    expect(canvas.style.height).toBe('400px');
    expect(result.current.current).not.toBeNull();
    expect(result.current.current!.width).toBe(600);
    expect(result.current.current!.height).toBe(400);
  });

  it('should use container height when aspect-capped height exceeds it', () => {
    // Container: 900 x 300 — at 3:2, height = floor(900/1.5) = 600, exceeds 300
    // So cssHeight = 300 (container), cssWidth stays 900
    const canvas = createMockCanvas();
    const container = createMockContainer(900, 300);

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    renderHook(() => useCanvasResize(canvasRef, containerRef));

    expect(canvas.style.width).toBe('900px');
    expect(canvas.style.height).toBe('300px');
  });

  it('should scale by devicePixelRatio for physical pixel size', () => {
    vi.stubGlobal('devicePixelRatio', 2);

    const canvas = createMockCanvas();
    const container = createMockContainer(600, 800);

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    renderHook(() => useCanvasResize(canvasRef, containerRef));

    // CSS dimensions: 600 x 400
    expect(canvas.style.width).toBe('600px');
    expect(canvas.style.height).toBe('400px');

    // Physical pixel dimensions: 600*2 = 1200, 400*2 = 800
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(800);
  });

  it('should call setTransform with DPR scaling', () => {
    vi.stubGlobal('devicePixelRatio', 2);

    const canvas = createMockCanvas();
    const container = createMockContainer(600, 800);
    const ctx = canvas.getContext('2d')!;

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    renderHook(() => useCanvasResize(canvasRef, containerRef));

    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('should skip no-op resize when dimensions are unchanged', () => {
    const canvas = createMockCanvas();
    const container = createMockContainer(600, 800);
    const ctx = canvas.getContext('2d')!;

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    renderHook(() => useCanvasResize(canvasRef, containerRef));

    // setTransform called once for initial measure
    expect(ctx.setTransform).toHaveBeenCalledTimes(1);

    // Trigger resize observer with same dimensions
    observerCallback?.([] as ResizeObserverEntry[]);

    // Should still be 1 (no-op because dimensions haven't changed)
    expect(ctx.setTransform).toHaveBeenCalledTimes(1);
  });

  it('should invoke onResize callback when size changes', () => {
    const canvas = createMockCanvas();
    const container = createMockContainer(600, 800);
    const onResize = vi.fn();

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    renderHook(() => useCanvasResize(canvasRef, containerRef, onResize));

    // Called once for initial measurement
    expect(onResize).toHaveBeenCalledTimes(1);

    // Simulate container resize
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    observerCallback?.([] as ResizeObserverEntry[]);

    expect(onResize).toHaveBeenCalledTimes(2);
  });

  it('should handle zero-size container gracefully', () => {
    const canvas = createMockCanvas();
    const container = createMockContainer(0, 0);

    const canvasRef = { current: canvas };
    const containerRef = { current: container };

    const { result } = renderHook(() => useCanvasResize(canvasRef, containerRef));

    // Dimensions should be null since container has no size
    expect(result.current.current).toBeNull();
  });
});

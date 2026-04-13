import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameLoop } from '@/hooks/useGameLoop';

describe('useGameLoop', () => {
  let rafCallbacks: ((timestamp: number) => void)[];
  let nextRafId: number;
  let cancelledIds: Set<number>;

  beforeEach(() => {
    rafCallbacks = [];
    nextRafId = 1;
    cancelledIds = new Set();

    vi.stubGlobal('requestAnimationFrame', (cb: (timestamp: number) => void) => {
      const id = nextRafId++;
      rafCallbacks.push(cb);
      return id;
    });

    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      cancelledIds.add(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Flush the most recent queued RAF callback with the given timestamp. */
  function flushRaf(timestamp: number): void {
    const cb = rafCallbacks.shift();
    if (cb)
    {
      cb(timestamp);
    }
  }

  it('should request animation frame when active is true', () => {
    const callback = vi.fn();
    renderHook(() => useGameLoop(callback, true));

    expect(rafCallbacks.length).toBe(1);
  });

  it('should not request animation frame when active is false', () => {
    const callback = vi.fn();
    renderHook(() => useGameLoop(callback, false));

    expect(rafCallbacks.length).toBe(0);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should call callback with deltaTime 0 on first frame', () => {
    const callback = vi.fn();
    renderHook(() => useGameLoop(callback, true));

    flushRaf(1000);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(0);
  });

  it('should call callback with correct deltaTime on subsequent frames', () => {
    const callback = vi.fn();
    renderHook(() => useGameLoop(callback, true));

    // First frame — deltaTime = 0
    flushRaf(1000);
    expect(callback).toHaveBeenLastCalledWith(0);

    // Second frame — deltaTime = 16
    flushRaf(1016);
    expect(callback).toHaveBeenLastCalledWith(16);

    // Third frame — deltaTime = 33
    flushRaf(1049);
    expect(callback).toHaveBeenLastCalledWith(33);
  });

  it('should stop RAF loop when active becomes false', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ active }) => useGameLoop(callback, active),
      { initialProps: { active: true } },
    );

    // First frame runs fine
    flushRaf(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Deactivate — should cancel the pending RAF
    rerender({ active: false });

    expect(cancelledIds.size).toBeGreaterThan(0);
  });

  it('should cancel RAF on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useGameLoop(callback, true));

    // One RAF is pending
    expect(rafCallbacks.length).toBe(1);

    unmount();

    // cancelAnimationFrame should have been called
    expect(cancelledIds.size).toBeGreaterThan(0);
  });

  it('should always call the latest callback (not a stale closure)', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { rerender } = renderHook(
      ({ cb }) => useGameLoop(cb, true),
      { initialProps: { cb: firstCallback } },
    );

    // Flush first frame with old callback
    flushRaf(1000);
    expect(firstCallback).toHaveBeenCalledTimes(1);

    // Update callback identity without changing active
    rerender({ cb: secondCallback });

    // Flush next frame — should use the new callback
    flushRaf(1016);
    expect(secondCallback).toHaveBeenCalledTimes(1);
    // Old callback should not have been called again
    expect(firstCallback).toHaveBeenCalledTimes(1);
  });

  it('should reset deltaTime to 0 after reactivation', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ active }) => useGameLoop(callback, active),
      { initialProps: { active: true } },
    );

    flushRaf(1000);
    flushRaf(1016);
    expect(callback).toHaveBeenLastCalledWith(16);

    // Deactivate then reactivate
    rerender({ active: false });
    rerender({ active: true });

    // First frame after reactivation should have deltaTime 0
    flushRaf(5000);
    expect(callback).toHaveBeenLastCalledWith(0);
  });

  it('should continuously schedule new RAF callbacks after each tick', () => {
    const callback = vi.fn();
    renderHook(() => useGameLoop(callback, true));

    // Initial RAF
    expect(rafCallbacks.length).toBe(1);

    // After flushing, a new one should be queued
    flushRaf(1000);
    expect(rafCallbacks.length).toBe(1);

    flushRaf(1016);
    expect(rafCallbacks.length).toBe(1);

    expect(callback).toHaveBeenCalledTimes(2);
  });
});

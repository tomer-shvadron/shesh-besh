import { renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWakeLock } from '@/hooks/useWakeLock';
import type { GameStoreState } from '@/state/game.store';
import { useGameStore } from '@/state/game.store';

// ── Mock sentinel ───────────────────────────────────────────────────────────
interface MockSentinel {
  release: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  _triggerRelease: () => void;
}

function createMockSentinel(): MockSentinel {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    // Use a plain function that always returns a resolved promise
    // so restoreAllMocks cannot strip the implementation
    release: vi.fn(() => Promise.resolve(undefined)),
    addEventListener: vi.fn((type: string, handler: () => void) => {
      if (!listeners[type]) {
        listeners[type] = [];
      }
      listeners[type].push(handler);
    }),
    removeEventListener: vi.fn(),
    _triggerRelease(): void {
      for (const h of listeners['release'] ?? []) {
        h();
      }
    },
  };
}

function setGameState(patch: Partial<GameStoreState>): void {
  useGameStore.setState(patch);
}

describe('useWakeLock', () => {
  let mockRequest: ReturnType<typeof vi.fn>;
  let sentinel: MockSentinel;

  beforeEach(() => {
    sentinel = createMockSentinel();
    mockRequest = vi.fn(() => Promise.resolve(sentinel));

    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: mockRequest },
    });

    useGameStore.getState().initGame('pvp', 'medium');
  });

  afterEach(() => {
    // Ensure React cleanup runs BEFORE we tear down the mocks
    cleanup();
    delete (navigator as unknown as Record<string, unknown>)['wakeLock'];
  });

  it('should request wake lock when entering an active phase', async () => {
    setGameState({ phase: 'rolling' });

    renderHook(() => useWakeLock());

    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith('screen');
    });
  });

  it('should request wake lock for each active phase type', async () => {
    for (const phase of ['rolling', 'moving', 'ai-thinking', 'opening-roll'] as const) {
      mockRequest.mockClear();
      setGameState({ phase });

      const { unmount } = renderHook(() => useWakeLock());

      await vi.waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith('screen');
      });

      unmount();
    }
  });

  it('should release lock when phase transitions to a non-active phase', async () => {
    setGameState({ phase: 'rolling' });

    const { rerender } = renderHook(() => useWakeLock());

    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });

    // Transition to a non-active phase
    setGameState({ phase: 'game-over' });
    rerender();

    // The cleanup function should release the sentinel
    await vi.waitFor(() => {
      expect(sentinel.release).toHaveBeenCalled();
    });
  });

  it('should release lock on unmount', async () => {
    setGameState({ phase: 'moving' });

    const { unmount } = renderHook(() => useWakeLock());

    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });

    unmount();

    expect(sentinel.release).toHaveBeenCalled();
  });

  it('should not crash when navigator.wakeLock is not available', () => {
    // Remove wakeLock entirely so 'wakeLock' in navigator is false
    delete (navigator as unknown as Record<string, unknown>)['wakeLock'];

    setGameState({ phase: 'rolling' });

    // Should not throw
    expect(() => {
      renderHook(() => useWakeLock());
    }).not.toThrow();
  });

  it('should re-acquire wake lock on sentinel release event if still in active phase', async () => {
    setGameState({ phase: 'rolling' });

    renderHook(() => useWakeLock());

    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    expect(sentinel.addEventListener).toHaveBeenCalledWith('release', expect.any(Function));

    // Simulate system releasing the lock
    const secondSentinel = createMockSentinel();
    mockRequest.mockImplementation(() => Promise.resolve(secondSentinel));

    sentinel._triggerRelease();

    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });
  });

  it('should NOT re-acquire wake lock on sentinel release if phase is no longer active', async () => {
    setGameState({ phase: 'rolling' });

    renderHook(() => useWakeLock());

    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    // Set phase to non-active before triggering release event
    setGameState({ phase: 'game-over' });

    sentinel._triggerRelease();

    // Give a tick for any potential re-request
    await new Promise((r) => {
      setTimeout(r, 10);
    });

    // Should still only be 1 call
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('should not request wake lock for non-active phases', () => {
    setGameState({ phase: 'game-over' });

    renderHook(() => useWakeLock());

    expect(mockRequest).not.toHaveBeenCalled();
  });
});

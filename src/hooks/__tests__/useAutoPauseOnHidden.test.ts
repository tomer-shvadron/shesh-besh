import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoPauseOnHidden } from '@/hooks/useAutoPauseOnHidden';
import type { GameStoreState } from '@/state/game.store';
import { useGameStore } from '@/state/game.store';

function setPhase(phase: GameStoreState['phase']): void {
  useGameStore.setState({ phase });
}

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
}

describe('useAutoPauseOnHidden', () => {
  beforeEach(() => {
    useGameStore.getState().initGame('pvp', 'medium');
    setHidden(false);
  });

  afterEach(() => {
    setHidden(false);
    vi.restoreAllMocks();
  });

  it('pauses the game when the tab becomes hidden during moving phase', () => {
    setPhase('moving');
    const pauseSpy = vi.spyOn(useGameStore.getState(), 'handlePause');
    renderHook(() => useAutoPauseOnHidden());

    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(pauseSpy).toHaveBeenCalledTimes(1);
  });

  it('pauses when hidden during rolling phase', () => {
    setPhase('rolling');
    const pauseSpy = vi.spyOn(useGameStore.getState(), 'handlePause');
    renderHook(() => useAutoPauseOnHidden());

    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(pauseSpy).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the tab becomes visible (no auto-resume)', () => {
    setPhase('moving');
    const pauseSpy = vi.spyOn(useGameStore.getState(), 'handlePause');
    const resumeSpy = vi.spyOn(useGameStore.getState(), 'handleResume');
    renderHook(() => useAutoPauseOnHidden());

    setHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(pauseSpy).not.toHaveBeenCalled();
    expect(resumeSpy).not.toHaveBeenCalled();
  });

  it('does nothing when the game is already over', () => {
    setPhase('game-over');
    const pauseSpy = vi.spyOn(useGameStore.getState(), 'handlePause');
    renderHook(() => useAutoPauseOnHidden());

    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(pauseSpy).not.toHaveBeenCalled();
  });

  it('does nothing when already paused', () => {
    setPhase('paused');
    const pauseSpy = vi.spyOn(useGameStore.getState(), 'handlePause');
    renderHook(() => useAutoPauseOnHidden());

    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(pauseSpy).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    setPhase('moving');
    const pauseSpy = vi.spyOn(useGameStore.getState(), 'handlePause');
    const { unmount } = renderHook(() => useAutoPauseOnHidden());

    unmount();

    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(pauseSpy).not.toHaveBeenCalled();
  });
});

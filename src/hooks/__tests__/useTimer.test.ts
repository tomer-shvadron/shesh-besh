import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimer } from '@/hooks/useTimer';
import { useGameStore } from '@/state/game.store';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store to a known state with timerElapsed = 0
    useGameStore.setState({ timerElapsed: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should increment timerElapsed every 1000ms during "rolling" phase', () => {
    useGameStore.setState({ phase: 'rolling', timerElapsed: 0 });
    renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(1000); });
    expect(useGameStore.getState().timerElapsed).toBe(1000);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(useGameStore.getState().timerElapsed).toBe(2000);
  });

  it('should increment timerElapsed during "moving" phase', () => {
    useGameStore.setState({ phase: 'moving', timerElapsed: 0 });
    renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(3000); });
    expect(useGameStore.getState().timerElapsed).toBe(3000);
  });

  it('should increment timerElapsed during "ai-thinking" phase', () => {
    useGameStore.setState({ phase: 'ai-thinking', timerElapsed: 0 });
    renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(2000); });
    expect(useGameStore.getState().timerElapsed).toBe(2000);
  });

  it('should NOT tick during "paused" phase', () => {
    useGameStore.setState({ phase: 'paused', timerElapsed: 0 });
    renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(5000); });
    expect(useGameStore.getState().timerElapsed).toBe(0);
  });

  it('should NOT tick during "game-over" phase', () => {
    useGameStore.setState({ phase: 'game-over', timerElapsed: 0 });
    renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(5000); });
    expect(useGameStore.getState().timerElapsed).toBe(0);
  });

  it('should NOT tick during "not-started" phase', () => {
    useGameStore.setState({ phase: 'not-started', timerElapsed: 0 });
    renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(5000); });
    expect(useGameStore.getState().timerElapsed).toBe(0);
  });

  it('should NOT tick during "opening-roll" phase', () => {
    useGameStore.setState({ phase: 'opening-roll', timerElapsed: 0 });
    renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(5000); });
    expect(useGameStore.getState().timerElapsed).toBe(0);
  });

  it('should stop ticking when phase transitions from active to inactive', () => {
    useGameStore.setState({ phase: 'moving', timerElapsed: 0 });
    renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(2000); });
    expect(useGameStore.getState().timerElapsed).toBe(2000);

    // Transition to paused — wrap in act so React re-renders with the new selector value
    act(() => { useGameStore.setState({ phase: 'paused' }); });

    act(() => { vi.advanceTimersByTime(3000); });
    // Timer should not have advanced further
    expect(useGameStore.getState().timerElapsed).toBe(2000);
  });

  it('should clean up interval on unmount', () => {
    useGameStore.setState({ phase: 'moving', timerElapsed: 0 });
    const { unmount } = renderHook(() => useTimer());

    act(() => { vi.advanceTimersByTime(1000); });
    expect(useGameStore.getState().timerElapsed).toBe(1000);

    unmount();

    act(() => { vi.advanceTimersByTime(3000); });
    // No more ticking after unmount
    expect(useGameStore.getState().timerElapsed).toBe(1000);
  });
});

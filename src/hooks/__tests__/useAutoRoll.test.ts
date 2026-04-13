import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoRoll } from '@/hooks/useAutoRoll';
import { useGameStore } from '@/state/game.store';
import { useSettingsStore } from '@/state/settings.store';

describe('useAutoRoll', () => {
  let handleRollDiceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    handleRollDiceSpy = vi.fn();

    // Set up store state for a PVP game in rolling phase with autoRoll on
    useGameStore.setState({
      phase: 'rolling',
      gameMode: 'pvp',
      currentPlayer: 'white',
      handleRollDice: handleRollDiceSpy,
    });
    useSettingsStore.setState({ autoRoll: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call handleRollDice after 600ms when autoRoll is on and phase is rolling', () => {
    renderHook(() => useAutoRoll());

    expect(handleRollDiceSpy).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(600); });

    expect(handleRollDiceSpy).toHaveBeenCalledTimes(1);
  });

  it('should NOT call handleRollDice when autoRoll is off', () => {
    useSettingsStore.setState({ autoRoll: false });

    renderHook(() => useAutoRoll());

    act(() => { vi.advanceTimersByTime(1000); });

    expect(handleRollDiceSpy).not.toHaveBeenCalled();
  });

  it('should NOT call handleRollDice when phase is not rolling', () => {
    useGameStore.setState({ phase: 'moving' });

    renderHook(() => useAutoRoll());

    act(() => { vi.advanceTimersByTime(1000); });

    expect(handleRollDiceSpy).not.toHaveBeenCalled();
  });

  it('should NOT call handleRollDice during AI turn (pva + black)', () => {
    useGameStore.setState({
      gameMode: 'pva',
      currentPlayer: 'black',
    });

    renderHook(() => useAutoRoll());

    act(() => { vi.advanceTimersByTime(1000); });

    expect(handleRollDiceSpy).not.toHaveBeenCalled();
  });

  it('should call handleRollDice for human in pva mode (white)', () => {
    useGameStore.setState({
      gameMode: 'pva',
      currentPlayer: 'white',
    });

    renderHook(() => useAutoRoll());

    act(() => { vi.advanceTimersByTime(600); });

    expect(handleRollDiceSpy).toHaveBeenCalledTimes(1);
  });

  it('should clean up pending timeout on phase change before firing', () => {
    renderHook(() => useAutoRoll());

    // 300ms in — timeout not yet fired
    act(() => { vi.advanceTimersByTime(300); });
    expect(handleRollDiceSpy).not.toHaveBeenCalled();

    // Change phase to 'moving' — wrap in act so React re-renders and cleanup runs
    act(() => { useGameStore.setState({ phase: 'moving' }); });

    // Advance past original 600ms mark
    act(() => { vi.advanceTimersByTime(600); });
    expect(handleRollDiceSpy).not.toHaveBeenCalled();
  });

  it('should clean up timeout on unmount', () => {
    const { unmount } = renderHook(() => useAutoRoll());

    act(() => { vi.advanceTimersByTime(300); });
    unmount();

    act(() => { vi.advanceTimersByTime(600); });
    expect(handleRollDiceSpy).not.toHaveBeenCalled();
  });

  it('should NOT fire before 600ms', () => {
    renderHook(() => useAutoRoll());

    act(() => { vi.advanceTimersByTime(599); });
    expect(handleRollDiceSpy).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(handleRollDiceSpy).toHaveBeenCalledTimes(1);
  });
});

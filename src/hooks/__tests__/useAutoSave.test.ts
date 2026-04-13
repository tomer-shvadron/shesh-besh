import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoSave } from '@/hooks/useAutoSave';
import { saveGame } from '@/services/gameSave.service';
import { useGameStore } from '@/state/game.store';

vi.mock('@/services/gameSave.service', () => ({
  saveGame: vi.fn(() => Promise.resolve()),
}));

const saveGameMock = vi.mocked(saveGame);

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveGameMock.mockClear();
    // Put store in a saveable phase
    useGameStore.setState({ phase: 'moving', timerElapsed: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call saveGame 500ms after a store update in an active phase', () => {
    renderHook(() => useAutoSave());

    // Trigger a store change
    useGameStore.setState({ timerElapsed: 100 });

    // Not called yet (debounce hasn't fired)
    expect(saveGameMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(saveGameMock).toHaveBeenCalledTimes(1);
    // Verify it was called with a state object containing the updated value
    expect(saveGameMock.mock.calls[0][0]).toMatchObject({ timerElapsed: 100 });
  });

  it('should NOT save during "not-started" phase', () => {
    useGameStore.setState({ phase: 'not-started' });
    renderHook(() => useAutoSave());

    useGameStore.setState({ timerElapsed: 500 });
    vi.advanceTimersByTime(1000);

    expect(saveGameMock).not.toHaveBeenCalled();
  });

  it('should NOT save during "opening-roll" phase', () => {
    useGameStore.setState({ phase: 'opening-roll' });
    renderHook(() => useAutoSave());

    useGameStore.setState({ timerElapsed: 500 });
    vi.advanceTimersByTime(1000);

    expect(saveGameMock).not.toHaveBeenCalled();
  });

  it('should NOT save during "game-over" phase', () => {
    useGameStore.setState({ phase: 'game-over' });
    renderHook(() => useAutoSave());

    useGameStore.setState({ timerElapsed: 500 });
    vi.advanceTimersByTime(1000);

    expect(saveGameMock).not.toHaveBeenCalled();
  });

  it('should debounce multiple rapid updates — only last state is saved', () => {
    renderHook(() => useAutoSave());

    // Rapid updates within the debounce window
    useGameStore.setState({ timerElapsed: 100 });
    vi.advanceTimersByTime(200);

    useGameStore.setState({ timerElapsed: 200 });
    vi.advanceTimersByTime(200);

    useGameStore.setState({ timerElapsed: 300 });
    vi.advanceTimersByTime(500);

    // Should be called exactly once with the final state
    expect(saveGameMock).toHaveBeenCalledTimes(1);
    expect(saveGameMock.mock.calls[0][0]).toMatchObject({ timerElapsed: 300 });
  });

  it('should unsubscribe and clear pending timeout on unmount', () => {
    const { unmount } = renderHook(() => useAutoSave());

    // Trigger a store change
    useGameStore.setState({ timerElapsed: 100 });

    // Unmount before debounce fires
    unmount();

    vi.advanceTimersByTime(1000);

    // saveGame should NOT have been called (timeout cleared on unmount)
    expect(saveGameMock).not.toHaveBeenCalled();
  });

  it('should save during "rolling" phase', () => {
    useGameStore.setState({ phase: 'rolling' });
    renderHook(() => useAutoSave());

    useGameStore.setState({ timerElapsed: 50 });
    vi.advanceTimersByTime(500);

    expect(saveGameMock).toHaveBeenCalledTimes(1);
  });

  it('should save during "paused" phase', () => {
    useGameStore.setState({ phase: 'paused' });
    renderHook(() => useAutoSave());

    useGameStore.setState({ timerElapsed: 50 });
    vi.advanceTimersByTime(500);

    expect(saveGameMock).toHaveBeenCalledTimes(1);
  });
});

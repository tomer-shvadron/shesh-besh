import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNewGameDialogLogic } from '@/components/NewGameDialog/NewGameDialogLogic';
import { useGameStore } from '@/state/game.store';
import { useSettingsStore } from '@/state/settings.store';

describe('useNewGameDialogLogic', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ defaultDifficulty: 'medium' });
  });

  it('starts on mode step with no mode selected', () => {
    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    expect(result.current.step).toBe('mode');
    expect(result.current.selectedMode).toBeNull();
    expect(result.current.canStart).toBe(false);
  });

  it('uses defaultDifficulty from settings store', () => {
    useSettingsStore.setState({ defaultDifficulty: 'hard' });
    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    expect(result.current.selectedDifficulty).toBe('hard');
  });

  it('selecting pva mode moves to difficulty step', () => {
    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    act(() => {
      result.current.selectMode('pva');
    });
    expect(result.current.selectedMode).toBe('pva');
    expect(result.current.step).toBe('difficulty');
    expect(result.current.canStart).toBe(true);
  });

  it('selecting pvp mode stays on mode step', () => {
    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    act(() => {
      result.current.selectMode('pvp');
    });
    expect(result.current.selectedMode).toBe('pvp');
    expect(result.current.step).toBe('mode');
    expect(result.current.canStart).toBe(true);
  });

  it('selectDifficulty updates selected difficulty', () => {
    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    act(() => {
      result.current.selectDifficulty('easy');
    });
    expect(result.current.selectedDifficulty).toBe('easy');
  });

  it('goBack returns to mode step', () => {
    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    act(() => {
      result.current.selectMode('pva');
    });
    expect(result.current.step).toBe('difficulty');
    act(() => {
      result.current.goBack();
    });
    expect(result.current.step).toBe('mode');
  });

  it('startGame does nothing when no mode is selected', () => {
    const initSpy = vi.spyOn(useGameStore.getState(), 'initGame');
    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    act(() => {
      result.current.startGame();
    });
    expect(initSpy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    initSpy.mockRestore();
  });

  it('startGame calls initGame with pva mode and selected difficulty', () => {
    const initGame = vi.fn();
    useGameStore.setState({ initGame });

    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    act(() => {
      result.current.selectMode('pva');
    });
    act(() => {
      result.current.selectDifficulty('hard');
    });
    act(() => {
      result.current.startGame();
    });

    expect(initGame).toHaveBeenCalledWith('pva', 'hard');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('startGame calls initGame with pvp mode and medium difficulty', () => {
    const initGame = vi.fn();
    useGameStore.setState({ initGame });

    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    act(() => {
      result.current.selectMode('pvp');
    });
    act(() => {
      result.current.startGame();
    });

    // PvP always passes 'medium' as difficulty
    expect(initGame).toHaveBeenCalledWith('pvp', 'medium');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('startGame resets dialog state after confirming', () => {
    const initGame = vi.fn();
    useGameStore.setState({ initGame });

    const { result } = renderHook(() => useNewGameDialogLogic(onClose));
    act(() => {
      result.current.selectMode('pva');
    });
    act(() => {
      result.current.startGame();
    });

    // After start, step should reset to 'mode' and selectedMode to null
    expect(result.current.step).toBe('mode');
    expect(result.current.selectedMode).toBeNull();
  });
});

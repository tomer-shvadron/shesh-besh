import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePauseOverlayLogic } from '@/components/PauseOverlay/PauseOverlayLogic';
import { useGameStore } from '@/state/game.store';

describe('usePauseOverlayLogic', () => {
  const onNewGame = vi.fn();
  const onSettings = vi.fn();
  const onHighScores = vi.fn();

  beforeEach(() => {
    useGameStore.setState({ phase: 'not-started' });
    vi.clearAllMocks();
  });

  it('isVisible is true when phase is paused', () => {
    useGameStore.setState({ phase: 'paused' });
    const { result } = renderHook(() => usePauseOverlayLogic(onNewGame, onSettings, onHighScores));
    expect(result.current.isVisible).toBe(true);
  });

  it('isVisible is false when phase is not paused', () => {
    useGameStore.setState({ phase: 'moving' });
    const { result } = renderHook(() => usePauseOverlayLogic(onNewGame, onSettings, onHighScores));
    expect(result.current.isVisible).toBe(false);
  });

  it('isVisible is false during rolling phase', () => {
    useGameStore.setState({ phase: 'rolling' });
    const { result } = renderHook(() => usePauseOverlayLogic(onNewGame, onSettings, onHighScores));
    expect(result.current.isVisible).toBe(false);
  });

  it('returns onResume handler from store', () => {
    const { result } = renderHook(() => usePauseOverlayLogic(onNewGame, onSettings, onHighScores));
    expect(typeof result.current.onResume).toBe('function');
  });

  it('passes through onNewGame callback', () => {
    const { result } = renderHook(() => usePauseOverlayLogic(onNewGame, onSettings, onHighScores));
    expect(result.current.onNewGame).toBe(onNewGame);
  });

  it('passes through onSettings callback', () => {
    const { result } = renderHook(() => usePauseOverlayLogic(onNewGame, onSettings, onHighScores));
    expect(result.current.onSettings).toBe(onSettings);
  });

  it('passes through onHighScores callback', () => {
    const { result } = renderHook(() => usePauseOverlayLogic(onNewGame, onSettings, onHighScores));
    expect(result.current.onHighScores).toBe(onHighScores);
  });
});

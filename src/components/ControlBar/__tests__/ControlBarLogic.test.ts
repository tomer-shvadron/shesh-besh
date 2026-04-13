import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useControlBarLogic } from '@/components/ControlBar/ControlBarLogic';
import { useGameStore } from '@/state/game.store';

function resetGameStore(): void {
  useGameStore.setState({
    phase: 'not-started',
    pendingMoves: [],
  });
}

describe('useControlBarLogic', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('canRoll is true only when phase is rolling', () => {
    useGameStore.setState({ phase: 'rolling' });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.canRoll).toBe(true);
  });

  it('canRoll is false in moving phase', () => {
    useGameStore.setState({ phase: 'moving' });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.canRoll).toBe(false);
  });

  it('canRoll is false when ai-thinking', () => {
    useGameStore.setState({ phase: 'ai-thinking' });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.canRoll).toBe(false);
  });

  it('canUndo is true when moving with pending moves', () => {
    useGameStore.setState({
      phase: 'moving',
      pendingMoves: [{ from: 0, to: 2, dieUsed: 2 }],
    });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.canUndo).toBe(true);
  });

  it('canUndo is false when moving with no pending moves', () => {
    useGameStore.setState({
      phase: 'moving',
      pendingMoves: [],
    });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.canUndo).toBe(false);
  });

  it('canUndo is false during ai-thinking even with pending moves', () => {
    useGameStore.setState({
      phase: 'ai-thinking',
      pendingMoves: [{ from: 0, to: 2, dieUsed: 2 }],
    });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.canUndo).toBe(false);
  });

  it('canStartGame is true only in opening-roll-done phase', () => {
    useGameStore.setState({ phase: 'opening-roll-done' });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.canStartGame).toBe(true);
  });

  it('canStartGame is false in other phases', () => {
    useGameStore.setState({ phase: 'rolling' });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.canStartGame).toBe(false);
  });

  it('isAiThinking is true when phase is ai-thinking', () => {
    useGameStore.setState({ phase: 'ai-thinking' });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.isAiThinking).toBe(true);
  });

  it('isPaused is true when phase is paused', () => {
    useGameStore.setState({ phase: 'paused' });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.isPaused).toBe(true);
  });

  it('isGameOver is true when phase is game-over', () => {
    useGameStore.setState({ phase: 'game-over' });
    const { result } = renderHook(() => useControlBarLogic());
    expect(result.current.isGameOver).toBe(true);
  });

  it('returns handler functions', () => {
    const { result } = renderHook(() => useControlBarLogic());
    expect(typeof result.current.onRoll).toBe('function');
    expect(typeof result.current.onUndo).toBe('function');
    expect(typeof result.current.onStartGame).toBe('function');
    expect(typeof result.current.onPause).toBe('function');
    expect(typeof result.current.onResume).toBe('function');
  });
});

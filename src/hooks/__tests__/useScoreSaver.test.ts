import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useScoreSaver } from '@/hooks/useScoreSaver';
import { useGameStore } from '@/state/game.store';

// Mock the high score store's addScore
vi.mock('@/state/highScore.store', () => {
  const addScoreMock = vi.fn(() => Promise.resolve());
  return {
    useHighScoreStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ addScore: addScoreMock, scores: [], isLoaded: false, loadScores: vi.fn(), clearScores: vi.fn() }),
    ),
    __addScoreMock: addScoreMock,
  };
});

// Access the mock for assertions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addScoreMock: ReturnType<typeof vi.fn> = (await import('@/state/highScore.store') as any).__addScoreMock;

describe('useScoreSaver', () => {
  beforeEach(() => {
    addScoreMock.mockClear();
    // Start with a clean game state
    useGameStore.setState({
      phase: 'rolling',
      winner: null,
      board: {
        points: Array.from({ length: 24 }, () => ({ player: null, count: 0 })),
        bar: { white: 0, black: 0 },
        borneOff: { white: 15, black: 5 },
      },
      timerElapsed: 120_000,
      difficulty: 'medium',
      gameMode: 'pva',
    });
  });

  it('should save a score when phase transitions to game-over', () => {
    renderHook(() => useScoreSaver());

    act(() => {
      useGameStore.setState({ phase: 'game-over', winner: 'white' });
    });

    expect(addScoreMock).toHaveBeenCalledOnce();
    expect(addScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulty: 'medium',
        gameMode: 'pva',
        duration: 120_000,
        margin: 10, // 15 - 5 = 10 checkers remaining for black (loser)
      }),
    );
  });

  it('should not save if winner is null', () => {
    renderHook(() => useScoreSaver());

    act(() => {
      useGameStore.setState({ phase: 'game-over', winner: null });
    });

    expect(addScoreMock).not.toHaveBeenCalled();
  });

  it('should not save during non-game-over phases', () => {
    renderHook(() => useScoreSaver());

    act(() => {
      useGameStore.setState({ phase: 'moving' });
    });

    expect(addScoreMock).not.toHaveBeenCalled();
  });

  it('should only save once per game-over event', () => {
    renderHook(() => useScoreSaver());

    act(() => {
      useGameStore.setState({ phase: 'game-over', winner: 'white' });
    });

    // Additional state updates while still game-over should not trigger another save
    act(() => {
      useGameStore.setState({ timerElapsed: 130_000 });
    });

    expect(addScoreMock).toHaveBeenCalledOnce();
  });

  it('should reset and save again for a new game-over after phase changes away', () => {
    renderHook(() => useScoreSaver());

    // First game over
    act(() => {
      useGameStore.setState({ phase: 'game-over', winner: 'white' });
    });
    expect(addScoreMock).toHaveBeenCalledOnce();

    // Start new game
    act(() => {
      useGameStore.setState({ phase: 'rolling', winner: null });
    });

    // Second game over
    act(() => {
      useGameStore.setState({ phase: 'game-over', winner: 'black' });
    });
    expect(addScoreMock).toHaveBeenCalledTimes(2);
  });

  it('should calculate margin from the loser (opponent of winner)', () => {
    useGameStore.setState({
      board: {
        points: Array.from({ length: 24 }, () => ({ player: null, count: 0 })),
        bar: { white: 0, black: 0 },
        borneOff: { white: 15, black: 3 },
      },
    });

    renderHook(() => useScoreSaver());

    act(() => {
      useGameStore.setState({ phase: 'game-over', winner: 'white' });
    });

    // Black (loser) has borne off 3, so 12 remaining
    expect(addScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({ margin: 12 }),
    );
  });
});

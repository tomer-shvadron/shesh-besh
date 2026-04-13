import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDate, useHighScoresPanelLogic } from '@/components/HighScoresPanel/HighScoresPanelLogic';
import type { HighScoreRecord } from '@/services/database.service';
import { useHighScoreStore } from '@/state/highScore.store';

// Mock the database service to avoid actual IndexedDB calls
vi.mock('@/services/database.service', () => ({
  db: {
    highScores: {
      orderBy: vi.fn().mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      add: vi.fn().mockResolvedValue(1),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

function makeScore(overrides: Partial<HighScoreRecord> = {}): HighScoreRecord {
  return {
    id: 1,
    score: 500,
    difficulty: 'medium',
    gameMode: 'pva',
    date: new Date('2025-01-15'),
    duration: 120000,
    margin: 10,
    ...overrides,
  };
}

describe('useHighScoresPanelLogic', () => {
  beforeEach(() => {
    useHighScoreStore.setState({
      scores: [],
      isLoaded: false,
    });
  });

  it('starts with empty scores and not loaded', () => {
    const { result } = renderHook(() => useHighScoresPanelLogic(false));
    expect(result.current.scores).toEqual([]);
    expect(result.current.isLoaded).toBe(false);
  });

  it('defaults to leaderboard tab', () => {
    const { result } = renderHook(() => useHighScoresPanelLogic(false));
    expect(result.current.tab).toBe('leaderboard');
  });

  it('allows switching tabs', () => {
    const { result } = renderHook(() => useHighScoresPanelLogic(false));
    act(() => {
      result.current.setTab('stats');
    });
    expect(result.current.tab).toBe('stats');
    act(() => {
      result.current.setTab('leaderboard');
    });
    expect(result.current.tab).toBe('leaderboard');
  });

  it('returns scores from the store', () => {
    const scores: HighScoreRecord[] = [
      makeScore({ id: 1, score: 800 }),
      makeScore({ id: 2, score: 400 }),
    ];
    useHighScoreStore.setState({ scores, isLoaded: true });

    const { result } = renderHook(() => useHighScoresPanelLogic(true));
    expect(result.current.scores).toHaveLength(2);
    expect(result.current.scores[0].score).toBe(800);
    expect(result.current.scores[1].score).toBe(400);
  });

  it('computes stats from scores', () => {
    const scores: HighScoreRecord[] = [
      makeScore({ id: 1, difficulty: 'easy' }),
      makeScore({ id: 2, difficulty: 'easy' }),
      makeScore({ id: 3, difficulty: 'medium' }),
      makeScore({ id: 4, difficulty: 'hard' }),
      makeScore({ id: 5, difficulty: 'hard' }),
      makeScore({ id: 6, difficulty: 'hard' }),
    ];
    useHighScoreStore.setState({ scores, isLoaded: true });

    const { result } = renderHook(() => useHighScoresPanelLogic(true));
    expect(result.current.stats.totalGames).toBe(6);
    expect(result.current.stats.easyWins).toBe(2);
    expect(result.current.stats.mediumWins).toBe(1);
    expect(result.current.stats.hardWins).toBe(3);
  });

  it('stats are all zero when no scores exist', () => {
    const { result } = renderHook(() => useHighScoresPanelLogic(false));
    expect(result.current.stats).toEqual({
      totalGames: 0,
      easyWins: 0,
      mediumWins: 0,
      hardWins: 0,
    });
  });

  it('clearScores function is provided', () => {
    const { result } = renderHook(() => useHighScoresPanelLogic(false));
    expect(typeof result.current.clearScores).toBe('function');
  });

  it('formatDate formats a Date into a locale date string', () => {
    const date = new Date('2025-06-15T12:00:00Z');
    const formatted = formatDate(date);
    // The exact format depends on the test locale, but it should be a non-empty string
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });
});

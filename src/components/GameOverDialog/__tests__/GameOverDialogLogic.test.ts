import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useGameOverDialogLogic } from '@/components/GameOverDialog/GameOverDialogLogic';
import { Board } from '@/engine/board';
import type { BoardState, Difficulty, Player } from '@/engine/types';
import { useGameStore } from '@/state/game.store';

function makeBoard(overrides: Partial<BoardState> = {}): BoardState {
  const base = Board.initial().getState();
  return { ...base, ...overrides };
}

function setGameOver(winner: Player, opts: {
  gameMode?: 'pvp' | 'pva';
  timerElapsed?: number;
  difficulty?: Difficulty;
  loserBorneOff?: number;
} = {}): void {
  const loser: Player = winner === 'white' ? 'black' : 'white';
  const board = makeBoard({
    borneOff: {
      [winner]: 15,
      [loser]: opts.loserBorneOff ?? 0,
    } as Record<Player, number>,
  });
  useGameStore.setState({
    phase: 'game-over',
    winner,
    gameMode: opts.gameMode ?? 'pva',
    timerElapsed: opts.timerElapsed ?? 60000,
    difficulty: opts.difficulty ?? 'medium',
    board,
  });
}

describe('useGameOverDialogLogic', () => {
  beforeEach(() => {
    const board = Board.initial().getState();
    useGameStore.setState({
      phase: 'not-started',
      winner: null,
      gameMode: 'pvp',
      timerElapsed: 0,
      difficulty: 'medium',
      board,
    });
  });

  it('returns "White wins!" when white wins in pva mode', () => {
    setGameOver('white', { gameMode: 'pva' });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.winnerLabel).toBe('White wins!');
    expect(result.current.isPlayerWin).toBe(true);
  });

  it('returns "AI wins!" when black wins in pva mode', () => {
    setGameOver('black', { gameMode: 'pva' });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.winnerLabel).toBe('AI wins!');
    expect(result.current.isPlayerWin).toBe(false);
  });

  it('returns "Black wins!" when black wins in pvp mode', () => {
    setGameOver('black', { gameMode: 'pvp' });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.winnerLabel).toBe('Black wins!');
    // In PvP, any winner is a "player win"
    expect(result.current.isPlayerWin).toBe(true);
  });

  it('returns "White wins!" when white wins in pvp mode', () => {
    setGameOver('white', { gameMode: 'pvp' });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.winnerLabel).toBe('White wins!');
    expect(result.current.isPlayerWin).toBe(true);
  });

  it('formats duration as MM:SS', () => {
    setGameOver('white', { timerElapsed: 125000 }); // 2m 5s
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.durationFormatted).toBe('02:05');
  });

  it('formats zero duration as 00:00', () => {
    setGameOver('white', { timerElapsed: 0 });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.durationFormatted).toBe('00:00');
  });

  it('calculates score with difficulty multiplier', () => {
    // Score formula: 100 * diffMultiplier * speedBonus + marginBonus
    // For easy (mult=1), 60s timer: speedBonus = round(300/60) = 5, margin=15 → marginBonus=150
    // Score = 100 * 1 * 5 + 150 = 650
    setGameOver('white', { difficulty: 'easy', timerElapsed: 60000, loserBorneOff: 0 });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.score).toBe(650);
  });

  it('applies hard difficulty multiplier correctly', () => {
    // hard (mult=3), 60s timer: speedBonus = round(300/60) = 5, margin=15 → marginBonus=150
    // Score = 100 * 3 * 5 + 150 = 1650
    setGameOver('white', { difficulty: 'hard', timerElapsed: 60000, loserBorneOff: 0 });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.score).toBe(1650);
  });

  it('includes margin bonus from loser remaining checkers', () => {
    // medium (mult=2), 300s (300000ms) timer: speedBonus = round(300/300) = 1
    // loserBorneOff=10 → margin = 15-10 = 5, marginBonus = 50
    // Score = 100 * 2 * 1 + 50 = 250
    setGameOver('white', { difficulty: 'medium', timerElapsed: 300000, loserBorneOff: 10 });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.score).toBe(250);
  });

  it('returns zero score when winner is null', () => {
    useGameStore.setState({ winner: null });
    const { result } = renderHook(() => useGameOverDialogLogic());
    expect(result.current.score).toBe(0);
  });
});

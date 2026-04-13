import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTopBarLogic } from '@/components/TopBar/TopBarLogic';
import { useGameStore } from '@/state/game.store';

function resetGameStore(): void {
  useGameStore.setState({
    currentPlayer: 'white',
    timerElapsed: 0,
    gameMode: 'pvp',
    difficulty: 'medium',
    phase: 'not-started',
  });
}

describe('useTopBarLogic', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('formats zero elapsed time as 00:00', () => {
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.timerFormatted).toBe('00:00');
  });

  it('formats 65 seconds as 01:05', () => {
    useGameStore.setState({ timerElapsed: 65000 });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.timerFormatted).toBe('01:05');
  });

  it('formats large timer values correctly (10 minutes)', () => {
    useGameStore.setState({ timerElapsed: 600000 });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.timerFormatted).toBe('10:00');
  });

  it('white player info is correct in pvp mode', () => {
    useGameStore.setState({ currentPlayer: 'white', gameMode: 'pvp', phase: 'moving' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.white.label).toBe('White');
    expect(result.current.white.isActive).toBe(true);
    expect(result.current.white.isAi).toBe(false);
    expect(result.current.white.isThinking).toBe(false);
  });

  it('black player label is "AI" in pva mode', () => {
    useGameStore.setState({ gameMode: 'pva', currentPlayer: 'black', phase: 'moving' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.black.label).toBe('AI');
    expect(result.current.black.isAi).toBe(true);
    expect(result.current.black.isActive).toBe(true);
  });

  it('black player label is "Black" in pvp mode', () => {
    useGameStore.setState({ gameMode: 'pvp', currentPlayer: 'black', phase: 'moving' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.black.label).toBe('Black');
    expect(result.current.black.isAi).toBe(false);
  });

  it('black isThinking is true during ai-thinking phase', () => {
    useGameStore.setState({ phase: 'ai-thinking', gameMode: 'pva', currentPlayer: 'black' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.black.isThinking).toBe(true);
  });

  it('black isThinking is false in moving phase', () => {
    useGameStore.setState({ phase: 'moving', gameMode: 'pva', currentPlayer: 'black' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.black.isThinking).toBe(false);
  });

  it('statusLabel during opening-roll-done shows who goes first', () => {
    useGameStore.setState({ phase: 'opening-roll-done', currentPlayer: 'white', gameMode: 'pvp' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.statusLabel).toBe('White goes first — press Start!');
  });

  it('statusLabel during rolling shows player and "Roll Dice"', () => {
    useGameStore.setState({ phase: 'rolling', currentPlayer: 'white', gameMode: 'pvp' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.statusLabel).toBe('White — Roll Dice');
  });

  it('statusLabel during rolling with AI shows "AI" for black', () => {
    useGameStore.setState({ phase: 'rolling', currentPlayer: 'black', gameMode: 'pva' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.statusLabel).toBe('AI — Roll Dice');
  });

  it('statusLabel during moving shows player and "Move Checkers"', () => {
    useGameStore.setState({ phase: 'moving', currentPlayer: 'white', gameMode: 'pvp' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.statusLabel).toContain('Move Checkers');
  });

  it('statusLabel during ai-thinking', () => {
    useGameStore.setState({ phase: 'ai-thinking' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.statusLabel).toBe('AI is thinking\u2026');
  });

  it('statusLabel during game-over', () => {
    useGameStore.setState({ phase: 'game-over' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.statusLabel).toBe('Game Over');
  });

  it('statusLabel during paused', () => {
    useGameStore.setState({ phase: 'paused' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.statusLabel).toBe('Paused');
  });

  it('returns empty statusLabel for not-started phase', () => {
    useGameStore.setState({ phase: 'not-started' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.statusLabel).toBe('');
  });

  it('returns phase, difficulty, and gameMode', () => {
    useGameStore.setState({ phase: 'rolling', difficulty: 'hard', gameMode: 'pva' });
    const { result } = renderHook(() => useTopBarLogic());
    expect(result.current.phase).toBe('rolling');
    expect(result.current.difficulty).toBe('hard');
    expect(result.current.gameMode).toBe('pva');
  });
});

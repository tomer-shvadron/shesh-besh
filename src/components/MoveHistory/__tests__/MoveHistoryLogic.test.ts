import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useMoveHistoryLogic } from '@/components/MoveHistory/MoveHistoryLogic';
import type { MoveEntry } from '@/components/MoveHistory/MoveHistoryLogic';
import type { DiceRoll, Move } from '@/engine/types';
import { useGameStore } from '@/state/game.store';

function resetGameStore(): void {
  useGameStore.setState({
    moveHistory: [],
    diceHistory: [],
    currentPlayer: 'white',
  });
}

describe('useMoveHistoryLogic', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('returns empty entries when moveHistory is empty', () => {
    const { result } = renderHook(() => useMoveHistoryLogic());
    expect(result.current.entries).toEqual([]);
    expect(result.current.currentTurn).toBe(0);
  });

  it('returns correct turn numbers starting from 1', () => {
    const turn1: Move[] = [{ from: 0, to: 2, dieUsed: 2 }];
    const turn2: Move[] = [{ from: 5, to: 3, dieUsed: 2 }];
    useGameStore.setState({
      moveHistory: [turn1, turn2],
      diceHistory: [[2, 3] as DiceRoll, [4, 1] as DiceRoll],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0].turn).toBe(1);
    expect(result.current.entries[1].turn).toBe(2);
    expect(result.current.currentTurn).toBe(2);
  });

  it('alternates player starting from the last turn player', () => {
    // currentPlayer is 'white', so last completed turn was 'black'.
    // With 2 turns: turnsFromNow=2 (even) → currentPlayer='white'; turnsFromNow=1 (odd) → lastTurnPlayer='black'
    const turn1: Move[] = [{ from: 0, to: 2, dieUsed: 2 }];
    const turn2: Move[] = [{ from: 5, to: 3, dieUsed: 2 }];
    useGameStore.setState({
      moveHistory: [turn1, turn2],
      diceHistory: [[2, 3] as DiceRoll, [4, 1] as DiceRoll],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    // turn1 (index 0): turnsFromNow = 2 - 0 = 2 (even) → player = currentPlayer = 'white'
    // turn2 (index 1): turnsFromNow = 2 - 1 = 1 (odd) → player = lastTurnPlayer = 'black'
    expect(result.current.entries[0].player).toBe('white');
    expect(result.current.entries[1].player).toBe('black');
  });

  it('alternates player correctly when currentPlayer is black', () => {
    const turn1: Move[] = [{ from: 0, to: 2, dieUsed: 2 }];
    const turn2: Move[] = [{ from: 5, to: 3, dieUsed: 2 }];
    useGameStore.setState({
      moveHistory: [turn1, turn2],
      diceHistory: [[2, 3] as DiceRoll, [4, 1] as DiceRoll],
      currentPlayer: 'black',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    // lastTurnPlayer = 'white', currentPlayer = 'black'
    // turn1 (index 0): turnsFromNow = 2 (even) → currentPlayer = 'black'
    // turn2 (index 1): turnsFromNow = 1 (odd) → lastTurnPlayer = 'white'
    expect(result.current.entries[0].player).toBe('black');
    expect(result.current.entries[1].player).toBe('white');
  });

  it('includes dice from diceHistory at corresponding index', () => {
    const dice1: DiceRoll = [3, 5];
    const dice2: DiceRoll = [1, 6];
    useGameStore.setState({
      moveHistory: [
        [{ from: 0, to: 3, dieUsed: 3 }],
        [{ from: 5, to: 4, dieUsed: 1 }],
      ],
      diceHistory: [dice1, dice2],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    expect(result.current.entries[0].dice).toEqual([3, 5]);
    expect(result.current.entries[1].dice).toEqual([1, 6]);
  });

  it('returns null dice when diceHistory entry is missing', () => {
    useGameStore.setState({
      moveHistory: [[{ from: 0, to: 3, dieUsed: 3 }]],
      diceHistory: [],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    expect(result.current.entries[0].dice).toBeNull();
  });

  it('clusters consecutive identical segments into a single entry with count', () => {
    // 3 identical moves: all from point 5 → point 3 (dieUsed 2)
    const moves: Move[] = [
      { from: 5, to: 3, dieUsed: 2 },
      { from: 5, to: 3, dieUsed: 2 },
      { from: 5, to: 3, dieUsed: 2 },
    ];
    useGameStore.setState({
      moveHistory: [moves],
      diceHistory: [[2, 2] as DiceRoll],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    const segments = result.current.entries[0].segments;
    expect(segments).toHaveLength(1);
    // pointLabel converts 0-indexed to 1-indexed string
    expect(segments[0]).toEqual({ from: '6', to: '4', count: 3 });
  });

  it('does not cluster non-consecutive identical segments', () => {
    const moves: Move[] = [
      { from: 5, to: 3, dieUsed: 2 },
      { from: 11, to: 9, dieUsed: 2 },
      { from: 5, to: 3, dieUsed: 2 },
    ];
    useGameStore.setState({
      moveHistory: [moves],
      diceHistory: [[2, 2] as DiceRoll],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    const segments = result.current.entries[0].segments;
    expect(segments).toHaveLength(3);
    expect(segments[0].count).toBe(1);
    expect(segments[1].count).toBe(1);
    expect(segments[2].count).toBe(1);
  });

  it('sets isEmpty when turnMoves array is empty', () => {
    useGameStore.setState({
      moveHistory: [[]],
      diceHistory: [[3, 4] as DiceRoll],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    expect(result.current.entries[0].isEmpty).toBe(true);
    expect(result.current.entries[0].segments).toEqual([]);
  });

  it('converts bar and off moves to label strings', () => {
    const moves: Move[] = [
      { from: 'bar', to: 3, dieUsed: 4 },
      { from: 20, to: 'off', dieUsed: 5 },
    ];
    useGameStore.setState({
      moveHistory: [moves],
      diceHistory: [[4, 5] as DiceRoll],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    const segments = result.current.entries[0].segments;
    expect(segments[0].from).toBe('bar');
    expect(segments[0].to).toBe('4'); // point 3 → label "4" (1-indexed)
    expect(segments[1].from).toBe('21'); // point 20 → label "21"
    expect(segments[1].to).toBe('off');
  });

  it('returns a listRef', () => {
    const { result } = renderHook(() => useMoveHistoryLogic());
    expect(result.current.listRef).toBeDefined();
    expect(result.current.listRef.current).toBeNull();
  });

  it('handles a single turn with multiple different segments', () => {
    const moves: Move[] = [
      { from: 0, to: 2, dieUsed: 2 },
      { from: 0, to: 2, dieUsed: 2 },
      { from: 5, to: 9, dieUsed: 4 },
    ];
    useGameStore.setState({
      moveHistory: [moves],
      diceHistory: [[2, 4] as DiceRoll],
      currentPlayer: 'white',
    });

    const { result } = renderHook(() => useMoveHistoryLogic());
    const entry: MoveEntry = result.current.entries[0];
    expect(entry.isEmpty).toBe(false);
    expect(entry.segments).toHaveLength(2);
    expect(entry.segments[0]).toEqual({ from: '1', to: '3', count: 2 });
    expect(entry.segments[1]).toEqual({ from: '6', to: '10', count: 1 });
  });
});

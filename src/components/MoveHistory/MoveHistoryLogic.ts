import { useEffect, useRef } from 'react';

import type { DiceRoll, Move, MoveFrom, MoveTo } from '@/engine/types';
import { useGameStore } from '@/state/game.store';

export interface MoveSegment {
  from: string;
  to: string;
}

export interface ClusteredSegment {
  from: string;
  to: string;
  count: number;
}

export interface MoveEntry {
  turn: number;
  player: 'white' | 'black';
  segments: ClusteredSegment[];
  dice: DiceRoll | null;
  isEmpty: boolean;
}

function clusterSegments(raw: MoveSegment[]): ClusteredSegment[] {
  const result: ClusteredSegment[] = [];
  for (const seg of raw) {
    const last = result[result.length - 1];
    if (last && last.from === seg.from && last.to === seg.to) {
      last.count++;
    } else {
      result.push({ from: seg.from, to: seg.to, count: 1 });
    }
  }
  return result;
}

function pointLabel(p: MoveFrom | MoveTo): string {
  if (p === 'bar') { return 'bar'; }
  if (p === 'off') { return 'off'; }
  return String((p as number) + 1);
}

function moveToSegment(move: Move): MoveSegment {
  return { from: pointLabel(move.from), to: pointLabel(move.to) };
}

export interface MoveHistoryLogicReturn {
  entries: MoveEntry[];
  currentTurn: number;
  listRef: React.RefObject<HTMLUListElement | null>;
}

export function useMoveHistoryLogic(): MoveHistoryLogicReturn {
  const moveHistory = useGameStore((s) => s.moveHistory);
  const diceHistory = useGameStore((s) => s.diceHistory);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  const entries: MoveEntry[] = moveHistory.map((turnMoves, index) => {
    const turnsCompleted = moveHistory.length;
    const turnsFromNow = turnsCompleted - index;
    const lastTurnPlayer = currentPlayer === 'white' ? 'black' : 'white';
    const player = turnsFromNow % 2 === 1 ? lastTurnPlayer : currentPlayer;

    const segments = clusterSegments(turnMoves.map(moveToSegment));
    const dice = diceHistory[index] ?? null;

    return {
      turn: index + 1,
      player,
      segments,
      dice,
      isEmpty: turnMoves.length === 0,
    };
  });

  // Auto-scroll the list to the bottom whenever a new turn is appended, so the
  // most recent move stays visible without the user having to scroll manually.
  const listRef = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries.length]);

  return {
    entries,
    currentTurn: moveHistory.length,
    listRef,
  };
}

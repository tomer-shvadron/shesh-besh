import type { Move, MoveFrom, MoveTo } from '@/engine/types';
import { useGameStore } from '@/state/game.store';

export interface MoveEntry {
  turn: number;
  player: 'white' | 'black';
  notation: string;
}

function pointLabel(p: MoveFrom | MoveTo): string {
  if (p === 'bar') {
    return 'bar';
  }
  if (p === 'off') {
    return 'off';
  }
  // Convert 0-based index to traditional 1-based point number
  return String((p as number) + 1);
}

function moveNotation(move: Move): string {
  return `${pointLabel(move.from)}/${pointLabel(move.to)}`;
}

export interface MoveHistoryLogicReturn {
  entries: MoveEntry[];
  currentTurn: number;
}

export function useMoveHistoryLogic(): MoveHistoryLogicReturn {
  const moveHistory = useGameStore((s) => s.moveHistory);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  const entries: MoveEntry[] = moveHistory.map((turnMoves, index) => {
    // Alternate players: turn 0 = player who went first, etc.
    // We infer the player based on parity of confirmed turns and currentPlayer
    const turnsCompleted = moveHistory.length;
    const turnsFromNow = turnsCompleted - index;
    // currentPlayer has NOT yet taken a turn; the last completed turn was by the OTHER player
    const lastTurnPlayer = currentPlayer === 'white' ? 'black' : 'white';
    // Odd turns back from now alternate
    const player = turnsFromNow % 2 === 1 ? lastTurnPlayer : currentPlayer;

    const notation = turnMoves.length > 0 ? turnMoves.map(moveNotation).join(', ') : '(no moves)';

    return { turn: index + 1, player, notation };
  });

  return {
    entries,
    currentTurn: moveHistory.length,
  };
}

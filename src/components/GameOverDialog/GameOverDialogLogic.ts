import { useGameStore } from '@/state/game.store';
import { checkersRemaining } from '@/utils/bearOff';
import { calcScore } from '@/utils/score';

export interface GameOverDialogLogicReturn {
  winnerLabel: string;
  isPlayerWin: boolean;
  durationFormatted: string;
  score: number;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useGameOverDialogLogic(): GameOverDialogLogicReturn {
  const winner = useGameStore((s) => s.winner);
  const timerElapsed = useGameStore((s) => s.timerElapsed);
  const difficulty = useGameStore((s) => s.difficulty);
  const gameMode = useGameStore((s) => s.gameMode);
  const board = useGameStore((s) => s.board);

  const isPlayerWin = winner === 'white' || (gameMode === 'pvp' && winner !== null);

  let winnerLabel: string;
  if (winner === 'white') {
    winnerLabel = 'White wins!';
  } else if (winner === 'black' && gameMode === 'pva') {
    winnerLabel = 'AI wins!';
  } else {
    winnerLabel = 'Black wins!';
  }

  // Margin = checkers the loser has remaining (not borne off)
  const loserPlayer = winner === 'white' ? 'black' : 'white';
  const margin = checkersRemaining(board.borneOff[loserPlayer]);

  const score = winner !== null ? calcScore(timerElapsed, difficulty, margin) : 0;

  return {
    winnerLabel,
    isPlayerWin,
    durationFormatted: formatMs(timerElapsed),
    score,
  };
}

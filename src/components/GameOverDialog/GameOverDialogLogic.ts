import { useGameStore } from '@/state/game.store';

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

function calcScore(timerElapsed: number, difficulty: string, margin: number): number {
  let diffMultiplier: number;
  if (difficulty === 'hard') {
    diffMultiplier = 3;
  } else if (difficulty === 'medium') {
    diffMultiplier = 2;
  } else {
    diffMultiplier = 1;
  }

  // Speed bonus: faster = more points (cap at 5 minutes = 300 s for max bonus)
  const totalSeconds = Math.max(1, Math.floor(timerElapsed / 1000));
  const speedBonus = Math.max(0, Math.round(300 / totalSeconds));

  // Margin bonus: each extra checker remaining = 10 pts
  const marginBonus = margin * 10;

  return 100 * diffMultiplier * speedBonus + marginBonus;
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
  const loserBorneOff = board.borneOff[loserPlayer];
  const margin = Math.max(0, 15 - loserBorneOff);

  const score = winner !== null ? calcScore(timerElapsed, difficulty, margin) : 0;

  return {
    winnerLabel,
    isPlayerWin,
    durationFormatted: formatMs(timerElapsed),
    score,
  };
}

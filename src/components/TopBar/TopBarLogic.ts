import { useGameStore } from '@/state/game.store';

export interface PlayerInfo {
  label: string;
  isActive: boolean;
  isAi: boolean;
}

export interface TopBarLogicReturn {
  white: PlayerInfo;
  black: PlayerInfo;
  timerFormatted: string;
  difficulty: string;
  gameMode: string;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function useTopBarLogic(): TopBarLogicReturn {
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const timerElapsed = useGameStore((s) => s.timerElapsed);
  const gameMode = useGameStore((s) => s.gameMode);
  const difficulty = useGameStore((s) => s.difficulty);

  const white: PlayerInfo = {
    label: 'White',
    isActive: currentPlayer === 'white',
    isAi: false,
  };

  const black: PlayerInfo = {
    label: gameMode === 'pva' ? 'AI' : 'Black',
    isActive: currentPlayer === 'black',
    isAi: gameMode === 'pva',
  };

  return {
    white,
    black,
    timerFormatted: formatMs(timerElapsed),
    difficulty,
    gameMode,
  };
}

import type { GamePhase } from '@/engine/types';
import { useGameStore } from '@/state/game.store';

export interface PlayerInfo {
  label: string;
  isActive: boolean;
  isAi: boolean;
  isThinking: boolean;
}

export interface TopBarLogicReturn {
  white: PlayerInfo;
  black: PlayerInfo;
  timerFormatted: string;
  statusLabel: string;
  difficulty: string;
  gameMode: string;
  phase: GamePhase;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

function playerLabel(currentPlayer: 'white' | 'black', gameMode: string): string {
  if (currentPlayer === 'white') {
    return 'White';
  }
  if (gameMode === 'pva') {
    return 'AI';
  }
  return 'Black';
}

function getStatusLabel(phase: GamePhase, currentPlayer: 'white' | 'black', gameMode: string): string {
  switch (phase) {
    case 'opening-roll-done': {
      const winner = playerLabel(currentPlayer, gameMode);
      return `${winner} goes first — press Start!`;
    }
    case 'rolling': {
      return `${playerLabel(currentPlayer, gameMode)} — Roll Dice`;
    }
    case 'moving': {
      return `${playerLabel(currentPlayer, gameMode)} — Move Checkers`;
    }
    case 'ai-thinking':
      return 'AI is thinking…';
    case 'game-over':
      return 'Game Over';
    case 'paused':
      return 'Paused';
    default:
      return '';
  }
}

export function useTopBarLogic(): TopBarLogicReturn {
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const timerElapsed = useGameStore((s) => s.timerElapsed);
  const gameMode = useGameStore((s) => s.gameMode);
  const difficulty = useGameStore((s) => s.difficulty);
  const phase = useGameStore((s) => s.phase);

  const isAiThinking = phase === 'ai-thinking';

  const white: PlayerInfo = {
    label: 'White',
    isActive: currentPlayer === 'white',
    isAi: false,
    isThinking: false,
  };

  const black: PlayerInfo = {
    label: gameMode === 'pva' ? 'AI' : 'Black',
    isActive: currentPlayer === 'black',
    isAi: gameMode === 'pva',
    isThinking: isAiThinking,
  };

  return {
    white,
    black,
    timerFormatted: formatMs(timerElapsed),
    statusLabel: getStatusLabel(phase, currentPlayer, gameMode),
    difficulty,
    gameMode,
    phase,
  };
}

import { useGameStore } from '@/state/game.store';

export interface PauseOverlayLogicReturn {
  isVisible: boolean;
  onResume: () => void;
}

export function usePauseOverlayLogic(onNewGame: () => void, onSettings: () => void, onHighScores: () => void): PauseOverlayLogicReturn & {
  onNewGame: () => void;
  onSettings: () => void;
  onHighScores: () => void;
} {
  const phase = useGameStore((s) => s.phase);
  const handleResume = useGameStore((s) => s.handleResume);

  return {
    isVisible: phase === 'paused',
    onResume: handleResume,
    onNewGame,
    onSettings,
    onHighScores,
  };
}

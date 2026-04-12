import { useGameStore } from '@/state/game.store';

export interface ControlBarLogicReturn {
  canUndo: boolean;
  canRoll: boolean;
  canStartGame: boolean;
  isAiThinking: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  onRoll: () => void;
  onUndo: () => void;
  onStartGame: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function useControlBarLogic(): ControlBarLogicReturn {
  const phase = useGameStore((s) => s.phase);
  const pendingMoves = useGameStore((s) => s.pendingMoves);
  const handleRollDice = useGameStore((s) => s.handleRollDice);
  const handleUndoMove = useGameStore((s) => s.handleUndoMove);
  const handleConfirmOpeningRoll = useGameStore((s) => s.handleConfirmOpeningRoll);
  const handlePause = useGameStore((s) => s.handlePause);
  const handleResume = useGameStore((s) => s.handleResume);

  const isAiThinking = phase === 'ai-thinking';
  const isPaused = phase === 'paused';
  const isGameOver = phase === 'game-over';

  return {
    canUndo: phase === 'moving' && pendingMoves.length > 0 && !isAiThinking,
    canRoll: phase === 'rolling' && !isAiThinking,
    canStartGame: phase === 'opening-roll-done',
    isAiThinking,
    isPaused,
    isGameOver,
    onRoll: handleRollDice,
    onUndo: handleUndoMove,
    onStartGame: handleConfirmOpeningRoll,
    onPause: handlePause,
    onResume: handleResume,
  };
}

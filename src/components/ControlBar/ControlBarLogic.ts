import { useGameStore } from '@/state/game.store';

export interface ControlBarLogicReturn {
  canUndo: boolean;
  canConfirm: boolean;
  canRoll: boolean;
  isAiThinking: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  onRoll: () => void;
  onUndo: () => void;
  onConfirm: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function useControlBarLogic(): ControlBarLogicReturn {
  const phase = useGameStore((s) => s.phase);
  const pendingMoves = useGameStore((s) => s.pendingMoves);
  const handleRollDice = useGameStore((s) => s.handleRollDice);
  const handleUndoMove = useGameStore((s) => s.handleUndoMove);
  const handleConfirmTurn = useGameStore((s) => s.handleConfirmTurn);
  const handlePause = useGameStore((s) => s.handlePause);
  const handleResume = useGameStore((s) => s.handleResume);

  const isAiThinking = phase === 'ai-thinking';
  const isPaused = phase === 'paused';
  const isGameOver = phase === 'game-over';

  return {
    canUndo: phase === 'moving' && pendingMoves.length > 0 && !isAiThinking,
    canConfirm: phase === 'moving' && pendingMoves.length > 0 && !isAiThinking,
    canRoll: phase === 'rolling' && !isAiThinking,
    isAiThinking,
    isPaused,
    isGameOver,
    onRoll: handleRollDice,
    onUndo: handleUndoMove,
    onConfirm: handleConfirmTurn,
    onPause: handlePause,
    onResume: handleResume,
  };
}

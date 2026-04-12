import { useEffect } from 'react';

import { useGameStore } from '@/state/game.store';

/**
 * Global keyboard shortcuts for game actions.
 * Space  → roll dice (when in rolling phase)
 * Z      → undo last move (when moves are pending)
 */
export function useKeyboardShortcuts(): void {
  const handleRollDice = useGameStore((s) => s.handleRollDice);
  const handleUndoMove = useGameStore((s) => s.handleUndoMove);
  const handleConfirmOpeningRoll = useGameStore((s) => s.handleConfirmOpeningRoll);
  const phase = useGameStore((s) => s.phase);
  const pendingMoves = useGameStore((s) => s.pendingMoves);
  const gameMode = useGameStore((s) => s.gameMode);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      // Ignore when focus is inside a text field or button to avoid hijacking UI interactions
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') {
        return;
      }

      // Block shortcuts during AI turn
      if (gameMode === 'pva' && currentPlayer === 'black') {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (phase === 'rolling') {
          handleRollDice();
        } else if (phase === 'opening-roll-done') {
          handleConfirmOpeningRoll();
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          if (phase === 'moving' && pendingMoves.length > 0) {
            handleUndoMove();
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return (): void => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    phase,
    pendingMoves.length,
    gameMode,
    currentPlayer,
    handleRollDice,
    handleUndoMove,
    handleConfirmOpeningRoll,
  ]);
}

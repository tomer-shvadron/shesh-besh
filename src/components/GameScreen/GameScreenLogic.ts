import { useCallback, useEffect, useState } from 'react';

import { useAutoSave } from '@/hooks/useAutoSave';
import { useTimer } from '@/hooks/useTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { clearGame, loadGame } from '@/services/gameSave.service';
import { useGameStore } from '@/state/game.store';
import { DESKTOP_BREAKPOINT } from '@/utils/responsive';

export interface GameScreenLogicReturn {
  isDesktopLayout: boolean;
  showNewGameDialog: boolean;
  showGameOverDialog: boolean;
  showSettings: boolean;
  showHighScores: boolean;
  openNewGame: () => void;
  closeNewGame: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openHighScores: () => void;
  closeHighScores: () => void;
  closeGameOver: () => void;
}

export function useGameScreenLogic(): GameScreenLogicReturn {
  const [isDesktopLayout, setIsDesktopLayout] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);

  const phase = useGameStore((s) => s.phase);
  const loadState = useGameStore((s) => s.loadState);

  // Activate side-effect hooks
  useAutoSave();
  useTimer();
  useWakeLock();

  // On mount, try to load a saved game. If none exists, open the new game dialog.
  useEffect(() => {
    let cancelled = false;

    loadGame()
      .then((savedState) => {
        if (cancelled) {
          return;
        }
        if (savedState) {
          loadState(savedState);
        } else {
          setShowNewGameDialog(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowNewGameDialog(true);
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResize = useCallback(() => {
    setIsDesktopLayout(window.innerWidth >= DESKTOP_BREAKPOINT);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  const openNewGame = useCallback((): void => {
    setShowNewGameDialog(true);
  }, []);

  const closeNewGame = useCallback((): void => {
    setShowNewGameDialog(false);
  }, []);

  const openSettings = useCallback((): void => {
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback((): void => {
    setShowSettings(false);
  }, []);

  const openHighScores = useCallback((): void => {
    setShowHighScores(true);
  }, []);

  const closeHighScores = useCallback((): void => {
    setShowHighScores(false);
  }, []);

  const closeGameOver = useCallback((): void => {
    // Clear the persisted save when the game-over dialog is dismissed
    void clearGame();
  }, []);

  const showGameOverDialog = phase === 'game-over';

  return {
    isDesktopLayout,
    showNewGameDialog,
    showGameOverDialog,
    showSettings,
    showHighScores,
    openNewGame,
    closeNewGame,
    openSettings,
    closeSettings,
    openHighScores,
    closeHighScores,
    closeGameOver,
  };
}

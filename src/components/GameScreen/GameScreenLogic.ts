import { useCallback, useEffect, useRef, useState } from 'react';

import { useAiTurn } from '@/hooks/useAiTurn';
import { useAutoPauseOnHidden } from '@/hooks/useAutoPauseOnHidden';
import { useAutoRoll } from '@/hooks/useAutoRoll';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useScoreSaver } from '@/hooks/useScoreSaver';
import { useSettingsPersistence } from '@/hooks/useSettingsPersistence';
import { useTimer } from '@/hooks/useTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { clearGame, loadGame } from '@/services/gameSave.service';
import { useGameStore } from '@/state/game.store';
import { useSettingsStore } from '@/state/settings.store';
import { DESKTOP_BREAKPOINT } from '@/utils/responsive';

export interface GameScreenLogicReturn {
  isDesktopLayout: boolean;
  showNewGameDialog: boolean;
  showGameOverDialog: boolean;
  showSettings: boolean;
  showHighScores: boolean;
  showTutorial: boolean;
  openNewGame: () => void;
  closeNewGame: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openHighScores: () => void;
  closeHighScores: () => void;
  closeGameOver: () => void;
  openTutorial: () => void;
  closeTutorial: () => void;
}

export function useGameScreenLogic(): GameScreenLogicReturn {
  const [isDesktopLayout, setIsDesktopLayout] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Tracks whether the user explicitly dismissed the dialog while phase was still 'game-over'.
  // Reset when phase leaves 'game-over' so the next game can show it again.
  const gameOverDismissedRef = useRef(false);

  const phase = useGameStore((s) => s.phase);
  const loadState = useGameStore((s) => s.loadState);
  const tutorialSeen = useSettingsStore((s) => s.tutorialSeen);
  const settingsLoaded = useSettingsStore((s) => s.settingsLoaded);

  // Activate side-effect hooks
  useAutoSave();
  useTimer();
  useWakeLock();
  useAiTurn();
  useKeyboardShortcuts();
  useAutoRoll();
  useSettingsPersistence();
  useAutoPauseOnHidden();
  useScoreSaver();

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

  // Show the game-over dialog when the phase transitions to 'game-over', and
  // auto-hide it when the phase changes away (new game started). The dismissed
  // ref prevents the dialog from reappearing while the phase is still 'game-over'
  // after the user explicitly closes it.
  useEffect(() => {
    if (phase === 'game-over') {
      if (!gameOverDismissedRef.current) {
        setShowGameOverDialog(true);
      }
    } else {
      gameOverDismissedRef.current = false;
      setShowGameOverDialog(false);
    }
  }, [phase]);

  // Show tutorial automatically on first launch — only after persisted settings have loaded
  // from IndexedDB, to avoid opening it for users who have already completed it.
  useEffect(() => {
    if (settingsLoaded && !tutorialSeen) {
      setShowTutorial(true);
    }
  }, [settingsLoaded, tutorialSeen]);

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
    gameOverDismissedRef.current = true;
    setShowGameOverDialog(false);
    // Clear the persisted save so a reload starts fresh
    void clearGame();
  }, []);

  const openTutorial = useCallback((): void => {
    setShowTutorial(true);
  }, []);

  const closeTutorial = useCallback((): void => {
    setShowTutorial(false);
  }, []);

  return {
    isDesktopLayout,
    showNewGameDialog,
    showGameOverDialog,
    showSettings,
    showHighScores,
    showTutorial,
    openNewGame,
    closeNewGame,
    openSettings,
    closeSettings,
    openHighScores,
    closeHighScores,
    closeGameOver,
    openTutorial,
    closeTutorial,
  };
}

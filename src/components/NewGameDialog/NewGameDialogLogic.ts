import { useState } from 'react';

import type { Difficulty, GameMode } from '@/engine/types';
import { useGameStore } from '@/state/game.store';
import { useSettingsStore } from '@/state/settings.store';

type Step = 'mode' | 'difficulty';

export interface NewGameDialogLogicReturn {
  step: Step;
  selectedMode: GameMode | null;
  selectedDifficulty: Difficulty;
  selectMode: (mode: GameMode) => void;
  selectDifficulty: (difficulty: Difficulty) => void;
  startGame: () => void;
  goBack: () => void;
  canStart: boolean;
}

export function useNewGameDialogLogic(onClose: () => void): NewGameDialogLogicReturn {
  const defaultDifficulty = useSettingsStore((s) => s.defaultDifficulty);
  const initGame = useGameStore((s) => s.initGame);

  const [step, setStep] = useState<Step>('mode');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(defaultDifficulty);

  const selectMode = (mode: GameMode): void => {
    setSelectedMode(mode);
    if (mode === 'pva') {
      setStep('difficulty');
    } else {
      // PvP — no difficulty needed, allow immediate start
    }
  };

  const selectDifficulty = (difficulty: Difficulty): void => {
    setSelectedDifficulty(difficulty);
  };

  const startGame = (): void => {
    if (!selectedMode) {
      return;
    }
    const diff: Difficulty = selectedMode === 'pva' ? selectedDifficulty : 'medium';
    initGame(selectedMode, diff);
    // Reset dialog state for next open
    setStep('mode');
    setSelectedMode(null);
    onClose();
  };

  const goBack = (): void => {
    setStep('mode');
  };

  const canStart = selectedMode !== null;

  return {
    step,
    selectedMode,
    selectedDifficulty,
    selectMode,
    selectDifficulty,
    startGame,
    goBack,
    canStart,
  };
}

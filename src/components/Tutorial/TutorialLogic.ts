import { useCallback, useState } from 'react';

import { db } from '@/services/database.service';
import { useSettingsStore } from '@/state/settings.store';

export interface TutorialStep {
  title: string;
  description: string;
  highlightArea?: 'board' | 'bar' | 'dice' | 'home';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Shesh-Besh!',
    description:
      'Shesh-Besh is the classic game of backgammon. The board has 24 narrow triangles (points) arranged in four quadrants. ' +
      'Each player has 15 checkers and moves them around the board in opposite directions toward their home board.',
    highlightArea: 'board',
  },
  {
    title: 'How to Move',
    description:
      'Tap a checker to select it — valid destination points will be highlighted. ' +
      'Then tap a highlighted point to move there. You must use your rolled dice values to determine how far each checker moves.',
    highlightArea: 'board',
  },
  {
    title: 'The Dice',
    description:
      'Tap "Roll" to roll the dice at the start of your turn. Each die value lets you move a checker that many points. ' +
      'If you roll doubles (e.g. 4-4), you get four moves of that value. You must use both dice whenever legally possible.',
    highlightArea: 'dice',
  },
  {
    title: 'Hitting & the Bar',
    description:
      'A point occupied by a single opponent checker (a "blot") can be hit. Your checker lands there and sends the opponent\'s checker to the middle bar. ' +
      'A player with checkers on the bar must re-enter them before making any other move.',
    highlightArea: 'bar',
  },
  {
    title: 'Bearing Off',
    description:
      'Once all 15 of your checkers have reached your home board (the last 6 points), you can start bearing them off. ' +
      'Use your dice values to remove checkers from the board. The first player to bear off all 15 checkers wins!',
    highlightArea: 'home',
  },
];

export interface TutorialLogicReturn {
  currentStep: number;
  totalSteps: number;
  step: TutorialStep;
  isLastStep: boolean;
  nextStep: () => void;
  skipTutorial: () => void;
}

export function useTutorialLogic(onClose: () => void): TutorialLogicReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const setTutorialSeen = useSettingsStore((s) => s.setTutorialSeen);

  const markSeen = useCallback(async (): Promise<void> => {
    setTutorialSeen(true);
    await db.settings.put({
      id: 'default',
      ...(await db.settings.get('default')),
      tutorialSeen: true,
    } as Parameters<typeof db.settings.put>[0]);
  }, [setTutorialSeen]);

  const closeTutorial = useCallback((): void => {
    void markSeen();
    onClose();
  }, [markSeen, onClose]);

  const nextStep = useCallback((): void => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      closeTutorial();
    }
  }, [currentStep, closeTutorial]);

  const skipTutorial = useCallback((): void => {
    closeTutorial();
  }, [closeTutorial]);

  return {
    currentStep,
    totalSteps: TUTORIAL_STEPS.length,
    step: TUTORIAL_STEPS[currentStep] ?? TUTORIAL_STEPS[0]!,
    isLastStep: currentStep === TUTORIAL_STEPS.length - 1,
    nextStep,
    skipTutorial,
  };
}

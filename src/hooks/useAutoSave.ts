import { useEffect, useRef } from 'react';

import { saveGame } from '@/services/gameSave.service';
import { useGameStore } from '@/state/game.store';

const DEBOUNCE_MS = 500;

// Phases where we do NOT persist (nothing meaningful yet, or game is finished)
const SKIP_PHASES = new Set(['not-started', 'opening-roll', 'game-over']);

/**
 * Automatically saves the game state to IndexedDB after every meaningful
 * state change (debounced by 500 ms). Skips saving during opening-roll,
 * not-started, and game-over phases.
 */
export function useAutoSave(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state) => {
      if (SKIP_PHASES.has(state.phase)) {
        return;
      }

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        void saveGame(state);
        timerRef.current = null;
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}

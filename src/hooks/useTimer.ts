import { useEffect } from 'react';

import { useGameStore } from '@/state/game.store';

const ACTIVE_PHASES = new Set(['rolling', 'moving', 'ai-thinking']);
const TICK_MS = 1000;

/**
 * Drives the in-game timer by incrementing `timerElapsed` in the game store
 * every second while the game is in an active phase (rolling, moving, ai-thinking).
 * The timer pauses automatically when the phase transitions to 'paused',
 * 'game-over', 'opening-roll', or 'not-started'.
 *
 * Requires `useGameStore` to expose an `incrementTimer(ms: number)` action.
 */
export function useTimer(): void {
  const phase = useGameStore((s) => s.phase);
  const isActive = ACTIVE_PHASES.has(phase);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const id = setInterval(() => {
      useGameStore.getState().incrementTimer(TICK_MS);
    }, TICK_MS);

    return () => {
      clearInterval(id);
    };
  }, [isActive]);
}

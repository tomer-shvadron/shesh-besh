import { useEffect } from 'react';

import { useGameStore } from '@/state/game.store';

/**
 * Phases in which the game clock is actively running and the user
 * expects progress to be made. If the tab becomes hidden while the
 * game is in one of these phases we auto-pause so the timer does not
 * keep accumulating in the background and the wake-lock / animation
 * loop can cleanly stand down.
 */
const RESUMABLE_PHASES = new Set(['rolling', 'moving', 'ai-thinking', 'opening-roll']);

/**
 * Automatically pauses the game when the browser tab becomes hidden,
 * and does nothing on tab-reveal — the user is expected to press
 * "Resume" explicitly so they can decide when play restarts.
 *
 * Mobile friendly: backgrounded PWAs on iOS/Android fire
 * `visibilitychange` with `document.hidden === true`.
 */
export function useAutoPauseOnHidden(): void {
  useEffect(() => {
    const handler = (): void => {
      if (!document.hidden) {
        return;
      }
      const state = useGameStore.getState();
      if (RESUMABLE_PHASES.has(state.phase)) {
        state.handlePause();
      }
    };

    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }, []);
}

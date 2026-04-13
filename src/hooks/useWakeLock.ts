import { useEffect, useRef } from 'react';

import { useGameStore } from '@/state/game.store';

const ACTIVE_PHASES = new Set(['rolling', 'moving', 'ai-thinking', 'opening-roll']);

/**
 * Acquires the Screen Wake Lock API when the game is actively being played,
 * preventing the device screen from sleeping mid-game.
 * Releases automatically on pause, game-over, or component unmount.
 * Gracefully handles browsers that do not support the Wake Lock API.
 */
export function useWakeLock(): void {
  const phase = useGameStore((s) => s.phase);
  const isActive = ACTIVE_PHASES.has(phase);
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (lockRef.current) {
        void lockRef.current.release().catch(() => undefined);
        lockRef.current = null;
      }
      return;
    }

    // Acquire wake lock
    if (!('wakeLock' in navigator)) {
      return;
    }

    let cancelled = false;
    let activeSentinel: WakeLockSentinel | null = null;
    let releaseHandler: (() => void) | null = null;

    const handleRelease = (): void => {
      if (!cancelled && ACTIVE_PHASES.has(useGameStore.getState().phase)) {
        void navigator.wakeLock.request('screen').then((s) => {
          if (cancelled) {
            void s.release().catch(() => undefined);
          } else {
            lockRef.current = s;
            activeSentinel = s;
          }
        }).catch(() => undefined);
      }
    };

    navigator.wakeLock
      .request('screen')
      .then((sentinel) => {
        if (cancelled) {
          void sentinel.release().catch(() => undefined);
          return;
        }
        lockRef.current = sentinel;
        activeSentinel = sentinel;

        // Re-acquire if the lock is released by the system (e.g. tab hidden)
        releaseHandler = handleRelease;
        sentinel.addEventListener('release', releaseHandler);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      // Explicitly remove the release listener before dropping the sentinel
      // reference so there is no chance of it firing after unmount.
      if (activeSentinel && releaseHandler) {
        activeSentinel.removeEventListener('release', releaseHandler);
      }
      if (lockRef.current) {
        void lockRef.current.release().catch(() => undefined);
        lockRef.current = null;
      }
      activeSentinel = null;
      releaseHandler = null;
    };
  }, [isActive]);
}

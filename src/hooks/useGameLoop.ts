import { useEffect, useRef } from 'react';

/**
 * A game loop hook that calls `callback` with the delta time (in ms) on each
 * animation frame. The loop only runs when `active` is true.
 *
 * The callback is called with deltaTime = time elapsed since the last frame in ms.
 * On the first frame after activation, deltaTime is 0.
 *
 * The hook automatically starts/stops when `active` changes.
 * It never calls `callback` with a stale closure — the latest callback ref is always used.
 *
 * @param callback  - Function to call each frame, receives deltaTime in ms
 * @param active    - Whether the loop should be running
 */
export function useGameLoop(callback: (deltaTime: number) => void, active: boolean): void {
  // Keep a stable ref to the callback so we never need to restart the RAF loop
  // when only the callback identity changes.
  const callbackRef = useRef<(deltaTime: number) => void>(callback);

  // Keep the ref in sync with the latest callback via an effect (not during render)
  useEffect(() => {
    callbackRef.current = callback;
  });

  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      // Stop the loop if it was running
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        lastTimeRef.current = null;
      }
      return;
    }

    // Start the loop
    lastTimeRef.current = null;

    const tick = (timestamp: number): void => {
      const lastTime = lastTimeRef.current;
      const deltaTime = lastTime === null ? 0 : timestamp - lastTime;
      lastTimeRef.current = timestamp;

      callbackRef.current(deltaTime);

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        lastTimeRef.current = null;
      }
    };
  }, [active]);
}

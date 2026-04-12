import { useEffect } from 'react';

import { useGameStore } from '@/state/game.store';
import { useSettingsStore } from '@/state/settings.store';

/**
 * When "Auto Roll" is enabled, automatically rolls dice when it's the human player's turn.
 * Adds a short delay so the transition is visible.
 */
export function useAutoRoll(): void {
  const phase = useGameStore((s) => s.phase);
  const gameMode = useGameStore((s) => s.gameMode);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const handleRollDice = useGameStore((s) => s.handleRollDice);
  const autoRoll = useSettingsStore((s) => s.autoRoll);

  useEffect(() => {
    if (!autoRoll) { return; }
    if (phase !== 'rolling') { return; }
    // Block auto-roll during AI turn
    if (gameMode === 'pva' && currentPlayer === 'black') { return; }

    const t = setTimeout(() => {
      handleRollDice();
    }, 600);
    return () => clearTimeout(t);
  }, [autoRoll, phase, gameMode, currentPlayer, handleRollDice]);
}

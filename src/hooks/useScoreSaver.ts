import { useEffect, useRef } from 'react';

import { useGameStore } from '@/state/game.store';
import { useHighScoreStore } from '@/state/highScore.store';
import { checkersRemaining } from '@/utils/bearOff';
import { calcScore } from '@/utils/score';

/**
 * Side-effect hook that persists a high-score record to IndexedDB
 * whenever the game phase transitions to 'game-over'.
 *
 * Fires exactly once per game-over event (guarded by a ref that resets
 * when the phase leaves 'game-over').
 */
export function useScoreSaver(): void {
  const phase = useGameStore((s) => s.phase);
  const winner = useGameStore((s) => s.winner);
  const board = useGameStore((s) => s.board);
  const timerElapsed = useGameStore((s) => s.timerElapsed);
  const difficulty = useGameStore((s) => s.difficulty);
  const gameMode = useGameStore((s) => s.gameMode);
  const addScore = useHighScoreStore((s) => s.addScore);

  const savedRef = useRef(false);

  useEffect(() => {
    if (phase !== 'game-over') {
      savedRef.current = false;
      return;
    }

    if (savedRef.current || winner === null) {
      return;
    }

    savedRef.current = true;

    const loserPlayer = winner === 'white' ? 'black' : 'white';
    const margin = checkersRemaining(board.borneOff[loserPlayer]);
    const score = calcScore(timerElapsed, difficulty, margin);

    void addScore({
      score,
      difficulty,
      gameMode,
      date: new Date(),
      duration: timerElapsed,
      margin,
    });
  }, [phase, winner, board, timerElapsed, difficulty, gameMode, addScore]);
}

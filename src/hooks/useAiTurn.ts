import { useEffect, useRef } from 'react';

import type { AiRequest } from '@/ai/types';
import { useAiWorker } from '@/hooks/useAiWorker';
import { useGameStore } from '@/state/game.store';

/**
 * Orchestrates the AI player's turn in pva mode.
 * Watches for the 'ai-thinking' phase, rolls dice, requests moves from the AI worker,
 * and applies them sequentially (with delays for animation) before confirming the turn.
 */
export function useAiTurn(): void {
  const phase = useGameStore((s) => s.phase);
  const gameMode = useGameStore((s) => s.gameMode);
  const { requestAiMove } = useAiWorker();

  // Guards against processing the same AI turn more than once
  const processingRef = useRef(false);
  // Tracks pending timeouts so they can be cancelled on unmount
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return (): void => {
      for (const t of timeoutsRef.current) {
        clearTimeout(t);
      }
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (phase !== 'ai-thinking' || gameMode !== 'pva') {
      return;
    }
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;

    // Clear any stale timeouts
    for (const t of timeoutsRef.current) {
      clearTimeout(t);
    }
    timeoutsRef.current = [];

    // Step 1: Roll dice for AI (transitions to 'moving' phase synchronously in the store)
    useGameStore.getState().handleAiRollDice();

    const stateAfterRoll = useGameStore.getState();
    const { board, currentPlayer, dice, remainingDice, difficulty, legalMovesForTurn } = stateAfterRoll;

    // No legal moves — confirm immediately (auto-skip)
    if (legalMovesForTurn.length === 0 || !dice) {
      useGameStore.getState().handleConfirmTurn();
      processingRef.current = false;
      return;
    }

    // Step 2: Ask the AI worker for the best move sequence.
    // Pass remainingDice (not the raw DiceRoll) so the AI sees all 4 dice on doubles.
    const request: AiRequest = { board, player: currentPlayer, dice: remainingDice, difficulty };

    requestAiMove(request)
      .then((response) => {
        const moves = response.moves;

        // Step 3: Apply each move with a delay so animations can play
        // 600ms head-start lets the dice animation finish before the first checker moves
        let delay = 600;
        for (const move of moves) {
          const capturedMove = move;
          const t = setTimeout(() => {
            useGameStore.getState().handleAiSelectMove(capturedMove);
          }, delay);
          timeoutsRef.current.push(t);
          delay += 500; // 500ms per move gives animations room to breathe
        }

        // Step 4: Confirm the turn after all moves are applied
        const confirmT = setTimeout(() => {
          useGameStore.getState().handleConfirmTurn();
          processingRef.current = false;
        }, delay);
        timeoutsRef.current.push(confirmT);
      })
      .catch((err: unknown) => {
        console.error('AI move error:', err);
        // Fallback: confirm turn to avoid getting stuck
        useGameStore.getState().handleConfirmTurn();
        processingRef.current = false;
      });
  }, [phase, gameMode, requestAiMove]);
}

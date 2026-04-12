import { useGameStore } from '@/state/game.store';

/**
 * Shown when a human player rolls dice but has no legal moves available.
 * Displays a brief message and an OK button that skips to the next player's turn.
 */
export function NoMovesOverlay(): React.JSX.Element | null {
  const noMovesMessage = useGameStore((s) => s.noMovesMessage);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const gameMode = useGameStore((s) => s.gameMode);
  const handleSkipTurn = useGameStore((s) => s.handleSkipTurn);

  // Only show for human player turns
  const isAiTurn = gameMode === 'pva' && currentPlayer === 'black';
  if (!noMovesMessage || isAiTurn) {
    return null;
  }

  const playerLabel = currentPlayer === 'white' ? 'White' : 'Black';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto flex flex-col items-center gap-3 rounded-xl
          bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)]
          px-6 py-5 shadow-2xl text-center"
        style={{ animation: 'fadeScaleIn 0.2s ease-out' }}
      >
        <div className="text-3xl">🎲</div>
        <div>
          <p className="font-semibold text-[var(--color-text-primary)] text-sm">
            No valid moves for {playerLabel}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Turn passes to the other player
          </p>
        </div>
        <button
          onClick={handleSkipTurn}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-1.5 text-sm font-medium
            text-white hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
}

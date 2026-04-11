import { useGameOverDialogLogic } from '@/components/GameOverDialog/GameOverDialogLogic';

interface GameOverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNewGame: () => void;
  onHighScores: () => void;
}

export function GameOverDialog({ isOpen, onClose, onNewGame, onHighScores }: GameOverDialogProps): React.JSX.Element | null {
  const { winnerLabel, isPlayerWin, durationFormatted, score } = useGameOverDialogLogic();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-xs rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)]
          p-6 shadow-2xl text-center"
        style={{ animation: 'fadeScaleIn 0.25s ease-out' }}
      >
        <div className="text-5xl mb-3">{isPlayerWin ? '🏆' : '😔'}</div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{winnerLabel}</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-5">
          {isPlayerWin ? 'Congratulations on your victory!' : 'Better luck next time!'}
        </p>

        <div className="flex justify-around mb-6">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-bold text-[var(--color-accent)]">{score.toLocaleString()}</span>
            <span className="text-xs text-[var(--color-text-secondary)]">Score</span>
          </div>
          <div className="w-px bg-[var(--color-surface-border)]" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-bold text-[var(--color-text-primary)] font-mono">{durationFormatted}</span>
            <span className="text-xs text-[var(--color-text-secondary)]">Duration</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onNewGame}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium
              text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={onHighScores}
            className="w-full rounded-lg border border-[var(--color-surface-border)] px-4 py-2.5
              text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            High Scores
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-1.5 text-xs text-[var(--color-text-secondary)]
              hover:text-[var(--color-text-primary)] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

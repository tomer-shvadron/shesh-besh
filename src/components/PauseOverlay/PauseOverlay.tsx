import { usePauseOverlayLogic } from '@/components/PauseOverlay/PauseOverlayLogic';

interface PauseOverlayProps {
  onNewGame: () => void;
  onSettings: () => void;
  onHighScores: () => void;
}

export function PauseOverlay({ onNewGame, onSettings, onHighScores }: PauseOverlayProps): React.JSX.Element | null {
  const { isVisible, onResume } = usePauseOverlayLogic(onNewGame, onSettings, onHighScores);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="flex flex-col items-center gap-6 rounded-2xl bg-[var(--color-surface-raised)]
          border border-[var(--color-surface-border)] p-8 shadow-2xl"
        style={{ animation: 'fadeScaleIn 0.2s ease-out' }}
      >
        <div className="text-5xl">⏸</div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Game Paused</h2>

        <div className="flex flex-col gap-2 w-full min-w-[180px]">
          <button
            onClick={onResume}
            className="w-full rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-medium
              text-white hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
          >
            ▶ Resume
          </button>
          <button
            onClick={onNewGame}
            className="w-full rounded-lg border border-[var(--color-surface-border)] px-6 py-2.5
              text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            🆕 New Game
          </button>
          <button
            onClick={onSettings}
            className="w-full rounded-lg border border-[var(--color-surface-border)] px-6 py-2.5
              text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            ⚙ Settings
          </button>
          <button
            onClick={onHighScores}
            className="w-full rounded-lg border border-[var(--color-surface-border)] px-6 py-2.5
              text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            🏆 High Scores
          </button>
        </div>
      </div>
    </div>
  );
}

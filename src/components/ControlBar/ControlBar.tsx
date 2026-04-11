import { useControlBarLogic } from '@/components/ControlBar/ControlBarLogic';

interface ControlBarProps {
  onNewGame: () => void;
  onSettings: () => void;
  onHighScores: () => void;
  variant?: 'mobile' | 'desktop';
}

function Btn({
  label,
  icon,
  onClick,
  disabled,
  pulse,
  variant,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  pulse?: boolean;
  variant: 'mobile' | 'desktop';
}): React.JSX.Element {
  if (variant === 'desktop') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
          ${
            disabled
              ? 'opacity-40 cursor-not-allowed text-[var(--color-text-secondary)]'
              : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-border)] active:opacity-80'
          }
          ${pulse ? 'animate-pulse' : ''}`}
      >
        <span className="text-base">{icon}</span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-xs transition-colors
        ${
          disabled
            ? 'opacity-40 cursor-not-allowed text-[var(--color-text-secondary)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] active:opacity-80'
        }
        ${pulse ? 'animate-pulse' : ''}`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  );
}

export function ControlBar({ onNewGame, onSettings, onHighScores, variant = 'mobile' }: ControlBarProps): React.JSX.Element {
  const { canUndo, canConfirm, canRoll, isAiThinking, isPaused, isGameOver, onRoll, onUndo, onConfirm, onPause, onResume } =
    useControlBarLogic();

  const allDisabled = isAiThinking || isGameOver;

  if (variant === 'desktop') {
    return (
      <nav className="flex flex-col gap-1">
        <Btn label="Roll Dice" icon="🎲" onClick={onRoll} disabled={allDisabled || !canRoll} variant="desktop" />
        <Btn label="Undo Move" icon="↩" onClick={onUndo} disabled={allDisabled || !canUndo} variant="desktop" />
        <Btn
          label="Confirm Turn"
          icon="✓"
          onClick={onConfirm}
          disabled={allDisabled || !canConfirm}
          pulse={canConfirm}
          variant="desktop"
        />
        <hr className="border-[var(--color-surface-border)] my-1" />
        {isPaused ? (
          <Btn label="Resume" icon="▶" onClick={onResume} disabled={false} variant="desktop" />
        ) : (
          <Btn label="Pause" icon="⏸" onClick={onPause} disabled={isGameOver} variant="desktop" />
        )}
        <Btn label="New Game" icon="🆕" onClick={onNewGame} disabled={false} variant="desktop" />
        <hr className="border-[var(--color-surface-border)] my-1" />
        <Btn label="Settings" icon="⚙" onClick={onSettings} disabled={false} variant="desktop" />
        <Btn label="High Scores" icon="🏆" onClick={onHighScores} disabled={false} variant="desktop" />
      </nav>
    );
  }

  return (
    <footer
      className="flex h-12 shrink-0 items-center justify-around px-1
        bg-[var(--color-surface-raised)] border-t border-[var(--color-surface-border)]"
    >
      <Btn label="Undo" icon="↩" onClick={onUndo} disabled={allDisabled || !canUndo} variant="mobile" />
      {canConfirm ? (
        <Btn label="Confirm" icon="✓" onClick={onConfirm} disabled={allDisabled} pulse={true} variant="mobile" />
      ) : (
        <Btn label="Roll" icon="🎲" onClick={onRoll} disabled={allDisabled || !canRoll} variant="mobile" />
      )}
      {isPaused ? (
        <Btn label="Resume" icon="▶" onClick={onResume} disabled={false} variant="mobile" />
      ) : (
        <Btn label="Pause" icon="⏸" onClick={onPause} disabled={isGameOver} variant="mobile" />
      )}
      <Btn label="New" icon="🆕" onClick={onNewGame} disabled={false} variant="mobile" />
      <Btn label="Settings" icon="⚙" onClick={onSettings} disabled={false} variant="mobile" />
    </footer>
  );
}

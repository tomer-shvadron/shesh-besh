import { useNewGameDialogLogic } from '@/components/NewGameDialog/NewGameDialogLogic';
import type { Difficulty } from '@/engine/types';

interface NewGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DIFFICULTY_INFO: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Relaxed play — random AI moves' },
  { value: 'medium', label: 'Medium', description: 'Balanced challenge — smart positioning' },
  { value: 'hard', label: 'Hard', description: 'Expert AI — evaluates every move' },
];

export function NewGameDialog({ isOpen, onClose }: NewGameDialogProps): React.JSX.Element | null {
  const { step, selectedMode, selectedDifficulty, selectMode, selectDifficulty, startGame, goBack } =
    useNewGameDialogLogic(onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-game-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)]
          p-6 shadow-2xl"
        style={{ animation: 'fadeScaleIn 0.2s ease-out' }}
      >
        {step === 'mode' && (
          <ModeStep
            selectedMode={selectedMode}
            onSelectMode={selectMode}
            onStart={startGame}
            onClose={onClose}
          />
        )}

        {step === 'difficulty' && (
          <DifficultyStep
            selectedDifficulty={selectedDifficulty}
            onSelectDifficulty={selectDifficulty}
            onStart={startGame}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  );
}

function ModeStep({
  selectedMode,
  onSelectMode,
  onStart,
  onClose,
}: {
  selectedMode: string | null;
  onSelectMode: (mode: 'pvp' | 'pva') => void;
  onStart: () => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <>
      <h2 id="new-game-dialog-title" className="text-xl font-bold text-[var(--color-text-primary)] mb-1">New Game</h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-5">Choose your opponent</p>

      <div className="flex flex-col gap-3">
        <ModeCard
          icon="👥"
          title="vs Player"
          description="Pass & play on the same device"
          isSelected={selectedMode === 'pvp'}
          onClick={() => onSelectMode('pvp')}
        />
        <ModeCard
          icon="🤖"
          title="vs AI"
          description="Play against the computer"
          isSelected={selectedMode === 'pva'}
          onClick={() => onSelectMode('pva')}
        />
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg border border-[var(--color-surface-border)] px-4 py-2.5
            text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onStart}
          disabled={selectedMode !== 'pvp'}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors
            ${
              selectedMode === 'pvp'
                ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
                : 'bg-[var(--color-surface-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
            }`}
        >
          {selectedMode === 'pva' ? 'Next →' : 'Start Game'}
        </button>
      </div>
    </>
  );
}

function ModeCard({
  icon,
  title,
  description,
  isSelected,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all
        ${
          isSelected
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
            : 'border-[var(--color-surface-border)] hover:border-[var(--color-accent)]/50'
        }`}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="font-semibold text-[var(--color-text-primary)]">{title}</span>
      <span className="text-xs text-[var(--color-text-secondary)] mt-0.5">{description}</span>
    </button>
  );
}

function DifficultyStep({
  selectedDifficulty,
  onSelectDifficulty,
  onStart,
  onBack,
}: {
  selectedDifficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  onStart: () => void;
  onBack: () => void;
}): React.JSX.Element {
  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-4 transition-colors"
      >
        ← Back
      </button>

      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Choose Difficulty</h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-5">How tough should the AI be?</p>

      <div className="flex flex-col gap-2">
        {DIFFICULTY_INFO.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => onSelectDifficulty(value)}
            className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all
              ${
                selectedDifficulty === value
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-surface-border)] hover:border-[var(--color-accent)]/50'
              }`}
          >
            <div className="flex-1">
              <span className="block font-semibold text-[var(--color-text-primary)] text-sm">{label}</span>
              <span className="block text-xs text-[var(--color-text-secondary)] mt-0.5">{description}</span>
            </div>
            {selectedDifficulty === value && <span className="text-[var(--color-accent)] text-lg">✓</span>}
          </button>
        ))}
      </div>

      <button
        onClick={onStart}
        className="mt-6 w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium
          text-white hover:bg-[var(--color-accent-hover)] transition-colors"
      >
        Start Game
      </button>
    </>
  );
}

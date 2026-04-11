import React from 'react';

import { useTutorialLogic } from '@/components/Tutorial/TutorialLogic';
import type { TutorialStep } from '@/components/Tutorial/TutorialLogic';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

function HighlightIndicator({ area }: { area: NonNullable<TutorialStep['highlightArea']> }): React.JSX.Element {
  const areaStyles: Record<string, string> = {
    board: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-16 rounded-lg',
    bar: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-24 rounded-md',
    dice: 'bottom-20 left-1/2 -translate-x-1/2 w-24 h-12 rounded-md',
    home: 'top-1/2 right-8 -translate-y-1/2 w-28 h-20 rounded-lg',
  };

  return (
    <div
      className={`absolute ${areaStyles[area] ?? ''} border-2 border-[var(--color-accent)] pointer-events-none`}
      style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }}
    />
  );
}

function StepDots({ total, current }: { total: number; current: number }): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Tutorial progress">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === current}
          aria-label={`Step ${i + 1} of ${total}`}
          className={`rounded-full transition-all duration-300
            ${i === current ? 'w-4 h-2 bg-[var(--color-accent)]' : 'w-2 h-2 bg-[var(--color-surface-border)]'}`}
        />
      ))}
    </div>
  );
}

export function Tutorial({ isOpen, onClose }: TutorialProps): React.JSX.Element {
  const { currentStep, totalSteps, step, isLastStep, nextStep, skipTutorial } = useTutorialLogic(onClose);

  if (!isOpen) {
    return <></>;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      {/* Board area highlight */}
      {step.highlightArea && (
        <div className="absolute inset-0 pointer-events-none">
          <HighlightIndicator area={step.highlightArea} />
        </div>
      )}

      {/* Tutorial card */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[var(--color-surface-raised)]
          border border-[var(--color-surface-border)] p-6 shadow-2xl"
        style={{ animation: 'fadeScaleIn 0.2s ease-out' }}
      >
        {/* Step counter & skip */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-medium text-[var(--color-text-secondary)]"
            aria-live="polite"
            aria-atomic="true"
          >
            {currentStep + 1} / {totalSteps}
          </span>
          <button
            onClick={skipTutorial}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
              rounded px-1"
            style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
            aria-label="Skip tutorial"
          >
            Skip
          </button>
        </div>

        {/* Step illustration area */}
        <div
          className="w-full h-24 mb-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)]
            flex items-center justify-center overflow-hidden"
        >
          <StepIllustration area={step.highlightArea} stepIndex={currentStep} />
        </div>

        {/* Title & description */}
        <h2
          id="tutorial-title"
          className="text-lg font-bold text-[var(--color-text-primary)] mb-2"
        >
          {step.title}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {step.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <StepDots total={totalSteps} current={currentStep} />

          <button
            onClick={nextStep}
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white
              hover:bg-[var(--color-accent-hover)] transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
          >
            {isLastStep ? "Let's Play!" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepIllustration({
  area,
  stepIndex,
}: {
  area: TutorialStep['highlightArea'];
  stepIndex: number;
}): React.JSX.Element {
  const illustrations: Record<number, React.JSX.Element> = {
    0: <BoardOverviewIllustration />,
    1: <MoveIllustration />,
    2: <DiceIllustration />,
    3: <BarIllustration />,
    4: <BearOffIllustration />,
  };

  const areaEmoji: Record<string, string> = { dice: '🎲', bar: '🚧', home: '🏠' };
  const emoji = area ? (areaEmoji[area] ?? '🎯') : '🎯';
  const fallback = (
    <span className="text-3xl" aria-hidden="true">
      {emoji}
    </span>
  );

  return illustrations[stepIndex] ?? fallback;
}

function leftCheckerClass(colIdx: number): string {
  if (colIdx === 0) {
    return 'bg-[var(--color-checker-white)] border border-[var(--color-surface-border)]';
  }
  if (colIdx === 2) {
    return 'bg-[var(--color-checker-black)]';
  }
  return 'bg-[var(--color-board-bar)]';
}

function BoardOverviewIllustration(): React.JSX.Element {
  return (
    <div className="flex gap-1 items-center px-4" aria-hidden="true">
      {[5, 3, 5].map((count, colIdx) => (
        <div key={colIdx} className="flex gap-0.5 items-end h-16">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${leftCheckerClass(colIdx)}`}
            />
          ))}
        </div>
      ))}
      <div className="w-4 h-16 rounded bg-[var(--color-board-bar)] mx-1" />
      {[5, 3, 5].map((count, colIdx) => (
        <div key={colIdx + 3} className="flex gap-0.5 items-end h-16">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${colIdx === 2 ? 'bg-[var(--color-checker-white)] border border-[var(--color-surface-border)]' : 'bg-[var(--color-checker-black)]'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function MoveIllustration(): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 px-4" aria-hidden="true">
      <div className="flex flex-col items-center gap-1">
        <div
          className="w-8 h-8 rounded-full bg-[var(--color-checker-white)] border-2 border-[var(--color-accent)]"
          style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }}
        />
        <span className="text-[10px] text-[var(--color-text-secondary)]">Selected</span>
      </div>
      <span className="text-[var(--color-accent)] text-lg">→</span>
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-accent)]/10" />
        <span className="text-[10px] text-[var(--color-text-secondary)]">Target</span>
      </div>
    </div>
  );
}

function DiceIllustration(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      {[4, 4].map((val, i) => (
        <div
          key={i}
          className="w-10 h-10 rounded-lg bg-white border border-[var(--color-surface-border)] shadow
            flex items-center justify-center text-lg font-bold text-gray-800"
        >
          {val}
        </div>
      ))}
      <span className="text-sm text-[var(--color-text-secondary)] ml-1">= 4 moves!</span>
    </div>
  );
}

function BarIllustration(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="w-3 h-3 rounded-full bg-[var(--color-checker-white)] border border-[var(--color-surface-border)]" />
      <span className="text-[var(--color-accent)] font-bold text-lg">→</span>
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-6 h-20 rounded bg-[var(--color-board-bar)] border border-[var(--color-surface-border)] flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-[var(--color-checker-white)] border border-gray-400" />
        </div>
        <span className="text-[9px] text-[var(--color-text-secondary)]">Bar</span>
      </div>
    </div>
  );
}

function BearOffIllustration(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full bg-[var(--color-checker-white)] border border-[var(--color-surface-border)]"
          />
        ))}
      </div>
      <span className="text-[var(--color-accent)] font-bold text-lg">→</span>
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-10 h-16 rounded border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 flex items-end justify-center pb-1">
          <span className="text-xs text-[var(--color-accent)]">Off</span>
        </div>
      </div>
    </div>
  );
}

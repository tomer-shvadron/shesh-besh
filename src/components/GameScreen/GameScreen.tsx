import { useState } from 'react';

import { ControlBar } from '@/components/ControlBar/ControlBar';
import { GameOverDialog } from '@/components/GameOverDialog/GameOverDialog';
import { useGameScreenLogic } from '@/components/GameScreen/GameScreenLogic';
import { HighScoresPanel } from '@/components/HighScoresPanel/HighScoresPanel';
import { MoveHistory } from '@/components/MoveHistory/MoveHistory';
import { NewGameDialog } from '@/components/NewGameDialog/NewGameDialog';
import { NoMovesOverlay } from '@/components/NoMovesOverlay/NoMovesOverlay';
import { PauseOverlay } from '@/components/PauseOverlay/PauseOverlay';
import { SettingsPanel } from '@/components/SettingsPanel/SettingsPanel';
import { TopBar } from '@/components/TopBar/TopBar';
import { Tutorial } from '@/components/Tutorial/Tutorial';
import { BoardCanvas } from '@/renderer/BoardCanvas';

export function GameScreen(): React.JSX.Element {
  const {
    isDesktopLayout,
    showNewGameDialog,
    showGameOverDialog,
    showSettings,
    showHighScores,
    showTutorial,
    openNewGame,
    closeNewGame,
    openSettings,
    closeSettings,
    openHighScores,
    closeHighScores,
    closeGameOver,
    openTutorial,
    closeTutorial,
  } = useGameScreenLogic();

  return (
    <>
      {isDesktopLayout ? (
        <DesktopLayout openNewGame={openNewGame} openSettings={openSettings} openHighScores={openHighScores} />
      ) : (
        <MobileLayout openNewGame={openNewGame} openSettings={openSettings} openHighScores={openHighScores} />
      )}

      {/* Overlays & Dialogs — rendered outside the layout so they float above everything */}
      <PauseOverlay onNewGame={openNewGame} onSettings={openSettings} onHighScores={openHighScores} />

      <NewGameDialog isOpen={showNewGameDialog} onClose={closeNewGame} />

      <GameOverDialog
        isOpen={showGameOverDialog}
        onClose={closeGameOver}
        onNewGame={() => {
          closeGameOver();
          openNewGame();
        }}
        onHighScores={() => {
          closeGameOver();
          openHighScores();
        }}
      />

      <SettingsPanel isOpen={showSettings} onClose={closeSettings} onHowToPlay={openTutorial} />

      <HighScoresPanel isOpen={showHighScores} onClose={closeHighScores} />

      <Tutorial isOpen={showTutorial} onClose={closeTutorial} />
    </>
  );
}

function MobileLayout({
  openNewGame,
  openSettings,
  openHighScores,
}: {
  openNewGame: () => void;
  openSettings: () => void;
  openHighScores: () => void;
}): React.JSX.Element {
  return (
    <div className="relative flex h-full w-full flex-col">
      <TopBar />

      <main className="flex-1 min-h-0">
        <BoardCanvas />
      </main>

      <ControlBar onNewGame={openNewGame} onSettings={openSettings} onHighScores={openHighScores} variant="mobile" />

      <NoMovesOverlay />
    </div>
  );
}

function DesktopLayout({
  openNewGame,
  openSettings,
  openHighScores,
}: {
  openNewGame: () => void;
  openSettings: () => void;
  openHighScores: () => void;
}): React.JSX.Element {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="relative flex h-full w-full flex-col">
      <TopBar />

      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left sidebar */}
        <aside
          className={`flex h-full shrink-0 flex-col
            bg-[var(--color-surface-raised)] border-r border-[var(--color-surface-border)]
            transition-all duration-200
            ${leftOpen ? 'w-48' : 'w-8'}`}
        >
          <button
            onClick={() => setLeftOpen((o) => !o)}
            title={leftOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="flex h-8 w-full items-center justify-center text-[var(--color-text-secondary)]
              hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-border)]
              transition-colors cursor-pointer shrink-0"
          >
            <span className="text-xs">{leftOpen ? '◀' : '▶'}</span>
          </button>
          {leftOpen && (
            <div className="flex-1 flex flex-col gap-2 p-4 overflow-hidden">
              <ControlBar
                onNewGame={openNewGame}
                onSettings={openSettings}
                onHighScores={openHighScores}
                variant="desktop"
              />
            </div>
          )}
        </aside>

        {/* Board */}
        <main className="flex-1 min-w-0 flex items-center justify-center">
          <BoardCanvas />
        </main>

        {/* Right sidebar */}
        <aside
          className={`flex h-full shrink-0 flex-col
            bg-[var(--color-surface-raised)] border-l border-[var(--color-surface-border)]
            transition-all duration-200
            ${rightOpen ? 'w-72' : 'w-8'}`}
        >
          <button
            onClick={() => setRightOpen((o) => !o)}
            title={rightOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="flex h-8 w-full items-center justify-center text-[var(--color-text-secondary)]
              hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-border)]
              transition-colors cursor-pointer shrink-0"
          >
            <span className="text-xs">{rightOpen ? '▶' : '◀'}</span>
          </button>
          {rightOpen && (
            <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
              <MoveHistory />
            </div>
          )}
        </aside>
      </div>

      <NoMovesOverlay />
    </div>
  );
}

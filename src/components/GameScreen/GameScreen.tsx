import { ControlBar } from '@/components/ControlBar/ControlBar';
import { GameOverDialog } from '@/components/GameOverDialog/GameOverDialog';
import { useGameScreenLogic } from '@/components/GameScreen/GameScreenLogic';
import { HighScoresPanel } from '@/components/HighScoresPanel/HighScoresPanel';
import { MoveHistory } from '@/components/MoveHistory/MoveHistory';
import { NewGameDialog } from '@/components/NewGameDialog/NewGameDialog';
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
        <DesktopLayout
          openNewGame={openNewGame}
          openSettings={openSettings}
          openHighScores={openHighScores}
        />
      ) : (
        <MobileLayout
          openNewGame={openNewGame}
          openSettings={openSettings}
          openHighScores={openHighScores}
        />
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

      <ControlBar
        onNewGame={openNewGame}
        onSettings={openSettings}
        onHighScores={openHighScores}
        variant="mobile"
      />
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
  return (
    <div className="relative flex h-full w-full flex-col">
      <TopBar />

      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left sidebar — controls */}
        <aside
          className="flex h-full w-52 shrink-0 flex-col gap-2 p-4
            bg-[var(--color-surface-raised)] border-r border-[var(--color-surface-border)]"
        >
          <ControlBar
            onNewGame={openNewGame}
            onSettings={openSettings}
            onHighScores={openHighScores}
            variant="desktop"
          />
        </aside>

        {/* Board */}
        <main className="flex-1 min-w-0 flex items-center justify-center">
          <BoardCanvas />
        </main>

        {/* Right sidebar — move history */}
        <aside
          className="flex h-full w-52 shrink-0 flex-col p-4
            bg-[var(--color-surface-raised)] border-l border-[var(--color-surface-border)]"
        >
          <MoveHistory />
        </aside>
      </div>
    </div>
  );
}

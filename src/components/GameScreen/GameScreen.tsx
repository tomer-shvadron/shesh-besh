import { useGameScreenLogic } from '@/components/GameScreen/GameScreenLogic';
import { BoardCanvas } from '@/renderer/BoardCanvas';

export function GameScreen(): React.JSX.Element {
  const { isDesktopLayout } = useGameScreenLogic();

  if (isDesktopLayout) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-4 p-4">
        <aside className="flex h-full w-56 flex-col gap-3 rounded-lg bg-[var(--color-surface-raised)] p-4 border border-[var(--color-surface-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Player 1
          </h2>
          <div className="mt-auto flex flex-col gap-2">
            <button className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors">
              New Game
            </button>
          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center h-full">
          <BoardCanvas />
        </main>

        <aside className="flex h-full w-56 flex-col gap-3 rounded-lg bg-[var(--color-surface-raised)] p-4 border border-[var(--color-surface-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Player 2
          </h2>
          <div className="mt-2 flex-1 overflow-y-auto text-xs text-[var(--color-text-secondary)]">
            <p className="italic">Move history will appear here</p>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex h-9 shrink-0 items-center justify-between px-3 bg-[var(--color-surface-raised)] border-b border-[var(--color-surface-border)]">
        <span className="text-xs font-medium">Player 1</span>
        <span className="text-xs font-mono text-[var(--color-text-secondary)]">00:00</span>
        <span className="text-xs font-medium">Player 2</span>
      </header>

      <main className="flex-1 min-h-0">
        <BoardCanvas />
      </main>

      <footer className="flex h-11 shrink-0 items-center justify-around px-2 bg-[var(--color-surface-raised)] border-t border-[var(--color-surface-border)]">
        <button className="rounded-md px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
          Undo
        </button>
        <button className="rounded-md bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors">
          Roll
        </button>
        <button className="rounded-md px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
          New
        </button>
      </footer>
    </div>
  );
}

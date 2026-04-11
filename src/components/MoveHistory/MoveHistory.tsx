import { useEffect, useRef } from 'react';

import { useMoveHistoryLogic } from '@/components/MoveHistory/MoveHistoryLogic';

export function MoveHistory(): React.JSX.Element {
  const { entries, currentTurn } = useMoveHistoryLogic();
  const listRef = useRef<HTMLUListElement | null>(null);

  // Auto-scroll to the bottom when new moves arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
        Move History
      </h3>

      {entries.length === 0 ? (
        <p className="text-xs text-[var(--color-text-secondary)] italic">No moves yet</p>
      ) : (
        <ul ref={listRef} className="flex-1 overflow-y-auto flex flex-col gap-0.5 text-xs">
          {entries.map((entry) => (
            <li
              key={entry.turn}
              className={`flex items-start gap-2 rounded px-2 py-1 transition-colors
                ${entry.turn === currentTurn ? 'bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
            >
              <span className="shrink-0 font-mono w-5 text-right opacity-50">{entry.turn}.</span>
              {/* Player color dot */}
              <span
                className={`mt-0.5 shrink-0 h-2 w-2 rounded-full
                  ${entry.player === 'white' ? 'bg-[var(--color-checker-white)]' : 'bg-[var(--color-checker-black)] border border-[var(--color-surface-border)]'}`}
              />
              <span className="font-mono break-all">{entry.notation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

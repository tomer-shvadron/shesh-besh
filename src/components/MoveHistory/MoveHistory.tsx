import { useEffect, useRef } from 'react';

import { useMoveHistoryLogic } from '@/components/MoveHistory/MoveHistoryLogic';
import type { ClusteredSegment, MoveEntry } from '@/components/MoveHistory/MoveHistoryLogic';
import type { DiceRoll } from '@/engine/types';
import { useSettingsStore } from '@/state/settings.store';

// Pip patterns for die faces (positions as [x,y] fractions of die size, 0=center)
const DICE_FACES: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

interface MiniDieProps {
  value: number;
  dieBg: string;
  diePip: string;
  borderColor: string;
}

function MiniDie({ value, dieBg, diePip, borderColor }: MiniDieProps): React.JSX.Element {
  const size = 22;
  const pad = 3;
  const inner = size - pad * 2;
  const r = 3;
  const pipR = 2;
  const pips = DICE_FACES[value] ?? [];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Die face — theme-aware colors passed as props to avoid CSS var issues in SVG */}
      <rect
        x={pad}
        y={pad}
        width={inner}
        height={inner}
        rx={r}
        ry={r}
        style={{ fill: dieBg, stroke: borderColor, strokeWidth: 0.8 }}
      />
      {pips.map(([fx, fy], i) => {
        const cx = size / 2 + fx * (inner / 2 - pipR - 1.5);
        const cy = size / 2 + fy * (inner / 2 - pipR - 1.5);
        return <circle key={i} cx={cx} cy={cy} r={pipR} style={{ fill: diePip }} />;
      })}
    </svg>
  );
}

function DiceDisplay({ dice }: { dice: DiceRoll | null }): React.JSX.Element | null {
  const { theme } = useSettingsStore();
  if (!dice) {
    return null;
  }

  // Hardcoded per-theme colors — SVG presentation attributes don't reliably resolve
  // CSS custom properties; using direct values avoids invisible dice in all browsers.
  const dieBg = theme === 'dark' ? '#f5f0e8' : '#2a3040';
  const diePip = theme === 'dark' ? '#1a1008' : '#f5f0e8';
  const borderColor = theme === 'dark' ? '#4a3a28' : '#8a9ab0';

  return (
    <span data-testid="move-history-dice" className="flex items-center gap-0.5">
      <MiniDie value={dice[0]} dieBg={dieBg} diePip={diePip} borderColor={borderColor} />
      <MiniDie value={dice[1]} dieBg={dieBg} diePip={diePip} borderColor={borderColor} />
    </span>
  );
}

function MoveArrow(): React.JSX.Element {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" className="shrink-0" style={{ opacity: 0.85 }}>
      <path
        d="M0 4 H9 M7 1 L13 4 L7 7"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Renders a single clustered move chip: `FROM → TO` with optional `×N` badge.
 */
function MoveChip({ seg }: { seg: ClusteredSegment }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono leading-none">
      <span>{seg.from}</span>
      <MoveArrow />
      <span>{seg.to}</span>
      {seg.count > 1 && <span className="text-[11px] font-bold opacity-60 tracking-tight">×{seg.count}</span>}
    </span>
  );
}

/**
 * Compact two-line turn row:
 *   Line 1: [turn#] [player dot] [die][die]
 *   Line 2 (indented): move chips inline — "13→10  8→5" or "13→10 ×4"
 */
function TurnRow({ entry, isCurrentTurn }: { entry: MoveEntry; isCurrentTurn: boolean }): React.JSX.Element {
  return (
    <li
      className={`flex flex-col gap-1 rounded-md px-2 py-2.5 transition-colors text-sm
        border-b border-[var(--color-surface-border)]/30
        ${
          isCurrentTurn
            ? 'bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)]'
        }`}
    >
      {/* Row 1: turn number + player dot + dice */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm min-w-[1.75rem] text-right opacity-50 shrink-0">{entry.turn}.</span>
        {/* Player colour dot — fixed colours for contrast in both themes */}
        <span
          className="shrink-0 h-4 w-4 rounded-full border-2 inline-block"
          style={
            entry.player === 'white'
              ? { background: '#f0e8d0', borderColor: '#7a6a50' }
              : { background: '#2a1a08', borderColor: '#a08060' }
          }
        />
        <DiceDisplay dice={entry.dice} />
      </div>

      {/* Row 2: all moves inline, clustered.
           Indent = turn-number width (min-w-[1.75rem]) + gap-1.5 (0.375rem)
           so the chips align directly below the player color dot in row 1.
           Each chip is wrapped with its preceding separator in a single inline
           flex unit so the separator never appears alone at the start of a
           wrapped line. */}
      <div className="flex flex-wrap items-center gap-y-1 pl-[2.125rem]">
        {entry.isEmpty ? (
          <span className="opacity-50 italic text-xs">no moves</span>
        ) : (
          entry.segments.map((seg, i) => (
            <span key={i} className="inline-flex items-center">
              {i > 0 && (
                <span className="mx-1.5 opacity-75 select-none font-bold" aria-hidden="true">
                  ·
                </span>
              )}
              <MoveChip seg={seg} />
            </span>
          ))
        )}
      </div>
    </li>
  );
}

export function MoveHistory(): React.JSX.Element {
  const { entries, currentTurn } = useMoveHistoryLogic();
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 shrink-0">
        Move History
      </h3>

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] italic">No moves yet</p>
      ) : (
        <ul ref={listRef} className="flex-1 overflow-y-auto flex flex-col gap-1">
          {entries.map((entry) => (
            <TurnRow key={entry.turn} entry={entry} isCurrentTurn={entry.turn === currentTurn} />
          ))}
        </ul>
      )}
    </div>
  );
}

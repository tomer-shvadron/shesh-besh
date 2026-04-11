import { formatDate, useHighScoresPanelLogic } from '@/components/HighScoresPanel/HighScoresPanelLogic';
import type { Tab } from '@/components/HighScoresPanel/HighScoresPanelLogic';

interface HighScoresPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function RankBadge({ rank }: { rank: number }): React.JSX.Element {
  if (rank === 0) {
    return <span>🥇</span>;
  }
  if (rank === 1) {
    return <span>🥈</span>;
  }
  if (rank === 2) {
    return <span>🥉</span>;
  }
  return <span>{rank + 1}</span>;
}

export function HighScoresPanel({ isOpen, onClose }: HighScoresPanelProps): React.JSX.Element | null {
  const { tab, setTab, scores, isLoaded, stats, clearScores } = useHighScoresPanelLogic(isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-96 max-w-full
          bg-[var(--color-surface-raised)] border-l border-[var(--color-surface-border)]
          flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-surface-border)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">High Scores</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-xl leading-none"
            aria-label="Close high scores"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-surface-border)]">
          {(['leaderboard', 'stats'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors capitalize
                ${
                  tab === t
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              {t === 'leaderboard' ? 'Leaderboard' : 'Statistics'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!isLoaded && (
            <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)] text-sm">
              Loading…
            </div>
          )}

          {isLoaded && tab === 'leaderboard' && (
            <>
              {scores.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-secondary)]">
                  <span className="text-3xl">🏆</span>
                  <p className="text-sm">No scores yet. Win a game!</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--color-text-secondary)] border-b border-[var(--color-surface-border)]">
                      <th className="px-3 py-2 text-left w-8">#</th>
                      <th className="px-3 py-2 text-right">Score</th>
                      <th className="px-3 py-2 text-center">Diff.</th>
                      <th className="px-3 py-2 text-center">Time</th>
                      <th className="px-3 py-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((s, i) => (
                      <tr
                        key={s.id ?? i}
                        className={`border-b border-[var(--color-surface-border)] transition-colors
                          ${i === 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}
                      >
                        <td className="px-3 py-2.5 font-bold">
                          <RankBadge rank={i} />
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold">
                          {s.score.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-center capitalize">{s.difficulty}</td>
                        <td className="px-3 py-2.5 text-center font-mono">{formatDuration(s.duration)}</td>
                        <td className="px-3 py-2.5 text-right text-[var(--color-text-secondary)]">
                          {formatDate(s.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {isLoaded && tab === 'stats' && (
            <div className="p-5 flex flex-col gap-4">
              <StatRow label="Total Games" value={String(stats.totalGames)} />
              <hr className="border-[var(--color-surface-border)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                By Difficulty
              </h3>
              <StatRow label="Easy Wins" value={String(stats.easyWins)} />
              <StatRow label="Medium Wins" value={String(stats.mediumWins)} />
              <StatRow label="Hard Wins" value={String(stats.hardWins)} />
            </div>
          )}
        </div>

        {/* Footer — clear button */}
        {isLoaded && scores.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--color-surface-border)]">
            <button
              onClick={() => void clearScores()}
              className="text-xs text-[var(--color-text-secondary)] hover:text-red-400 transition-colors"
            >
              Clear all scores
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function StatRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-sm font-bold text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}

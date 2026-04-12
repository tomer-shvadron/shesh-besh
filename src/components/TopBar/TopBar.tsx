import { useTopBarLogic } from '@/components/TopBar/TopBarLogic';
import type { PlayerInfo } from '@/components/TopBar/TopBarLogic';

function avatarBg(info: PlayerInfo): string {
  if (info.isAi) {
    return 'bg-[var(--color-accent)]';
  }
  if (info.label === 'White') {
    return 'bg-[var(--color-checker-white)]';
  }
  return 'bg-[var(--color-checker-black)]';
}

function ThinkingDots(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
          style={{
            animation: `pulse 0.9s ease-in-out ${i * 0.3}s infinite`,
            animationFillMode: 'both',
          }}
        />
      ))}
    </span>
  );
}

function PlayerBadge({ info, side }: { info: PlayerInfo; side: 'left' | 'right' }): React.JSX.Element {
  const isLeft = side === 'left';

  return (
    <div
      className={`
        w-fit flex items-center gap-2 min-w-0 px-2.5 py-1.5 rounded-lg transition-colors
        ${info.isActive
          ? 'bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/40'
          : 'bg-transparent'
        }
        ${isLeft ? 'flex-row' : 'flex-row-reverse'}
      `}
    >
      {/* Avatar */}
      <div
        className={`
          h-11 w-11 shrink-0 rounded-full border-2 ${avatarBg(info)}
          ${info.isActive
            ? 'border-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent)]'
            : 'border-[var(--color-surface-border)]'
          }
        `}
      />

      {/* Name + sub-label */}
      <div className={`flex flex-col min-w-0 ${isLeft ? 'items-start' : 'items-end'}`}>
        <div className={`flex items-center gap-1 ${isLeft ? '' : 'flex-row-reverse'}`}>
          <span
            className={`text-base font-bold truncate transition-colors ${
              info.isActive
                ? 'text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {info.label}
          </span>
          {info.isThinking && <ThinkingDots />}
        </div>
        {info.isAi && (
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] leading-none mt-0.5">
            Computer
          </span>
        )}
        {info.isActive && !info.isThinking && (
          <span className="text-xs font-medium text-[var(--color-accent)] leading-none mt-0.5">
            Your turn
          </span>
        )}
      </div>
    </div>
  );
}

export function TopBar(): React.JSX.Element {
  const { white, black, timerFormatted, statusLabel } = useTopBarLogic();

  return (
    <header
      className="flex h-20 shrink-0 items-center justify-between px-4 gap-2
        bg-[var(--color-surface-raised)] border-b border-[var(--color-surface-border)]"
    >
      {/* Left — White */}
      <div className="flex-1 min-w-0">
        <PlayerBadge info={white} side="left" />
      </div>

      {/* Center — Timer + status */}
      <div className="flex flex-col items-center shrink-0 gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-base text-[var(--color-text-secondary)]" aria-hidden="true">⏱</span>
          <span className="text-2xl font-mono font-bold text-[var(--color-text-primary)] tabular-nums leading-none">
            {timerFormatted}
          </span>
        </div>
        {statusLabel && (
          <span className="text-xs font-medium text-[var(--color-text-secondary)] text-center leading-none whitespace-nowrap">
            {statusLabel}
          </span>
        )}
      </div>

      {/* Right — Black / AI */}
      <div className="flex-1 min-w-0 flex justify-end">
        <PlayerBadge info={black} side="right" />
      </div>
    </header>
  );
}

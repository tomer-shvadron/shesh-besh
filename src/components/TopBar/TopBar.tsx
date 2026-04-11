import { useTopBarLogic } from '@/components/TopBar/TopBarLogic';
import type { PlayerInfo } from '@/components/TopBar/TopBarLogic';

function avatarColorClass(info: PlayerInfo): string {
  if (info.isAi) {
    return 'bg-[var(--color-accent)] border-[var(--color-accent-hover)]';
  }
  if (info.label === 'White') {
    return 'bg-[var(--color-checker-white)] border-[var(--color-surface-border)]';
  }
  return 'bg-[var(--color-checker-black)] border-[var(--color-surface-border)]';
}

function AvatarCircle({ info }: { info: PlayerInfo }): React.JSX.Element {
  return (
    <div
      className={`h-6 w-6 shrink-0 rounded-full border-2 ${avatarColorClass(info)} ${
        info.isActive ? 'ring-2 ring-[var(--color-accent)]' : ''
      }`}
    />
  );
}

function PlayerBadge({ info, side }: { info: PlayerInfo; side: 'left' | 'right' }): React.JSX.Element {
  const isLeft = side === 'left';

  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Avatar circle */}
      <AvatarCircle info={info} />

      <div className={`flex flex-col min-w-0 ${isLeft ? 'items-start' : 'items-end'}`}>
        <span
          className={`text-xs font-semibold truncate transition-colors ${
            info.isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {info.label}
        </span>
        {info.isAi && (
          <span className="text-[10px] text-[var(--color-accent)] font-medium uppercase tracking-wide">AI</span>
        )}
      </div>

      {info.isActive && (
        <span className={`h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shrink-0 ${isLeft ? '' : ''}`} />
      )}
    </div>
  );
}

export function TopBar(): React.JSX.Element {
  const { white, black, timerFormatted } = useTopBarLogic();

  return (
    <header
      className="flex h-10 shrink-0 items-center justify-between px-3 gap-2
        bg-[var(--color-surface-raised)] border-b border-[var(--color-surface-border)]"
    >
      <div className="flex-1 min-w-0">
        <PlayerBadge info={white} side="left" />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-[var(--color-text-secondary)]">⏱</span>
        <span className="text-xs font-mono text-[var(--color-text-secondary)] tabular-nums">
          {timerFormatted}
        </span>
      </div>

      <div className="flex-1 min-w-0 flex justify-end">
        <PlayerBadge info={black} side="right" />
      </div>
    </header>
  );
}

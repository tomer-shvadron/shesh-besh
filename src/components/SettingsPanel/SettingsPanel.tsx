import { useSettingsPanelLogic } from '@/components/SettingsPanel/SettingsPanelLogic';
import type { Difficulty } from '@/engine/types';
import type { TextureMode, Theme } from '@/state/settings.store';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-[var(--color-text-primary)]">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none
          ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-border)]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </label>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}): React.JSX.Element {
  return (
    <div>
      <span className="block text-sm text-[var(--color-text-primary)] mb-2">{label}</span>
      <div className="flex rounded-lg border border-[var(--color-surface-border)] overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${
                value === opt.value
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps): React.JSX.Element | null {
  const { theme, textureMode, soundEnabled, defaultDifficulty, setTheme, setTextureMode, setSoundEnabled, setDefaultDifficulty } =
    useSettingsPanelLogic();

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Panel — slides from right on mobile, centered modal on desktop */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-full
          bg-[var(--color-surface-raised)] border-l border-[var(--color-surface-border)]
          flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-surface-border)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Settings</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-xl leading-none"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">
              Appearance
            </h3>
            <div className="flex flex-col gap-4">
              <SegmentedControl<Theme>
                label="Theme"
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
                value={theme}
                onChange={setTheme}
              />
              <SegmentedControl<TextureMode>
                label="Board Style"
                options={[
                  { value: 'realistic', label: 'Realistic' },
                  { value: 'programmatic', label: 'Classic' },
                ]}
                value={textureMode}
                onChange={setTextureMode}
              />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">
              Audio
            </h3>
            <Toggle label="Sound Effects" checked={soundEnabled} onChange={setSoundEnabled} />
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">
              Game Defaults
            </h3>
            <SegmentedControl<Difficulty>
              label="Default AI Difficulty"
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
              value={defaultDifficulty}
              onChange={setDefaultDifficulty}
            />
          </section>
        </div>
      </div>
    </>
  );
}

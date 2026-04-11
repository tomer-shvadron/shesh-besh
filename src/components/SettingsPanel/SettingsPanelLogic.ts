import type { Difficulty } from '@/engine/types';
import { useSettingsStore } from '@/state/settings.store';
import type { TextureMode, Theme } from '@/state/settings.store';

export interface SettingsPanelLogicReturn {
  theme: Theme;
  textureMode: TextureMode;
  soundEnabled: boolean;
  defaultDifficulty: Difficulty;
  setTheme: (theme: Theme) => void;
  setTextureMode: (mode: TextureMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDefaultDifficulty: (difficulty: Difficulty) => void;
}

export function useSettingsPanelLogic(): SettingsPanelLogicReturn {
  const theme = useSettingsStore((s) => s.theme);
  const textureMode = useSettingsStore((s) => s.textureMode);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const defaultDifficulty = useSettingsStore((s) => s.defaultDifficulty);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setTextureMode = useSettingsStore((s) => s.setTextureMode);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setDefaultDifficulty = useSettingsStore((s) => s.setDefaultDifficulty);

  return {
    theme,
    textureMode,
    soundEnabled,
    defaultDifficulty,
    setTheme,
    setTextureMode,
    setSoundEnabled,
    setDefaultDifficulty,
  };
}

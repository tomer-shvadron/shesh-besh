import type { Difficulty } from '@/engine/types';
import { useSettingsStore } from '@/state/settings.store';
import type { TextureMode, Theme } from '@/state/settings.store';

export interface SettingsPanelLogicReturn {
  theme: Theme;
  textureMode: TextureMode;
  soundEnabled: boolean;
  defaultDifficulty: Difficulty;
  boardFlipped: boolean;
  autoRoll: boolean;
  setTheme: (theme: Theme) => void;
  setTextureMode: (mode: TextureMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDefaultDifficulty: (difficulty: Difficulty) => void;
  setBoardFlipped: (flipped: boolean) => void;
  setAutoRoll: (v: boolean) => void;
}

export function useSettingsPanelLogic(): SettingsPanelLogicReturn {
  const theme = useSettingsStore((s) => s.theme);
  const textureMode = useSettingsStore((s) => s.textureMode);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const defaultDifficulty = useSettingsStore((s) => s.defaultDifficulty);
  const boardFlipped = useSettingsStore((s) => s.boardFlipped);
  const autoRoll = useSettingsStore((s) => s.autoRoll);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setTextureMode = useSettingsStore((s) => s.setTextureMode);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setDefaultDifficulty = useSettingsStore((s) => s.setDefaultDifficulty);
  const setBoardFlipped = useSettingsStore((s) => s.setBoardFlipped);
  const setAutoRoll = useSettingsStore((s) => s.setAutoRoll);

  return {
    theme,
    textureMode,
    soundEnabled,
    defaultDifficulty,
    boardFlipped,
    autoRoll,
    setTheme,
    setTextureMode,
    setSoundEnabled,
    setDefaultDifficulty,
    setBoardFlipped,
    setAutoRoll,
  };
}

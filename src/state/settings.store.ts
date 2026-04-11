import { create } from 'zustand';

import type { Difficulty } from '@/engine/types';

export type Theme = 'dark' | 'light';
export type TextureMode = 'realistic' | 'programmatic';

interface SettingsState {
  theme: Theme;
  textureMode: TextureMode;
  soundEnabled: boolean;
  defaultDifficulty: Difficulty;
  setTheme: (theme: Theme) => void;
  setTextureMode: (mode: TextureMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDefaultDifficulty: (difficulty: Difficulty) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  textureMode: 'realistic',
  soundEnabled: true,
  defaultDifficulty: 'medium',
  setTheme: (theme) => {
    set({ theme });
  },
  setTextureMode: (textureMode) => {
    set({ textureMode });
  },
  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
  },
  setDefaultDifficulty: (defaultDifficulty) => {
    set({ defaultDifficulty });
  },
}));

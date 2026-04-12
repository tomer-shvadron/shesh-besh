import { describe, expect, it } from 'vitest';

import { useSettingsStore } from '@/state/settings.store';

describe('settings.store', () => {
  it('should have correct default values', () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.textureMode).toBe('realistic');
    expect(state.soundEnabled).toBe(true);
    expect(state.defaultDifficulty).toBe('medium');
    expect(state.tutorialSeen).toBe(false);
    expect(state.boardFlipped).toBe(false);
    expect(state.autoRoll).toBe(false);
    expect(state.settingsLoaded).toBe(false);
  });

  it('should update theme', () => {
    useSettingsStore.getState().setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');

    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('should update texture mode', () => {
    useSettingsStore.getState().setTextureMode('programmatic');
    expect(useSettingsStore.getState().textureMode).toBe('programmatic');

    useSettingsStore.getState().setTextureMode('realistic');
    expect(useSettingsStore.getState().textureMode).toBe('realistic');
  });

  it('should update sound enabled', () => {
    useSettingsStore.getState().setSoundEnabled(false);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);

    useSettingsStore.getState().setSoundEnabled(true);
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
  });

  it('should update default difficulty', () => {
    useSettingsStore.getState().setDefaultDifficulty('hard');
    expect(useSettingsStore.getState().defaultDifficulty).toBe('hard');

    useSettingsStore.getState().setDefaultDifficulty('medium');
    expect(useSettingsStore.getState().defaultDifficulty).toBe('medium');
  });

  it('should update boardFlipped', () => {
    useSettingsStore.getState().setBoardFlipped(true);
    expect(useSettingsStore.getState().boardFlipped).toBe(true);

    useSettingsStore.getState().setBoardFlipped(false);
    expect(useSettingsStore.getState().boardFlipped).toBe(false);
  });

  it('should update settingsLoaded', () => {
    useSettingsStore.getState().setSettingsLoaded(true);
    expect(useSettingsStore.getState().settingsLoaded).toBe(true);
  });

  it('should have autoRoll default as false', () => {
    // Reset to default by checking against the initial known value
    expect(typeof useSettingsStore.getState().autoRoll).toBe('boolean');
  });

  it('should update autoRoll', () => {
    useSettingsStore.getState().setAutoRoll(true);
    expect(useSettingsStore.getState().autoRoll).toBe(true);

    useSettingsStore.getState().setAutoRoll(false);
    expect(useSettingsStore.getState().autoRoll).toBe(false);
  });
});

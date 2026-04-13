import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsPanelLogic } from '@/components/SettingsPanel/SettingsPanelLogic';
import { useSettingsStore } from '@/state/settings.store';

function resetSettingsStore(): void {
  useSettingsStore.setState({
    theme: 'dark',
    textureMode: 'realistic',
    soundEnabled: true,
    defaultDifficulty: 'medium',
    boardFlipped: false,
    autoRoll: false,
  });
}

describe('useSettingsPanelLogic', () => {
  beforeEach(() => {
    resetSettingsStore();
  });

  it('returns current settings from the store', () => {
    const { result } = renderHook(() => useSettingsPanelLogic());
    expect(result.current.theme).toBe('dark');
    expect(result.current.textureMode).toBe('realistic');
    expect(result.current.soundEnabled).toBe(true);
    expect(result.current.defaultDifficulty).toBe('medium');
    expect(result.current.boardFlipped).toBe(false);
    expect(result.current.autoRoll).toBe(false);
  });

  it('setTheme updates theme', () => {
    const { result } = renderHook(() => useSettingsPanelLogic());
    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('setTextureMode updates texture mode', () => {
    const { result } = renderHook(() => useSettingsPanelLogic());
    act(() => {
      result.current.setTextureMode('programmatic');
    });
    expect(result.current.textureMode).toBe('programmatic');
    expect(useSettingsStore.getState().textureMode).toBe('programmatic');
  });

  it('setSoundEnabled toggles sound', () => {
    const { result } = renderHook(() => useSettingsPanelLogic());
    act(() => {
      result.current.setSoundEnabled(false);
    });
    expect(result.current.soundEnabled).toBe(false);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
  });

  it('setDefaultDifficulty updates difficulty', () => {
    const { result } = renderHook(() => useSettingsPanelLogic());
    act(() => {
      result.current.setDefaultDifficulty('hard');
    });
    expect(result.current.defaultDifficulty).toBe('hard');
    expect(useSettingsStore.getState().defaultDifficulty).toBe('hard');
  });

  it('setBoardFlipped updates board flip state', () => {
    const { result } = renderHook(() => useSettingsPanelLogic());
    act(() => {
      result.current.setBoardFlipped(true);
    });
    expect(result.current.boardFlipped).toBe(true);
    expect(useSettingsStore.getState().boardFlipped).toBe(true);
  });

  it('setAutoRoll updates auto roll state', () => {
    const { result } = renderHook(() => useSettingsPanelLogic());
    act(() => {
      result.current.setAutoRoll(true);
    });
    expect(result.current.autoRoll).toBe(true);
    expect(useSettingsStore.getState().autoRoll).toBe(true);
  });
});

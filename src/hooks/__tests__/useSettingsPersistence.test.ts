import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SettingsRecord } from '@/services/database.service';
import { useSettingsStore } from '@/state/settings.store';

// ── Mock database.service ───────────────────────────────────────────────────
const mockGet = vi.fn<(id: string) => Promise<SettingsRecord | undefined>>();
const mockPut = vi.fn<(record: SettingsRecord) => Promise<string>>();

vi.mock('@/services/database.service', () => ({
  db: {
    settings: {
      get: mockGet,
      put: mockPut,
    },
  },
}));

// Must import AFTER vi.mock
const { useSettingsPersistence } = await import('@/hooks/useSettingsPersistence');

// ── Helpers ─────────────────────────────────────────────────────────────────
function resetSettingsStore(): void {
  useSettingsStore.setState({
    theme: 'dark',
    textureMode: 'realistic',
    soundEnabled: true,
    defaultDifficulty: 'medium',
    tutorialSeen: false,
    boardFlipped: false,
    autoRoll: false,
    settingsLoaded: false,
  });
}

const savedRecord: SettingsRecord = {
  id: 'default',
  theme: 'light',
  textureMode: 'programmatic',
  soundEnabled: false,
  defaultDifficulty: 'hard',
  tutorialSeen: true,
  boardFlipped: true,
};

describe('useSettingsPersistence', () => {
  beforeEach(() => {
    resetSettingsStore();
    mockGet.mockReset();
    mockPut.mockReset();
    mockPut.mockResolvedValue('default');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load settings from DB on mount and apply to store', async () => {
    mockGet.mockResolvedValue(savedRecord);

    renderHook(() => useSettingsPersistence());

    await vi.waitFor(() => {
      expect(useSettingsStore.getState().settingsLoaded).toBe(true);
    });

    const state = useSettingsStore.getState();
    expect(state.theme).toBe('light');
    expect(state.textureMode).toBe('programmatic');
    expect(state.soundEnabled).toBe(false);
    expect(state.defaultDifficulty).toBe('hard');
    expect(state.tutorialSeen).toBe(true);
    expect(state.boardFlipped).toBe(true);
  });

  it('should call db.settings.get with "default" on mount', async () => {
    mockGet.mockResolvedValue(undefined);

    renderHook(() => useSettingsPersistence());

    await vi.waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('default');
    });
  });

  it('should mark settingsLoaded even when no record is found in DB', async () => {
    mockGet.mockResolvedValue(undefined);

    renderHook(() => useSettingsPersistence());

    await vi.waitFor(() => {
      expect(useSettingsStore.getState().settingsLoaded).toBe(true);
    });

    // Defaults should remain unchanged
    expect(useSettingsStore.getState().theme).toBe('dark');
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
  });

  it('should mark settingsLoaded even when DB read throws an error', async () => {
    mockGet.mockRejectedValue(new Error('IndexedDB unavailable'));

    renderHook(() => useSettingsPersistence());

    await vi.waitFor(() => {
      expect(useSettingsStore.getState().settingsLoaded).toBe(true);
    });

    // Defaults should remain unchanged
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('should persist settings changes to DB via subscription', async () => {
    mockGet.mockResolvedValue(undefined);

    renderHook(() => useSettingsPersistence());

    await vi.waitFor(() => {
      expect(useSettingsStore.getState().settingsLoaded).toBe(true);
    });

    // Clear any put calls that happened from the load phase
    mockPut.mockClear();

    // Trigger a settings change
    useSettingsStore.getState().setTheme('light');

    await vi.waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
    });

    const putCall = mockPut.mock.calls[0][0];
    expect(putCall.id).toBe('default');
    expect(putCall.theme).toBe('light');
  });

  it('should unsubscribe from store on unmount', async () => {
    mockGet.mockResolvedValue(undefined);

    const { unmount } = renderHook(() => useSettingsPersistence());

    await vi.waitFor(() => {
      expect(useSettingsStore.getState().settingsLoaded).toBe(true);
    });

    mockPut.mockClear();

    unmount();

    // Change settings after unmount
    useSettingsStore.getState().setTheme('light');

    // Give it a tick
    await new Promise((r) => {
      setTimeout(r, 10);
    });

    // Should not have been called since we unsubscribed
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('should persist all current settings fields when store changes', async () => {
    mockGet.mockResolvedValue(undefined);

    renderHook(() => useSettingsPersistence());

    await vi.waitFor(() => {
      expect(useSettingsStore.getState().settingsLoaded).toBe(true);
    });

    mockPut.mockClear();

    useSettingsStore.getState().setSoundEnabled(false);

    await vi.waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
    });

    const putArg = mockPut.mock.calls[0][0];
    // Should include ALL settings fields
    expect(putArg).toHaveProperty('id', 'default');
    expect(putArg).toHaveProperty('theme');
    expect(putArg).toHaveProperty('textureMode');
    expect(putArg).toHaveProperty('soundEnabled', false);
    expect(putArg).toHaveProperty('defaultDifficulty');
    expect(putArg).toHaveProperty('tutorialSeen');
    expect(putArg).toHaveProperty('boardFlipped');
  });
});

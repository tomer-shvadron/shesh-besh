import { useEffect } from 'react';

import { db } from '@/services/database.service';
import { useSettingsStore } from '@/state/settings.store';

const SETTINGS_ID = 'default';

/**
 * Loads persisted settings from IndexedDB on mount and applies them to the
 * Zustand settings store. Subscribes to store changes and saves them back.
 */
export function useSettingsPersistence(): void {
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setTextureMode = useSettingsStore((s) => s.setTextureMode);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setDefaultDifficulty = useSettingsStore((s) => s.setDefaultDifficulty);
  const setTutorialSeen = useSettingsStore((s) => s.setTutorialSeen);

  // Load from DB on mount
  useEffect(() => {
    let cancelled = false;

    db.settings
      .get(SETTINGS_ID)
      .then((record) => {
        if (cancelled || !record) {
          return;
        }
        setTheme(record.theme);
        setTextureMode(record.textureMode);
        setSoundEnabled(record.soundEnabled);
        setDefaultDifficulty(record.defaultDifficulty);
        setTutorialSeen(record.tutorialSeen ?? false);
      })
      .catch(() => {
        // DB read failed — use defaults already in store
      });

    return () => {
      cancelled = true;
    };
  // These setters are stable references from Zustand — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to DB whenever settings change
  useEffect(() => {
    const unsubscribe = useSettingsStore.subscribe((state) => {
      void db.settings.put({
        id: SETTINGS_ID,
        theme: state.theme,
        textureMode: state.textureMode,
        soundEnabled: state.soundEnabled,
        defaultDifficulty: state.defaultDifficulty,
        tutorialSeen: state.tutorialSeen,
      });
    });

    return unsubscribe;
  }, []);
}

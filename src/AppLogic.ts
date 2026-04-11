import { useEffect } from 'react';

import { useSettingsStore } from '@/state/settings.store';
import { lockOrientation } from '@/utils/orientation';

export function useAppLogic(): { themeClass: string } {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    lockOrientation();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.remove('light');
    } else {
      root.classList.add('light');
    }
  }, [theme]);

  return {
    themeClass: theme === 'light' ? 'light' : '',
  };
}

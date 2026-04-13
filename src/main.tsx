import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import { saveGame } from '@/services/gameSave.service';
import { registerWebVitals } from '@/services/webVitals.service';
import { useGameStore } from '@/state/game.store';
import { useSettingsStore } from '@/state/settings.store';

import '@/styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Expose helpers for E2E tests (safe for a game app — no sensitive data)
const win = window as unknown as Record<string, unknown>;
win.__GAME_STORE__ = useGameStore;
win.__SETTINGS_STORE__ = useSettingsStore;
win.__SAVE_GAME__ = saveGame;

// Register Core Web Vitals reporters (LCP, INP, CLS, FCP, TTFB).
// INP can only be measured client-side — Lighthouse in CI cannot see it.
registerWebVitals();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

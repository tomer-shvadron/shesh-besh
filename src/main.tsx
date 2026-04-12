import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import { useGameStore } from '@/state/game.store';

import '@/styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Expose game store for E2E tests
if (import.meta.env.MODE !== 'production') {
  (window as unknown as Record<string, unknown>).__GAME_STORE__ = useGameStore;
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

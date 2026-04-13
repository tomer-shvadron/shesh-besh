import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test-setup.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Canvas renderers + App shell are exercised via E2E. Excluded from the
        // unit-coverage gate until we add headless-canvas tests.
        'src/renderer/drawBoard.ts',
        'src/renderer/drawBoardOverlays.ts',
        'src/renderer/drawCheckers.ts',
        'src/renderer/drawCheckerAnimation.ts',
        'src/renderer/drawDice.ts',
        'src/renderer/drawDiceAnimation.ts',
        'src/renderer/drawHighlights.ts',
        'src/renderer/drawWinCelebration.ts',
        'src/renderer/BoardCanvas.tsx',
        'src/renderer/BoardCanvasLogic.ts',
        'src/renderer/themes/**',
        'src/App.tsx',
        'src/ai/aiWorker.ts',
      ],
    },
  },
});

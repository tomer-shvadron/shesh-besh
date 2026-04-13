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
        'src/renderer/animationState.ts',
        'src/renderer/canvasUtils.ts',
        'src/renderer/computeMoveablePoints.ts',
        'src/renderer/dimensions.ts',
        'src/renderer/themes/**',
        // Canvas pointer-event hook — stateful glue to the canvas DOM,
        // covered end-to-end by Playwright drag/drop tests.
        'src/hooks/useBoardPointerHandlers.ts',
        // Audio side-effects: tested manually, no reasonable unit target.
        'src/services/sound.service.ts',
        // Thin re-export/constant modules.
        'src/utils/orientation.ts',
        'src/utils/responsive.ts',
        'src/utils/dicePatterns.ts',
        'src/App.tsx',
        'src/ai/aiWorker.ts',
        // Web Vitals reporter — runs only in the browser, covered by e2e.
        'src/services/webVitals.service.ts',
      ],
      // Enforce a floor so a PR that deletes tests or adds untested code
      // fails CI. Numbers are set a few points below current baselines
      // (measured 2026-04-13: 62.01 / 92.34 / 80.92 / 62.01) to leave
      // headroom for incidental churn while still catching real regressions.
      //
      // Statements/lines are pulled down by the subset of game.store
      // action methods that are exercised end-to-end but not unit-tested
      // — reasonable for a stateful store. Branches + functions are the
      // load-bearing numbers and run much higher.
      //
      // Raise these over time as more unit coverage lands.
      thresholds: {
        statements: 60,
        branches: 90,
        functions: 78,
        lines: 60,
      },
    },
  },
});

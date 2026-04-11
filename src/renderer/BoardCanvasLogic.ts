import { useCallback, useEffect, useRef } from 'react';

import type { DiceValue } from '@/engine/types';
import { useCanvasResize } from '@/hooks/useCanvasResize';
import { useGameLoop } from '@/hooks/useGameLoop';
import type { BoardDimensions } from '@/renderer/dimensions';
import { drawBoard } from '@/renderer/drawBoard';
import { drawCheckers } from '@/renderer/drawCheckers';
import { drawSingleDie } from '@/renderer/drawDice';
import { drawHighlights } from '@/renderer/drawHighlights';
import { hitTest } from '@/renderer/hitTest';
import { darkTheme } from '@/renderer/themes/dark';
import { lightTheme } from '@/renderer/themes/light';
import type { BoardTheme } from '@/renderer/themes/types';
import { useGameStore } from '@/state/game.store';
import { useSettingsStore } from '@/state/settings.store';

interface BoardCanvasLogicReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Core logic hook for the board canvas.
 * - Manages canvas sizing via ResizeObserver (DPR-aware)
 * - Drives a requestAnimationFrame game loop
 * - Renders board, checkers, highlights, and dice each frame
 * - Handles pointer events via hitTest → game store dispatch
 */
export function useBoardCanvasLogic(): BoardCanvasLogicReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dimensions ref from ResizeObserver (CSS pixels) — not React state to avoid re-renders
  const dimsRef = useCanvasResize(canvasRef, containerRef);

  // Game state from Zustand
  const gameState = useGameStore();
  const { theme: themeName } = useSettingsStore();

  // Stable refs to the latest values for use inside RAF callback
  // Updated via effects (not during render) to satisfy the react-hooks/refs rule.
  const gameStateRef = useRef(gameState);
  const themeRef = useRef<BoardTheme>(themeName === 'dark' ? darkTheme : lightTheme);

  useEffect(() => {
    gameStateRef.current = gameState;
  });

  useEffect(() => {
    themeRef.current = themeName === 'dark' ? darkTheme : lightTheme;
  });

  // ── Render frame ─────────────────────────────────────────────────────────────
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const currentDims = dimsRef.current;
    if (!canvas || !currentDims) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const state = gameStateRef.current;
    const currentTheme = themeRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, currentDims.width, currentDims.height);

    // 1. Draw static board (frame, felt, triangles, bar)
    drawBoard(ctx, currentDims, currentTheme);

    // 2. Draw valid destination highlights (below checkers)
    if (state.validDestinations.length > 0) {
      drawHighlights(ctx, state.validDestinations, currentDims, currentTheme, state.board);
    }

    // 3. Draw checkers
    drawCheckers(ctx, state.board, currentDims, currentTheme, state.selectedPoint);

    // 4. Draw dice in the bar area
    if (state.remainingDice.length > 0) {
      renderDiceInBar(ctx, state.remainingDice, currentDims, currentTheme);
    }
  }, [dimsRef]);

  // Loop is active whenever the canvas has been measured
  useGameLoop(renderFrame, true);

  // ── Pointer event handler ─────────────────────────────────────────────────────
  const handlePointerDown = useCallback((event: PointerEvent): void => {
    const canvas = canvasRef.current;
    const currentDims = dimsRef.current;
    if (!canvas || !currentDims) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;

    const zone = hitTest(cssX, cssY, currentDims);
    if (!zone) {
      return;
    }

    const state = gameStateRef.current;

    if (zone.type === 'bar') {
      // Only meaningful if current player has checkers on bar
      if (state.board.bar[state.currentPlayer] > 0) {
        state.handleSelectPoint('bar');
      }
      return;
    }

    if (zone.type === 'bearOff') {
      if (state.selectedPoint !== null) {
        state.handleSelectDestination('off');
      }
      return;
    }

    if (zone.type === 'point') {
      const { index } = zone;
      const pt = state.board.points[index];
      const hasCurrentPlayerChecker = pt?.player === state.currentPlayer && (pt?.count ?? 0) > 0;

      if (state.selectedPoint !== null) {
        // We have a selected checker — check if this is a valid destination
        if (state.validDestinations.includes(index)) {
          state.handleSelectDestination(index);
        } else if (hasCurrentPlayerChecker) {
          // Re-select a different checker of the same player
          state.handleSelectPoint(index);
        } else {
          // Click elsewhere — deselect by toggling same point
          state.handleSelectPoint(state.selectedPoint);
        }
      } else if (hasCurrentPlayerChecker && state.phase === 'moving') {
        state.handleSelectPoint(index);
      }
    }
  }, [dimsRef]);

  // Attach pointer listener once canvas is available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.addEventListener('pointerdown', handlePointerDown);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [handlePointerDown]);

  return { canvasRef, containerRef };
}

// ─── Dice rendering helper ────────────────────────────────────────────────────

function renderDiceInBar(
  ctx: CanvasRenderingContext2D,
  remainingDice: DiceValue[],
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  const dieSize = Math.min(dims.barWidth * 0.72, 32);
  const spacing = dieSize * 1.3;
  const totalH = dieSize * remainingDice.length + spacing * (remainingDice.length - 1);
  const barCx = dims.barLeft + dims.barWidth / 2;
  const startY = dims.boardTop + dims.boardHeight / 2 - totalH / 2 + dieSize / 2;

  for (let i = 0; i < remainingDice.length; i++) {
    const die = remainingDice[i];
    if (die === undefined) {
      continue;
    }
    const cy = startY + i * spacing;
    drawSingleDie(ctx, barCx, cy, dieSize, die, theme, false);
  }
}

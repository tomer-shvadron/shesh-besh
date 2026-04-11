import { useCallback, useEffect, useRef } from 'react';

import type { DiceValue } from '@/engine/types';
import { useCanvasResize } from '@/hooks/useCanvasResize';
import { useGameLoop } from '@/hooks/useGameLoop';
import {
  animState,
  clearAllAnimations,
  startCheckerMove,
  startDiceRoll,
  startWinCelebration,
  tickAnimations,
} from '@/renderer/animationState';
import type { BoardDimensions } from '@/renderer/dimensions';
import { drawBoard } from '@/renderer/drawBoard';
import { drawCheckerAnimations } from '@/renderer/drawCheckerAnimation';
import { drawCheckers } from '@/renderer/drawCheckers';
import { drawSingleDie } from '@/renderer/drawDice';
import { drawDiceAnimation } from '@/renderer/drawDiceAnimation';
import { drawHighlights } from '@/renderer/drawHighlights';
import { drawWinCelebration, initCelebrationParticles } from '@/renderer/drawWinCelebration';
import { hitTest } from '@/renderer/hitTest';
import { darkTheme } from '@/renderer/themes/dark';
import { lightTheme } from '@/renderer/themes/light';
import type { BoardTheme } from '@/renderer/themes/types';
import { SoundService } from '@/services/sound.service';
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
 * - Renders board, checkers, highlights, dice, and animations each frame
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
  const gameStateRef = useRef(gameState);
  const themeRef = useRef<BoardTheme>(themeName === 'dark' ? darkTheme : lightTheme);

  useEffect(() => {
    gameStateRef.current = gameState;
  });

  useEffect(() => {
    themeRef.current = themeName === 'dark' ? darkTheme : lightTheme;
  });

  // ── Phase / dice transition tracking ──────────────────────────────────────────
  const prevPhaseRef = useRef(gameState.phase);
  const prevRemainingDiceRef = useRef(gameState.remainingDice);
  const prevRemainingDiceLenRef = useRef(gameState.remainingDice.length);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const currentState = gameState;
    const dims = dimsRef.current;

    // ── New game started: clear all animations ─────────────────────────────────
    if (prevPhase !== 'not-started' && currentState.phase === 'opening-roll') {
      clearAllAnimations();
    }

    // ── Dice roll: rolling → moving transition ─────────────────────────────────
    if (prevPhase === 'rolling' && currentState.phase === 'moving') {
      startDiceRoll(currentState.remainingDice);
      SoundService.play('dice-roll');
    }

    // ── Game over ──────────────────────────────────────────────────────────────
    if (prevPhase !== 'game-over' && currentState.phase === 'game-over') {
      const canvasDims = dims ?? { width: 400, height: 300 };
      startWinCelebration();
      initCelebrationParticles(canvasDims.width, canvasDims.height);

      if (currentState.winner === 'white') {
        SoundService.play('win');
      } else {
        SoundService.play('lose');
      }
    }

    prevPhaseRef.current = currentState.phase;
  });

  // ── Checker move: detect remainingDice decrease during 'moving' phase ─────────
  useEffect(() => {
    const currentState = gameState;
    const dims = dimsRef.current;
    const prevLen = prevRemainingDiceLenRef.current;
    const prevDice = prevRemainingDiceRef.current;

    if (currentState.phase === 'moving' && currentState.remainingDice.length < prevLen && dims) {
      // A move was made — find it in pendingMoves (last entry)
      const lastMove = currentState.pendingMoves[currentState.pendingMoves.length - 1];

      if (lastMove) {
        const { from, to } = lastMove;
        const board = currentState.board;

        // Determine if it was a hit: the destination point had opponent checkers before
        // We check the board state before the move using the previous board snapshot.
        // A simpler heuristic: if the destination point now has exactly 1 checker of
        // the current player after moving (it was a blot capture), it was a hit.
        const destPoint = to !== 'off' ? board.points[to] : null;
        const isHit = destPoint !== null &&
          destPoint !== undefined &&
          destPoint.player === currentState.currentPlayer &&
          destPoint.count === 1;

        // Source count: use prevDice length as a proxy — we approximate from=1
        const fromCount = from === 'bar'
          ? board.bar[currentState.currentPlayer] + 1
          : (board.points[from]?.count ?? 1) + 1;
        const toCount = to === 'off' ? 1 : (destPoint?.count ?? 1);

        startCheckerMove(from, to, dims, currentState.currentPlayer, isHit, fromCount, toCount);

        if (isHit) {
          SoundService.play('hit');
        } else {
          SoundService.play('checker-place');
        }
      }

      // Suppress unused variable warnings — prevDice is stored for future reference
      void prevDice;
    }

    prevRemainingDiceLenRef.current = currentState.remainingDice.length;
    prevRemainingDiceRef.current = currentState.remainingDice;
  });

  // ── Render frame ──────────────────────────────────────────────────────────────
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
    const now = performance.now();

    // 1. Tick animations (remove finished ones)
    tickAnimations(now);

    // Clear canvas
    ctx.clearRect(0, 0, currentDims.width, currentDims.height);

    // 2. Draw static board (frame, felt, triangles, bar)
    drawBoard(ctx, currentDims, currentTheme);

    // 3. Draw valid destination highlights (below checkers)
    if (state.validDestinations.length > 0) {
      drawHighlights(ctx, state.validDestinations, currentDims, currentTheme, state.board);
    }

    // 4. Draw static checkers
    drawCheckers(ctx, state.board, currentDims, currentTheme, state.selectedPoint);

    // 5. Draw animated checkers on top of static ones
    drawCheckerAnimations(ctx, currentDims, currentTheme, now);

    // 6. Draw dice — animation during roll, static otherwise
    const diceAnimActive = drawDiceAnimation(ctx, currentDims, currentTheme, now);
    if (!diceAnimActive && state.remainingDice.length > 0) {
      renderDiceInBar(ctx, state.remainingDice, currentDims, currentTheme);
    }

    // 7. Win celebration confetti
    if (animState.winCelebration) {
      drawWinCelebration(ctx, currentDims.width, currentDims.height, now);
    }
  }, [dimsRef]);

  // Loop is always active
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
        if (state.validDestinations.includes(index)) {
          state.handleSelectDestination(index);
        } else if (hasCurrentPlayerChecker) {
          state.handleSelectPoint(index);
        } else {
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

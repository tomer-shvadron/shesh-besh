import { useCallback, useEffect, useRef } from 'react';

import { Board } from '@/engine/board';
import type { BoardState, DiceValue, Move, MoveFrom, MoveTo, Player } from '@/engine/types';
import { useBoardPointerHandlers } from '@/hooks/useBoardPointerHandlers';
import type { DragState } from '@/hooks/useBoardPointerHandlers';
import { useCanvasResize } from '@/hooks/useCanvasResize';
import { useGameLoop } from '@/hooks/useGameLoop';
import {
  animState,
  clearAllAnimations,
  isAnimating,
  startCheckerMove,
  startDiceRoll,
  startStackPop,
  startStackPush,
  startWinCelebration,
  tickAnimations,
} from '@/renderer/animationState';
import { computeMoveablePoints } from '@/renderer/computeMoveablePoints';
import { drawBoard } from '@/renderer/drawBoard';
import {
  drawAiThinkingDots,
  drawDraggedCheckerAtPosition,
  drawOpeningRollBanner,
  drawRollHint,
  drawSourceHoverHighlight,
  renderDiceInBar,
} from '@/renderer/drawBoardOverlays';
import { drawCheckerAnimations } from '@/renderer/drawCheckerAnimation';
import { drawCheckers } from '@/renderer/drawCheckers';
import { drawDiceAnimation } from '@/renderer/drawDiceAnimation';
import { drawHighlights } from '@/renderer/drawHighlights';
import { drawWinCelebration, initCelebrationParticles } from '@/renderer/drawWinCelebration';
import { darkTheme } from '@/renderer/themes/dark';
import { lightTheme } from '@/renderer/themes/light';
import type { BoardTheme } from '@/renderer/themes/types';
import { SoundService } from '@/services/sound.service';
import { useGameStore } from '@/state/game.store';
import type { GameStoreState } from '@/state/game.store';
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
 * - Delegates pointer handling to `useBoardPointerHandlers`
 */
export function useBoardCanvasLogic(): BoardCanvasLogicReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dirty flag driving the idle-skip optimisation. Starts true so the first frame
  // always paints. Set to true whenever ANY input to renderFrame changes
  // (game state, theme, dims, hover/drag state, pending moves). Cleared after a
  // successful paint. If animations are active we render regardless.
  const needsRedrawRef = useRef(true);
  const markDirty = useCallback((): void => {
    needsRedrawRef.current = true;
  }, []);

  // Dimensions ref from ResizeObserver (CSS pixels) — not React state to avoid re-renders
  const dimsRef = useCanvasResize(canvasRef, containerRef, markDirty);

  // Game state from Zustand
  const gameState = useGameStore();
  const { theme: themeName, boardFlipped } = useSettingsStore();

  // Stable refs to the latest values for use inside RAF callback
  const gameStateRef = useRef<GameStoreState>(gameState);
  const themeRef = useRef<BoardTheme>(themeName === 'dark' ? darkTheme : lightTheme);
  const boardFlippedRef = useRef(boardFlipped);

  useEffect(() => {
    gameStateRef.current = gameState;
    needsRedrawRef.current = true;
  });

  useEffect(() => {
    themeRef.current = themeName === 'dark' ? darkTheme : lightTheme;
    needsRedrawRef.current = true;
  }, [themeName]);

  useEffect(() => {
    boardFlippedRef.current = boardFlipped;
    needsRedrawRef.current = true;
  }, [boardFlipped]);

  // ── Set of points (and 'bar') that have at least one legal move available ────
  // Updated each render via the useEffect below. Used to suppress cursor/hover on
  // checkers that technically belong to the current player but cannot be moved.
  const moveablePointsRef = useRef<Set<number | 'bar'>>(new Set());

  // ── Compute which checker positions have at least one legal move ──────────────
  // Re-runs whenever game state changes (no deps = runs after every render).
  useEffect(() => {
    const state = gameStateRef.current;
    if (state.phase === 'moving' && state.remainingDice.length > 0) {
      moveablePointsRef.current = computeMoveablePoints(
        state.board,
        state.pendingMoves,
        state.currentPlayer,
        state.remainingDice,
      );
    } else {
      moveablePointsRef.current = new Set();
    }
  });

  // ── Hover state (plain ref — which playable checker the pointer is over) ─────
  const hoverRef = useRef<MoveFrom | null>(null);

  // ── Hovered destination ref — tracks which valid destination the pointer is over ─
  // Used to animate the destination highlight (grow/pulse) when pointer hovers it,
  // both during active drag (tracked in dragRef.hoveredDest) and after a click-select
  // (tracked here). Separate from hoverRef which is only for source checker glows.
  const clickHoverDestRef = useRef<MoveTo | null>(null);

  // ── Tracks whether the last committed move was via drag (suppresses stack pop) ─
  const lastMoveWasDragRef = useRef(false);

  // ── Return-animation tracking: suppress top checker at source during fly-back ──
  // When drag is cancelled, the checker animates from pointer back to its origin.
  // Without this ref, the pile renders the full count AND the animation shows the
  // same checker flying — resulting in a visual double. We suppress the top checker
  // at `from` until the 250ms return animation finishes.
  const dragReturnFromRef = useRef<{ from: MoveFrom; endTime: number } | null>(null);

  // ── Drag state (plain ref — no re-renders on pointer move) ──────────────────
  const dragRef = useRef<DragState | null>(null);

  // ── displayBoard cache: re-apply pending moves on top of the committed board
  //    only when something relevant changed. Without this, the RAF loop would
  //    re-run `Board.fromState().applyMove()` up to 4× per frame at 60fps.
  const displayBoardCacheRef = useRef<{
    boardRef: BoardState;
    pendingMovesRef: Move[];
    value: BoardState;
  } | null>(null);

  // ── Tracks whether the last painted frame was in an "interactive" state
  //    (drag/hover active). Used to force one final paint when the pointer leaves,
  //    so the old hover glow / drag ghost is cleared before the loop goes idle.
  const prevInteractiveRef = useRef(false);

  // ── Phase / dice transition tracking ──────────────────────────────────────────
  const prevPhaseRef = useRef(gameState.phase);
  const prevRemainingDiceRef = useRef(gameState.remainingDice);
  const prevRemainingDiceLenRef = useRef(gameState.remainingDice.length);

  useEffect(() => {
    const currentState = gameState;
    const dims = dimsRef.current;
    const prevPhase = prevPhaseRef.current;
    const prevLen = prevRemainingDiceLenRef.current;
    const prevDice = prevRemainingDiceRef.current;

    // ── New game: clear all animations ───────────────────────────────────────────
    if (prevPhase !== 'not-started' && currentState.phase === 'opening-roll') {
      clearAllAnimations();
    }

    // ── Dice roll animation: phase transition → moving ────────────────────────────
    if (
      (prevPhase === 'rolling' ||
        prevPhase === 'opening-roll' ||
        prevPhase === 'ai-thinking' ||
        prevPhase === 'opening-roll-done') &&
      currentState.phase === 'moving'
    ) {
      // Always animate exactly 2 dice (the rolled pair) — for doubles, the ×N badge
      // handles remaining moves; passing 4 values would briefly show 4 dice.
      const animDice: DiceValue[] =
        currentState.dice !== null
          ? [currentState.dice[0], currentState.dice[1]]
          : currentState.remainingDice.slice(0, 2);
      startDiceRoll(animDice);
      SoundService.play('dice-roll');
    }

    // ── Game over ────────────────────────────────────────────────────────────────
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

    // ── Checker move animation ────────────────────────────────────────────────────
    // Fires when a die is consumed. Works for both mid-turn moves (phase stays 'moving')
    // AND the last move of a turn (phase transitions 'moving' → 'rolling'/'ai-thinking').
    const diceDecreased = currentState.remainingDice.length < prevLen;
    const moveJustHappened = diceDecreased && (currentState.phase === 'moving' || prevPhase === 'moving');

    if (moveJustHappened && dims) {
      // Find the last move: in pendingMoves during the turn, or in moveHistory if auto-confirmed
      let lastMove: Move | undefined;
      if (currentState.pendingMoves.length > 0) {
        lastMove = currentState.pendingMoves[currentState.pendingMoves.length - 1];
      } else if (currentState.moveHistory.length > 0) {
        const lastTurn = currentState.moveHistory[currentState.moveHistory.length - 1];
        lastMove = lastTurn?.[lastTurn.length - 1];
      }

      if (lastMove) {
        const { from, to } = lastMove;
        const board = currentState.board;
        const destPoint = to !== 'off' ? board.points[to] : null;
        // After auto-confirm, currentPlayer has SWITCHED — so check opposite
        let movingPlayer: Player;
        if (prevPhase === 'moving' && currentState.phase !== 'moving') {
          movingPlayer = currentState.currentPlayer === 'white' ? 'black' : 'white';
        } else {
          movingPlayer = currentState.currentPlayer;
        }
        const opponent: Player = movingPlayer === 'white' ? 'black' : 'white';
        const isHit =
          destPoint !== null && destPoint !== undefined && destPoint.player === opponent && destPoint.count === 1;

        const fromCount = from === 'bar' ? board.bar[movingPlayer] : (board.points[from]?.count ?? 1);
        let toCount: number;
        if (to === 'off' || isHit) {
          toCount = 0;
        } else {
          toCount = destPoint?.count ?? 0;
        }

        const wasDrag = lastMoveWasDragRef.current;
        lastMoveWasDragRef.current = false; // reset before any early returns

        startCheckerMove(from, to, dims, movingPlayer, isHit, fromCount, toCount, boardFlippedRef.current, wasDrag);

        // Stack animations: only for click-based moves — drag already positioned the checker
        if (!wasDrag) {
          if (fromCount - 1 > 0) {
            startStackPop(from);
          }
          startStackPush(to);
        }

        if (isHit) {
          SoundService.play('hit');
        } else {
          SoundService.play('checker-place');
        }
      }

      void prevDice;
    }

    // ── Update prev-refs (MUST be last) ──────────────────────────────────────────
    prevPhaseRef.current = currentState.phase;
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
    const flipped = boardFlippedRef.current;
    const now = performance.now();

    // 1. Tick animations (remove finished ones)
    tickAnimations(now);

    // Clear expired drag-return suppression
    if (dragReturnFromRef.current && now >= dragReturnFromRef.current.endTime) {
      dragReturnFromRef.current = null;
      needsRedrawRef.current = true;
    }

    // ── Idle early-out ────────────────────────────────────────────────────────────
    // If nothing is animating, no drag/hover is active, and no state has changed
    // since the last paint, we can skip the entire draw phase and save CPU/battery.
    // This keeps the RAF loop running cheaply (so the next state change picks up
    // instantly) without redrawing identical pixels at 60fps.
    //
    // When hover/drag/click-hover-dest transitions from active to null (e.g. the
    // pointer leaves a playable point), we still need ONE final paint to clear the
    // old glow — so we track the previous interactive state and force a redraw on
    // the transition frame.
    const animationsActive = isAnimating();
    const interactiveState =
      dragRef.current !== null || hoverRef.current !== null || clickHoverDestRef.current !== null;
    if (prevInteractiveRef.current && !interactiveState) {
      needsRedrawRef.current = true;
    }
    prevInteractiveRef.current = interactiveState;
    if (!animationsActive && !interactiveState && !needsRedrawRef.current) {
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, currentDims.width, currentDims.height);

    // 2. Draw static board (frame, felt, triangles, bar)
    drawBoard(ctx, currentDims, currentTheme, flipped);

    // Compute the visual board = committed board + any unconfirmed pending moves.
    // Cached across frames: the expensive Board.fromState() + applyMove loop only
    // runs when the committed board or the pending-moves list actually changes.
    let displayBoard: BoardState;
    const cache = displayBoardCacheRef.current;
    if (cache && cache.boardRef === state.board && cache.pendingMovesRef === state.pendingMoves) {
      displayBoard = cache.value;
    } else if (state.pendingMoves.length === 0) {
      displayBoard = state.board;
      displayBoardCacheRef.current = {
        boardRef: state.board,
        pendingMovesRef: state.pendingMoves,
        value: state.board,
      };
    } else {
      let b = Board.fromState(state.board);
      for (const move of state.pendingMoves) {
        b = b.applyMove(move, state.currentPlayer);
      }
      displayBoard = b.getState();
      displayBoardCacheRef.current = {
        boardRef: state.board,
        pendingMovesRef: state.pendingMoves,
        value: displayBoard,
      };
    }

    // Resolve drag state once — used both for hover suppression and checker drawing
    const dragState = dragRef.current; // includes both pre-drag (click) and active-drag

    // 3a. Draw hover glow under playable checker (before static checkers so it renders behind)
    const hoveredSource = hoverRef.current;
    if (hoveredSource !== null && state.phase === 'moving' && !dragState) {
      drawSourceHoverHighlight(
        ctx,
        currentDims,
        currentTheme,
        hoveredSource,
        displayBoard,
        flipped,
        state.currentPlayer,
        now,
      );
    }

    // 3. Draw static checkers using the live (pending-inclusive) board.
    //    While actively dragging, suppress the top checker at the source so only the
    //    floating drag-ghost is visible. During the pre-drag "click" phase (isDragging=false)
    //    keep the checker visible so it still looks selected.
    const activeDrag = dragState?.isDragging ? dragState : null;
    // Suppress top checker at the source during an active drag OR a return animation
    const suppressFrom = activeDrag?.from ?? dragReturnFromRef.current?.from ?? null;
    drawCheckers(ctx, displayBoard, currentDims, currentTheme, state.selectedPoint, flipped, suppressFrom);

    // 4. Draw valid destination highlights ON TOP of checkers so they are always visible.
    //    Prefer dragRef.validDests (set synchronously in pointerdown) over React state
    //    to avoid timing issues where the RAF fires before the next React render cycle.
    //    Hovered destination: drag mode uses dragRef.hoveredDest; click-select mode uses
    //    clickHoverDestRef (cleared during drags, populated when pointer moves over a dest).
    const validDestsForHighlights = dragState ? dragState.validDests : state.validDestinations;
    const hoveredDestForHighlights = activeDrag?.hoveredDest ?? clickHoverDestRef.current ?? null;
    if (validDestsForHighlights.length > 0) {
      drawHighlights(
        ctx,
        validDestsForHighlights,
        currentDims,
        currentTheme,
        displayBoard,
        flipped,
        state.currentPlayer,
        hoveredDestForHighlights,
      );
    }

    // 5. Draw animated checkers on top of static ones
    drawCheckerAnimations(ctx, currentDims, currentTheme, now);

    // 5b. Draw dragged checker at pointer position only when a real drag is in progress
    if (activeDrag) {
      drawDraggedCheckerAtPosition(ctx, currentDims, currentTheme, activeDrag.x, activeDrag.y, activeDrag.player);
    }

    // 6. Draw dice — animation during roll, static otherwise; AI thinking dots when AI is computing
    const diceAnimActive = drawDiceAnimation(ctx, currentDims, currentTheme, now);
    if (!diceAnimActive) {
      if (state.phase === 'ai-thinking') {
        drawAiThinkingDots(ctx, currentDims, currentTheme, now);
      } else if (state.dice !== null) {
        // Show all rolled dice — remaining ones active, used ones grayed in-place
        renderDiceInBar(ctx, state.dice, state.remainingDice, currentDims, currentTheme);
      } else if (state.phase === 'rolling') {
        // Pre-roll: animated cycling die inviting the player to roll
        drawRollHint(ctx, currentDims, currentTheme, now);
      }
    }

    // 6b. Draw opening roll result banner during opening-roll-done
    if (state.phase === 'opening-roll-done') {
      drawOpeningRollBanner(ctx, currentDims, currentTheme, state.openingRolls, state.currentPlayer);
    }

    // 7. Win celebration confetti
    if (animState.winCelebration) {
      drawWinCelebration(ctx, currentDims.width, currentDims.height, now);
    }

    // Painting done — the canvas now matches the current state. Future frames may
    // skip until something changes (see the idle early-out above).
    needsRedrawRef.current = false;
  }, [dimsRef]);

  // Loop is always active
  useGameLoop(renderFrame, true);

  // ── Pointer event handlers ────────────────────────────────────────────────────
  useBoardPointerHandlers({
    canvasRef,
    dimsRef,
    gameStateRef,
    boardFlippedRef,
    moveablePointsRef,
    hoverRef,
    clickHoverDestRef,
    dragRef,
    dragReturnFromRef,
    lastMoveWasDragRef,
    needsRedrawRef,
  });

  return { canvasRef, containerRef };
}

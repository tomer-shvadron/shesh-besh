import { useCallback, useEffect, useRef } from 'react';

import { Board } from '@/engine/board';
import { getValidDestinations } from '@/engine/moveValidator';
import type { BoardState, DiceRoll, DiceValue, Move, MoveFrom, MoveTo, Player } from '@/engine/types';
import { useCanvasResize } from '@/hooks/useCanvasResize';
import { useGameLoop } from '@/hooks/useGameLoop';
import {
  animState,
  clearAllAnimations,
  startCheckerMove,
  startDiceRoll,
  startDragReturn,
  startStackPop,
  startStackPush,
  startWinCelebration,
  tickAnimations,
} from '@/renderer/animationState';
import type { BoardDimensions } from '@/renderer/dimensions';
import { getCheckerY, getPointX } from '@/renderer/dimensions';
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
  const { theme: themeName, boardFlipped } = useSettingsStore();

  // Stable refs to the latest values for use inside RAF callback
  const gameStateRef = useRef(gameState);
  const themeRef = useRef<BoardTheme>(themeName === 'dark' ? darkTheme : lightTheme);
  const boardFlippedRef = useRef(boardFlipped);

  useEffect(() => {
    gameStateRef.current = gameState;
  });

  useEffect(() => {
    themeRef.current = themeName === 'dark' ? darkTheme : lightTheme;
  });

  useEffect(() => {
    boardFlippedRef.current = boardFlipped;
  });

  // ── Compute which checker positions have at least one legal move ──────────────
  // Re-runs whenever game state changes (no deps = runs after every render).
  // IMPORTANT: uses the DISPLAY board (pending moves applied) so that checkers
  // moved via pending moves are correctly identified as moveable at their new position.
  useEffect(() => {
    const state = gameStateRef.current;
    const moveable = new Set<number | 'bar'>();

    if (state.phase === 'moving' && state.remainingDice.length > 0) {
      // Apply pending moves to get the actual visible board state
      let displayBoardState = state.board;
      if (state.pendingMoves.length > 0) {
        let b = Board.fromState(state.board);
        for (const move of state.pendingMoves) {
          b = b.applyMove(move, state.currentPlayer);
        }
        displayBoardState = b.getState();
      }
      const boardInstance = Board.fromState(displayBoardState);
      const player = state.currentPlayer;
      const dice = state.remainingDice;

      // Check bar first
      if (displayBoardState.bar[player] > 0) {
        const dests = getValidDestinations(boardInstance, player, 'bar', dice);
        if (dests.length > 0) {
          moveable.add('bar');
        }
      } else {
        // Check all 24 points on the display board
        for (let i = 0; i < 24; i++) {
          const pt = displayBoardState.points[i];
          if (pt?.player === player && (pt?.count ?? 0) > 0) {
            const dests = getValidDestinations(boardInstance, player, i, dice);
            if (dests.length > 0) {
              moveable.add(i);
            }
          }
        }
      }
    }

    moveablePointsRef.current = moveable;
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

  // ── Set of points (and 'bar') that have at least one legal move available ────
  // Updated each render via the useEffect below. Used to suppress cursor/hover on
  // checkers that technically belong to the current player but cannot be moved.
  const moveablePointsRef = useRef<Set<number | 'bar'>>(new Set());

  // ── Drag state (plain ref — no re-renders on pointer move) ──────────────────
  const dragRef = useRef<{
    from: MoveFrom;
    player: Player;
    x: number; // current pointer CSS x
    y: number; // current pointer CSS y
    startX: number; // pointer CSS x at pointerdown (for drag threshold)
    startY: number; // pointer CSS y at pointerdown
    originX: number; // checker center x on canvas
    originY: number; // checker center y on canvas
    validDests: MoveTo[];
    hoveredDest: MoveTo | null;
    isDragging: boolean; // true once pointer moves past threshold → real drag mode
  } | null>(null);

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
    }

    // Clear canvas
    ctx.clearRect(0, 0, currentDims.width, currentDims.height);

    // 2. Draw static board (frame, felt, triangles, bar)
    drawBoard(ctx, currentDims, currentTheme, flipped);

    // Compute the visual board = committed board + any unconfirmed pending moves.
    // This ensures moved checkers remain visible before the turn is confirmed.
    let displayBoard = state.board;
    if (state.pendingMoves.length > 0) {
      let b = Board.fromState(state.board);
      for (const move of state.pendingMoves) {
        b = b.applyMove(move, state.currentPlayer);
      }
      displayBoard = b.getState();
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
  }, [dimsRef]);

  // Loop is always active
  useGameLoop(renderFrame, true);

  // ── Pointer event handlers ────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (event: PointerEvent): void => {
      const canvas = canvasRef.current;
      const currentDims = dimsRef.current;
      if (!canvas || !currentDims) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const cssX = event.clientX - rect.left;
      const cssY = event.clientY - rect.top;
      const zone = hitTest(cssX, cssY, currentDims, boardFlippedRef.current);
      if (!zone) {
        return;
      }

      const state = gameStateRef.current;

      // Block during AI turn
      if (state.gameMode === 'pva' && state.currentPlayer === 'black') {
        return;
      }

      // Handle roll phases via tap (but not from bearOff zone)
      if (zone.type !== 'bearOff') {
        if (state.phase === 'rolling') {
          state.handleRollDice();
          return;
        }
        if (state.phase === 'opening-roll-done') {
          state.handleConfirmOpeningRoll();
          return;
        }
      }

      if (state.phase !== 'moving') {
        return;
      }

      // Resolve checker at clicked zone using display board
      let displayBoardPoints = state.board.points;
      if (state.pendingMoves.length > 0) {
        let b = Board.fromState(state.board);
        for (const move of state.pendingMoves) {
          b = b.applyMove(move, state.currentPlayer);
        }
        displayBoardPoints = b.getState().points;
      }

      // Bear-off: drop destination only (no drag)
      if (zone.type === 'bearOff') {
        if (state.selectedPoint !== null && state.validDestinations.includes('off')) {
          state.handleSelectDestination('off');
        }
        return;
      }

      // Bar zone
      if (zone.type === 'bar') {
        if (state.board.bar[state.currentPlayer] > 0 && moveablePointsRef.current.has('bar')) {
          const barCx = currentDims.barLeft + currentDims.barWidth / 2;
          const isTopHalf = state.currentPlayer === 'black';
          const barCy = isTopHalf
            ? currentDims.boardTop + currentDims.boardHeight * 0.25
            : currentDims.boardTop + currentDims.boardHeight * 0.75;
          state.handleSelectPoint('bar');
          const freshDests = useGameStore.getState().validDestinations;
          dragRef.current = {
            from: 'bar',
            player: state.currentPlayer,
            x: cssX,
            y: cssY,
            startX: cssX,
            startY: cssY,
            originX: barCx,
            originY: barCy,
            validDests: freshDests,
            hoveredDest: null,
            isDragging: false,
          };
          canvas.setPointerCapture(event.pointerId);
        }
        return;
      }

      // Point zone
      const { index } = zone;
      const pt = displayBoardPoints[index];
      const hasCurrentPlayerChecker = pt?.player === state.currentPlayer && (pt?.count ?? 0) > 0;

      if (hasCurrentPlayerChecker) {
        // If there's already a selected point and this is a valid destination, move there (click)
        if (state.selectedPoint !== null && state.validDestinations.includes(index)) {
          state.handleSelectDestination(index);
          return;
        }

        // Only allow selecting checkers that actually have legal moves
        if (!moveablePointsRef.current.has(index)) {
          return;
        }

        // Select the checker. Also prime a potential drag (drag only activates after threshold).
        const originX = getPointX(currentDims, index, boardFlippedRef.current);
        const checkerIdx = Math.min((pt?.count ?? 1) - 1, 4);
        const originY = getCheckerY(currentDims, index, checkerIdx);

        // If already selected, don't call handleSelectPoint again — that would toggle/deselect.
        // Instead reuse the existing valid destinations so highlights stay visible on drag.
        let freshDests: MoveTo[];
        if (state.selectedPoint === index) {
          freshDests = state.validDestinations;
        } else {
          state.handleSelectPoint(index);
          // Zustand is sync — grab the freshly computed destinations
          freshDests = useGameStore.getState().validDestinations;
        }

        dragRef.current = {
          from: index,
          player: state.currentPlayer,
          x: cssX,
          y: cssY,
          startX: cssX,
          startY: cssY,
          originX,
          originY,
          validDests: freshDests,
          hoveredDest: null,
          isDragging: false, // will flip to true once pointer moves > DRAG_THRESHOLD
        };
        canvas.setPointerCapture(event.pointerId);
      } else if (state.selectedPoint !== null) {
        // Clicking on a non-checker zone: deselect or move
        if (state.validDestinations.includes(index)) {
          state.handleSelectDestination(index);
        } else {
          state.handleSelectPoint(state.selectedPoint); // deselect
        }
      }
    },
    [dimsRef],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent): void => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      const currentDims = dimsRef.current;

      if (!drag) {
        // Update cursor + hover state based on what's under pointer
        if (!canvas || !currentDims) {
          return;
        }
        const rect = canvas.getBoundingClientRect();
        const cssX = event.clientX - rect.left;
        const cssY = event.clientY - rect.top;
        const state = gameStateRef.current;
        const zone = hitTest(cssX, cssY, currentDims, boardFlippedRef.current);
        if (zone && state.phase === 'moving') {
          let displayBoardPoints = state.board.points;
          if (state.pendingMoves.length > 0) {
            let b = Board.fromState(state.board);
            for (const move of state.pendingMoves) {
              b = b.applyMove(move, state.currentPlayer);
            }
            displayBoardPoints = b.getState().points;
          }

          // Valid destination: pointer cursor (takes priority over grab)
          const isValidDest =
            (zone.type === 'point' && state.selectedPoint !== null && state.validDestinations.includes(zone.index)) ||
            (zone.type === 'bearOff' && state.selectedPoint !== null && state.validDestinations.includes('off'));
          if (isValidDest) {
            canvas.style.cursor = 'pointer';
            hoverRef.current = null;
            // Track hovered destination to animate the highlight (grow/brighten)
            clickHoverDestRef.current = zone.type === 'bearOff' ? 'off' : zone.index;
          } else if (zone.type === 'point') {
            const pt = displayBoardPoints[zone.index];
            const hasChecker = pt?.player === state.currentPlayer && (pt?.count ?? 0) > 0;
            const isMoveable = hasChecker && moveablePointsRef.current.has(zone.index);
            canvas.style.cursor = isMoveable ? 'grab' : 'default';
            hoverRef.current = isMoveable ? zone.index : null;
            clickHoverDestRef.current = null;
          } else if (zone.type === 'bar') {
            const hasBarChecker = state.board.bar[state.currentPlayer] > 0;
            const isMoveable = hasBarChecker && moveablePointsRef.current.has('bar');
            canvas.style.cursor = isMoveable ? 'grab' : 'default';
            hoverRef.current = isMoveable ? 'bar' : null;
            clickHoverDestRef.current = null;
          } else {
            canvas.style.cursor = 'default';
            hoverRef.current = null;
            clickHoverDestRef.current = null;
          }
        } else if (zone && (state.phase === 'rolling' || state.phase === 'opening-roll-done')) {
          canvas.style.cursor = 'pointer';
          hoverRef.current = null;
          clickHoverDestRef.current = null;
        } else {
          canvas.style.cursor = 'default';
          hoverRef.current = null;
          clickHoverDestRef.current = null;
        }
        return;
      }

      // While dragging, clear hover/dest state — dragRef tracks these directly
      hoverRef.current = null;
      clickHoverDestRef.current = null;

      if (!canvas || !currentDims) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const newX = event.clientX - rect.left;
      const newY = event.clientY - rect.top;

      // Activate real drag only after pointer moves past threshold (5px)
      const DRAG_THRESHOLD = 5;
      if (!drag.isDragging) {
        const dist = Math.hypot(newX - drag.startX, newY - drag.startY);
        if (dist < DRAG_THRESHOLD) {
          return;
        }
        drag.isDragging = true;
      }

      drag.x = newX;
      drag.y = newY;
      canvas.style.cursor = 'grabbing';

      // Check if hovering over a valid destination
      const zone = hitTest(drag.x, drag.y, currentDims, boardFlippedRef.current);
      let hovered: MoveTo | null = null;
      if (zone) {
        if (zone.type === 'bearOff' && drag.validDests.includes('off')) {
          hovered = 'off';
        } else if (zone.type === 'point' && drag.validDests.includes(zone.index)) {
          hovered = zone.index;
        }
      }
      drag.hoveredDest = hovered;
    },
    [dimsRef],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent): void => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'default';
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      }

      if (!drag) {
        return;
      }

      // Pure click (pointer never moved past threshold): checker stays selected, do nothing
      if (!drag.isDragging) {
        dragRef.current = null;
        return;
      }

      const currentDims = dimsRef.current;
      if (!currentDims) {
        dragRef.current = null;
        return;
      }

      const state = gameStateRef.current;
      const { hoveredDest, from, player, x, y, originX, originY } = drag;
      dragRef.current = null;

      if (hoveredDest !== null && state.validDestinations.includes(hoveredDest)) {
        // Valid drop: execute move — mark as drag so stack pop is suppressed
        lastMoveWasDragRef.current = true;
        state.handleSelectDestination(hoveredDest);
      } else {
        // Invalid drop: deselect and animate return to origin.
        // Suppress the top checker in the pile until the animation finishes (250ms)
        // so the flying checker and the pile checker don't both appear at once.
        state.handleSelectPoint(from); // deselects (toggles)
        dragReturnFromRef.current = { from, endTime: performance.now() + 260 };
        startDragReturn(x, y, originX, originY, player);
      }
    },
    [dimsRef],
  );

  // Attach pointer listeners once canvas is available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  return { canvasRef, containerRef };
}

// ─── Hover highlight (source checker glow when pointer is over a playable piece) ─

function drawSourceHoverHighlight(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  _theme: BoardTheme,
  point: MoveFrom,
  displayBoard: BoardState,
  flipped: boolean,
  currentPlayer: Player,
  now: number,
): void {
  const r = dims.checkerRadius;
  // Slow gentle pulse: alpha between 0.18 and 0.40
  const pulse = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(now / 500));

  let cx: number;
  let cy: number;

  if (point === 'bar') {
    cx = dims.barLeft + dims.barWidth / 2;
    const isTopHalf = currentPlayer === 'black';
    const halfMidY = isTopHalf ? dims.boardTop + dims.boardHeight / 4 : dims.boardTop + (dims.boardHeight * 3) / 4;
    const barCount = currentPlayer === 'white' ? displayBoard.bar.white : displayBoard.bar.black;
    const visibleCount = Math.min(Math.max(barCount, 1), 5);
    const startY = halfMidY - ((visibleCount - 1) / 2) * dims.checkerSpacing;
    cy = startY + (visibleCount - 1) * dims.checkerSpacing;
  } else {
    cx = getPointX(dims, point, flipped);
    const count = displayBoard.points[point]?.count ?? 1;
    cy = getCheckerY(dims, point, Math.min(count - 1, 4));
  }

  // Wide diffuse outer halo
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 220, 50, ${(pulse * 0.55).toFixed(3)})`;
  ctx.fill();

  // Crisp pulsing ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 220, 50, ${(pulse * 2.2).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.stroke();
}

// ─── Dragged checker rendering ────────────────────────────────────────────────

function drawDraggedCheckerAtPosition(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  cx: number,
  cy: number,
  player: Player,
): void {
  const r = dims.checkerRadius;
  const style = player === 'white' ? theme.checkers.white : theme.checkers.black;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = r * 1.2;
  ctx.shadowOffsetX = r * 0.1;
  ctx.shadowOffsetY = r * 0.25;
  ctx.globalAlpha = 0.93;

  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r);
  grad.addColorStop(0, style.gradientLight);
  grad.addColorStop(0.55, style.fill);
  grad.addColorStop(1, style.gradientDark);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const ringR = r * 0.72;
  const ringGrad = ctx.createRadialGradient(
    cx - r * 0.25,
    cy - r * 0.25,
    ringR * 0.1,
    cx - r * 0.1,
    cy - r * 0.1,
    ringR,
  );
  ringGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  ringGrad.addColorStop(0.6, 'rgba(255,255,255,0.10)');
  ringGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();
}

// ─── AI thinking indicator ────────────────────────────────────────────────────

/**
 * Draw three vertically-stacked pulsing dots in the bar center to signal AI is computing.
 */
function drawAiThinkingDots(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  _theme: BoardTheme,
  now: number,
): void {
  const barCx = dims.barLeft + dims.barWidth / 2;
  const dotR = Math.max(3, dims.barWidth * 0.14);
  const gap = dotR * 2.8;
  const centerY = dims.boardTop + dims.boardHeight / 2;

  for (let i = 0; i < 3; i++) {
    // Stagger the bounce wave for each dot (wave period = 900ms)
    const phase = (now / 900 + i / 3) % 1;
    const bounce = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5; // 0..1
    const alpha = 0.3 + 0.7 * bounce;
    const r = dotR * (0.65 + 0.35 * bounce);

    const cy = centerY + (i - 1) * gap;
    ctx.beginPath();
    ctx.arc(barCx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 191, 36, ${alpha.toFixed(2)})`; // amber-400
    ctx.fill();
  }
}

// ─── Opening roll banner ──────────────────────────────────────────────────────

function drawOpeningRollBanner(
  ctx: CanvasRenderingContext2D,
  dims: BoardDimensions,
  theme: BoardTheme,
  openingRolls: { white: DiceValue | null; black: DiceValue | null },
  winner: Player,
): void {
  const { white: whiteRoll, black: blackRoll } = openingRolls;
  if (whiteRoll === null || blackRoll === null) {
    return;
  }

  const cx = dims.boardLeft + dims.boardWidth / 2;
  const cy = dims.boardTop + dims.boardHeight / 2;
  const bannerW = dims.boardWidth * 0.55;
  const bannerH = dims.boardHeight * 0.22;
  const r = 12;

  // Semi-transparent backdrop
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - bannerW / 2, cy - bannerH / 2, bannerW, bannerH, r);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fill();
  ctx.strokeStyle = theme.highlights.valid;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Winner label
  const winnerLabel = winner === 'white' ? 'White' : 'Black';
  ctx.save();
  ctx.font = `bold ${Math.round(dims.boardHeight * 0.048)}px system-ui, sans-serif`;
  ctx.fillStyle = theme.highlights.valid;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${winnerLabel} goes first!`, cx, cy - bannerH * 0.18);

  // Roll values
  ctx.font = `${Math.round(dims.boardHeight * 0.036)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`White: ${whiteRoll}  ·  Black: ${blackRoll}`, cx, cy + bannerH * 0.22);
  ctx.restore();
}

// ─── Roll hint helper ─────────────────────────────────────────────────────────

/**
 * Animated roll invitation: a die face that cycles through values with a pulsing
 * amber glow ring, replacing the old ugly vertical "ROLL" text.
 */
function drawRollHint(ctx: CanvasRenderingContext2D, dims: BoardDimensions, theme: BoardTheme, now: number): void {
  const barCx = dims.barLeft + dims.barWidth / 2;
  const cy = dims.boardTop + dims.boardHeight / 2;
  const dieSize = Math.min(dims.barWidth * 0.82, 36);

  // Cycle through die values every 480ms
  const dieValue = ((Math.floor(now / 480) % 6) + 1) as DiceValue;

  // Slow gentle pulse
  const pulse = 0.5 + 0.5 * Math.sin(now / 700);

  // Diffuse outer glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(barCx, cy, dieSize * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(251,191,36,${(0.06 + 0.1 * pulse).toFixed(3)})`;
  ctx.fill();
  ctx.restore();

  // Die face — slightly pulsing opacity to invite interaction
  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  drawSingleDie(ctx, barCx, cy, dieSize, dieValue, theme, false);
  ctx.restore();

  // "ROLL" label below the die — bright white for max contrast against wood
  // Position is dieSize/2 (bottom edge of die) + dieSize*0.75 (gap) below center
  const labelY = cy + dieSize * 0.5 + dieSize * 0.75;
  const fontSize = Math.max(11, Math.round(dims.barWidth * 0.3));
  ctx.save();
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = `rgba(255,255,255,${(0.65 + 0.3 * pulse).toFixed(3)})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Subtle text shadow for legibility on both light and dark wood
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('ROLL', barCx, labelY);
  ctx.restore();
}

// ─── Dice rendering helper ────────────────────────────────────────────────────

/**
 * Always shows exactly 2 dice (the original rolled values).
 * Used dice render grayed in-place instead of disappearing.
 * Doubles get a remaining-moves badge (×4 → ×3 → ×2 → ×1) instead of 4 separate dice.
 */
function renderDiceInBar(
  ctx: CanvasRenderingContext2D,
  rolledDice: DiceRoll,
  remainingDice: DiceValue[],
  dims: BoardDimensions,
  theme: BoardTheme,
): void {
  const barCx = dims.barLeft + dims.barWidth / 2;
  const boardCy = dims.boardTop + dims.boardHeight / 2;
  const dieSize = Math.min(dims.barWidth * 0.88, 42);
  const spacing = dieSize * 1.55;

  const [rollA, rollB] = rolledDice;
  const isDoubles = rollA === rollB;

  // Position: 2 dice centered vertically
  const totalH = dieSize + spacing;
  const topDieY = boardCy - totalH / 2 + dieSize / 2;
  const botDieY = topDieY + spacing;

  if (isDoubles) {
    // Both dice show same value; gray them out only when all 4 moves consumed
    const allUsed = remainingDice.length === 0;
    drawSingleDie(ctx, barCx, topDieY, dieSize, rollA, theme, allUsed);
    drawSingleDie(ctx, barCx, botDieY, dieSize, rollB, theme, allUsed);

    // Remaining-moves badge
    const badgeCount = remainingDice.length; // 4 → 3 → 2 → 1 → 0
    if (badgeCount > 0) {
      const badgeY = botDieY + dieSize * 0.72;
      const fontSize = Math.max(9, Math.round(dieSize * 0.3));

      // Badge background pill
      const badgeW = dieSize * 0.72;
      const badgeH = fontSize * 1.6;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(barCx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, badgeH / 2);
      ctx.fillStyle = 'rgba(251,191,36,0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Badge text
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(251,191,36,0.90)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`×${badgeCount}`, barCx, badgeY);
    }
    return;
  }

  // Regular roll: determine which die has been used by diff against remainingDice
  const rem = [...remainingDice]; // mutable copy
  const aUsed = !consumeFromArr(rem, rollA);
  const bUsed = !consumeFromArr(rem, rollB);

  drawSingleDie(ctx, barCx, topDieY, dieSize, rollA, theme, aUsed);
  drawSingleDie(ctx, barCx, botDieY, dieSize, rollB, theme, bUsed);
}

/** Remove the first occurrence of `value` from `arr` in-place. Returns true if found. */
function consumeFromArr(arr: DiceValue[], value: DiceValue): boolean {
  const idx = arr.indexOf(value);
  if (idx === -1) {
    return false;
  }
  arr.splice(idx, 1);
  return true;
}

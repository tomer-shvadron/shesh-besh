import { useCallback, useEffect } from 'react';

import { Board } from '@/engine/board';
import type { MoveFrom, MoveTo, Player } from '@/engine/types';
import { startDragReturn } from '@/renderer/animationState';
import { getCheckerY, getPointX } from '@/renderer/dimensions';
import type { BoardDimensions } from '@/renderer/dimensions';
import { hitTest } from '@/renderer/hitTest';
import { useGameStore } from '@/state/game.store';
import type { GameStoreState } from '@/state/game.store';

export interface DragState {
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
}

/**
 * Refs shared between the render loop and the pointer handlers. Passing them
 * as a bundle keeps the hook signature compact while still allowing the handlers
 * to mutate state without triggering React re-renders each pointer move.
 */
export interface BoardPointerHandlerRefs {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  dimsRef: React.RefObject<BoardDimensions | null>;
  gameStateRef: React.RefObject<GameStoreState>;
  boardFlippedRef: React.RefObject<boolean>;
  moveablePointsRef: React.RefObject<Set<number | 'bar'>>;
  hoverRef: React.RefObject<MoveFrom | null>;
  clickHoverDestRef: React.RefObject<MoveTo | null>;
  dragRef: React.RefObject<DragState | null>;
  dragReturnFromRef: React.RefObject<{ from: MoveFrom; endTime: number } | null>;
  lastMoveWasDragRef: React.RefObject<boolean>;
  needsRedrawRef: React.RefObject<boolean>;
}

/**
 * Wire up pointer handlers on the canvas element referenced by `refs.canvasRef`.
 *
 * Behaviour:
 *  - Taps on the bar area trigger rolls during the `rolling` / `opening-roll-done` phases.
 *  - Tap-to-select a moveable checker, then tap a valid destination to move it.
 *  - Alternatively press-and-drag the checker past a 5px threshold to enter drag mode.
 *  - On drop over a valid destination, the move is committed; otherwise the checker
 *    animates back to its origin point.
 *  - All interaction is blocked during the opponent's AI turn.
 *
 * Listeners are attached on mount and removed on unmount. Safe against the canvas
 * element being null during the first render.
 */
export function useBoardPointerHandlers(refs: BoardPointerHandlerRefs): void {
  const {
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
  } = refs;

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
      const zone = hitTest(cssX, cssY, currentDims, boardFlippedRef.current ?? false);
      if (!zone) {
        return;
      }

      const state = gameStateRef.current;
      if (!state) {
        return;
      }

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
        if (state.board.bar[state.currentPlayer] > 0 && moveablePointsRef.current?.has('bar')) {
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
          needsRedrawRef.current = true;
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
        if (!moveablePointsRef.current?.has(index)) {
          return;
        }

        // Select the checker. Also prime a potential drag (drag only activates after threshold).
        const originX = getPointX(currentDims, index, boardFlippedRef.current ?? false);
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
        needsRedrawRef.current = true;
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
    [
      canvasRef,
      dimsRef,
      gameStateRef,
      boardFlippedRef,
      moveablePointsRef,
      dragRef,
      needsRedrawRef,
    ],
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
        if (!state) {
          return;
        }
        const zone = hitTest(cssX, cssY, currentDims, boardFlippedRef.current ?? false);
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
            const isMoveable = hasChecker && (moveablePointsRef.current?.has(zone.index) ?? false);
            canvas.style.cursor = isMoveable ? 'grab' : 'default';
            hoverRef.current = isMoveable ? zone.index : null;
            clickHoverDestRef.current = null;
          } else if (zone.type === 'bar') {
            const hasBarChecker = state.board.bar[state.currentPlayer] > 0;
            const isMoveable = hasBarChecker && (moveablePointsRef.current?.has('bar') ?? false);
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
        needsRedrawRef.current = true;
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
      const zone = hitTest(drag.x, drag.y, currentDims, boardFlippedRef.current ?? false);
      let hovered: MoveTo | null = null;
      if (zone) {
        if (zone.type === 'bearOff' && drag.validDests.includes('off')) {
          hovered = 'off';
        } else if (zone.type === 'point' && drag.validDests.includes(zone.index)) {
          hovered = zone.index;
        }
      }
      drag.hoveredDest = hovered;
      needsRedrawRef.current = true;
    },
    [
      canvasRef,
      dimsRef,
      gameStateRef,
      boardFlippedRef,
      moveablePointsRef,
      hoverRef,
      clickHoverDestRef,
      dragRef,
      needsRedrawRef,
    ],
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
        needsRedrawRef.current = true;
        return;
      }

      const currentDims = dimsRef.current;
      if (!currentDims) {
        dragRef.current = null;
        needsRedrawRef.current = true;
        return;
      }

      const state = gameStateRef.current;
      if (!state) {
        dragRef.current = null;
        needsRedrawRef.current = true;
        return;
      }
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
      needsRedrawRef.current = true;
    },
    [
      canvasRef,
      dimsRef,
      gameStateRef,
      dragRef,
      dragReturnFromRef,
      lastMoveWasDragRef,
      needsRedrawRef,
    ],
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
  }, [canvasRef, handlePointerDown, handlePointerMove, handlePointerUp]);
}

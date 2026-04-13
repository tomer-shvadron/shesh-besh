import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { GameStoreState } from '@/state/game.store';
import { useGameStore } from '@/state/game.store';

// ── Helpers ─────────────────────────────────────────────────────────────────
function setGameState(patch: Partial<GameStoreState>): void {
  useGameStore.setState(patch);
}

function fireKeyDown(
  key: string,
  opts: Partial<KeyboardEventInit> = {},
  target?: HTMLElement,
): void {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key === ' ' ? 'Space' : `Key${key.toUpperCase()}`,
    bubbles: true,
    ...opts,
  });
  if (target) {
    Object.defineProperty(event, 'target', { value: target });
  }
  window.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  let rollDiceSpy: ReturnType<typeof vi.fn>;
  let undoMoveSpy: ReturnType<typeof vi.fn>;
  let confirmOpeningRollSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rollDiceSpy = vi.fn();
    undoMoveSpy = vi.fn();
    confirmOpeningRollSpy = vi.fn();

    useGameStore.getState().initGame('pvp', 'medium');

    setGameState({
      handleRollDice: rollDiceSpy,
      handleUndoMove: undoMoveSpy,
      handleConfirmOpeningRoll: confirmOpeningRollSpy,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call handleRollDice when Space is pressed in rolling phase', () => {
    setGameState({ phase: 'rolling', gameMode: 'pvp', currentPlayer: 'white' });

    renderHook(() => useKeyboardShortcuts());

    fireKeyDown(' ');

    expect(rollDiceSpy).toHaveBeenCalledTimes(1);
  });

  it('should call handleConfirmOpeningRoll when Space is pressed in opening-roll-done phase', () => {
    setGameState({ phase: 'opening-roll-done', gameMode: 'pvp', currentPlayer: 'white' });

    renderHook(() => useKeyboardShortcuts());

    fireKeyDown(' ');

    expect(confirmOpeningRollSpy).toHaveBeenCalledTimes(1);
  });

  it('should call handleUndoMove when Z is pressed in moving phase with pending moves', () => {
    setGameState({
      phase: 'moving',
      gameMode: 'pvp',
      currentPlayer: 'white',
      pendingMoves: [{ from: 5, to: 3, dieUsed: 2 }],
    });

    renderHook(() => useKeyboardShortcuts());

    fireKeyDown('z');

    expect(undoMoveSpy).toHaveBeenCalledTimes(1);
  });

  it('should NOT handle Cmd+Z (metaKey)', () => {
    setGameState({
      phase: 'moving',
      gameMode: 'pvp',
      currentPlayer: 'white',
      pendingMoves: [{ from: 5, to: 3, dieUsed: 2 }],
    });

    renderHook(() => useKeyboardShortcuts());

    fireKeyDown('z', { metaKey: true });

    expect(undoMoveSpy).not.toHaveBeenCalled();
  });

  it('should NOT handle Ctrl+Z (ctrlKey)', () => {
    setGameState({
      phase: 'moving',
      gameMode: 'pvp',
      currentPlayer: 'white',
      pendingMoves: [{ from: 5, to: 3, dieUsed: 2 }],
    });

    renderHook(() => useKeyboardShortcuts());

    fireKeyDown('z', { ctrlKey: true });

    expect(undoMoveSpy).not.toHaveBeenCalled();
  });

  it('should ignore keyboard events when focus is in an INPUT element', () => {
    setGameState({ phase: 'rolling', gameMode: 'pvp', currentPlayer: 'white' });

    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement('input');
    fireKeyDown(' ', {}, input);

    expect(rollDiceSpy).not.toHaveBeenCalled();
  });

  it('should ignore keyboard events when focus is in a TEXTAREA', () => {
    setGameState({ phase: 'rolling', gameMode: 'pvp', currentPlayer: 'white' });

    renderHook(() => useKeyboardShortcuts());

    const textarea = document.createElement('textarea');
    fireKeyDown(' ', {}, textarea);

    expect(rollDiceSpy).not.toHaveBeenCalled();
  });

  it('should ignore keyboard events when focus is in a BUTTON', () => {
    setGameState({ phase: 'rolling', gameMode: 'pvp', currentPlayer: 'white' });

    renderHook(() => useKeyboardShortcuts());

    const button = document.createElement('button');
    fireKeyDown(' ', {}, button);

    expect(rollDiceSpy).not.toHaveBeenCalled();
  });

  it('should block shortcuts during AI turn (pva + black)', () => {
    setGameState({ phase: 'rolling', gameMode: 'pva', currentPlayer: 'black' });

    renderHook(() => useKeyboardShortcuts());

    fireKeyDown(' ');

    expect(rollDiceSpy).not.toHaveBeenCalled();
  });

  it('should remove listener on unmount so events after unmount are ignored', () => {
    setGameState({ phase: 'rolling', gameMode: 'pvp', currentPlayer: 'white' });

    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();

    fireKeyDown(' ');

    expect(rollDiceSpy).not.toHaveBeenCalled();
  });

  it('should not call handleUndoMove when Z is pressed with no pending moves', () => {
    setGameState({
      phase: 'moving',
      gameMode: 'pvp',
      currentPlayer: 'white',
      pendingMoves: [],
    });

    renderHook(() => useKeyboardShortcuts());

    fireKeyDown('z');

    expect(undoMoveSpy).not.toHaveBeenCalled();
  });
});

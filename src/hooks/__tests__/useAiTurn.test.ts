import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiResponse } from '@/ai/types';
import { Board } from '@/engine/board';
import type { GameStoreState } from '@/state/game.store';
import { useGameStore } from '@/state/game.store';

// ── Mock useAiWorker ────────────────────────────────────────────────────────
const mockRequestAiMove = vi.fn<() => Promise<AiResponse>>();

vi.mock('@/hooks/useAiWorker', () => ({
  useAiWorker: (): { requestAiMove: typeof mockRequestAiMove } => ({
    requestAiMove: mockRequestAiMove,
  }),
}));

// Must import AFTER vi.mock so the mock is in place
const { useAiTurn } = await import('@/hooks/useAiTurn');

// ── Helpers ─────────────────────────────────────────────────────────────────
function setGameState(patch: Partial<GameStoreState>): void {
  useGameStore.setState(patch);
}

function resetGameStore(): void {
  useGameStore.getState().initGame('pvp', 'medium');
}

describe('useAiTurn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetGameStore();
    mockRequestAiMove.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should do nothing when phase is not ai-thinking', () => {
    setGameState({ phase: 'rolling', gameMode: 'pva' });

    renderHook(() => useAiTurn());

    expect(mockRequestAiMove).not.toHaveBeenCalled();
  });

  it('should do nothing when gameMode is not pva', () => {
    setGameState({ phase: 'ai-thinking', gameMode: 'pvp' });

    renderHook(() => useAiTurn());

    expect(mockRequestAiMove).not.toHaveBeenCalled();
  });

  it('should call handleConfirmTurn immediately when no legal moves exist', () => {
    const confirmSpy = vi.fn();
    setGameState({
      phase: 'ai-thinking',
      gameMode: 'pva',
      currentPlayer: 'black',
      difficulty: 'medium',
      board: Board.initial().getState(),
      dice: null,
      remainingDice: [],
      legalMovesForTurn: [],
    });

    // Spy on handleConfirmTurn by overriding it
    const originalConfirm = useGameStore.getState().handleConfirmTurn;
    useGameStore.setState({
      handleConfirmTurn: (): void => {
        confirmSpy();
        originalConfirm();
      },
      // Override handleAiRollDice to not actually roll (we control state)
      handleAiRollDice: (): void => {
        // No-op — keep current state with no legal moves
      },
    });

    renderHook(() => useAiTurn());

    // Should call confirmTurn without ever calling requestAiMove
    expect(mockRequestAiMove).not.toHaveBeenCalled();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it('should apply moves with correct timing for doubles (4 moves)', async () => {
    const aiSelectMoveSpy = vi.fn();
    const confirmTurnSpy = vi.fn();

    const moves = [
      { from: 23 as const, to: 20 as const, dieUsed: 3 as const },
      { from: 23 as const, to: 20 as const, dieUsed: 3 as const },
      { from: 12 as const, to: 9 as const, dieUsed: 3 as const },
      { from: 12 as const, to: 9 as const, dieUsed: 3 as const },
    ];

    mockRequestAiMove.mockResolvedValue({ moves });

    setGameState({
      phase: 'ai-thinking',
      gameMode: 'pva',
      currentPlayer: 'black',
      difficulty: 'medium',
      board: Board.initial().getState(),
      dice: [3, 3],
      remainingDice: [3, 3, 3, 3],
      legalMovesForTurn: [moves],
    });

    useGameStore.setState({
      handleAiRollDice: (): void => {
        // No-op — already set dice/remainingDice/legalMovesForTurn
      },
      handleAiSelectMove: aiSelectMoveSpy,
      handleConfirmTurn: confirmTurnSpy,
    });

    renderHook(() => useAiTurn());

    // Allow the microtask for the requestAiMove promise to resolve
    await vi.advanceTimersByTimeAsync(0);

    expect(mockRequestAiMove).toHaveBeenCalledTimes(1);

    // At time 0, no moves applied yet
    expect(aiSelectMoveSpy).not.toHaveBeenCalled();

    // At 600ms, first move
    await vi.advanceTimersByTimeAsync(600);
    expect(aiSelectMoveSpy).toHaveBeenCalledTimes(1);
    expect(aiSelectMoveSpy).toHaveBeenCalledWith(moves[0]);

    // At 1100ms, second move
    await vi.advanceTimersByTimeAsync(500);
    expect(aiSelectMoveSpy).toHaveBeenCalledTimes(2);
    expect(aiSelectMoveSpy).toHaveBeenCalledWith(moves[1]);

    // At 1600ms, third move
    await vi.advanceTimersByTimeAsync(500);
    expect(aiSelectMoveSpy).toHaveBeenCalledTimes(3);

    // At 2100ms, fourth move
    await vi.advanceTimersByTimeAsync(500);
    expect(aiSelectMoveSpy).toHaveBeenCalledTimes(4);

    // At 2600ms, confirm turn
    expect(confirmTurnSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(confirmTurnSpy).toHaveBeenCalledTimes(1);
  });

  it('should fall back to confirmTurn on worker error', async () => {
    const confirmTurnSpy = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mockRequestAiMove.mockRejectedValue(new Error('worker crashed'));

    setGameState({
      phase: 'ai-thinking',
      gameMode: 'pva',
      currentPlayer: 'black',
      difficulty: 'medium',
      board: Board.initial().getState(),
      dice: [3, 1],
      remainingDice: [3, 1],
      legalMovesForTurn: [[{ from: 23, to: 20, dieUsed: 3 }]],
    });

    useGameStore.setState({
      handleAiRollDice: (): void => {
        // No-op
      },
      handleConfirmTurn: confirmTurnSpy,
    });

    renderHook(() => useAiTurn());

    // Allow the rejected promise to settle
    await vi.advanceTimersByTimeAsync(0);

    expect(confirmTurnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should clear timeouts on unmount so they do not fire', async () => {
    const aiSelectMoveSpy = vi.fn();

    const moves = [
      { from: 23 as const, to: 20 as const, dieUsed: 3 as const },
      { from: 12 as const, to: 9 as const, dieUsed: 3 as const },
    ];

    mockRequestAiMove.mockResolvedValue({ moves });

    setGameState({
      phase: 'ai-thinking',
      gameMode: 'pva',
      currentPlayer: 'black',
      difficulty: 'medium',
      board: Board.initial().getState(),
      dice: [3, 1],
      remainingDice: [3, 1],
      legalMovesForTurn: [moves],
    });

    useGameStore.setState({
      handleAiRollDice: (): void => {
        // No-op
      },
      handleAiSelectMove: aiSelectMoveSpy,
      handleConfirmTurn: vi.fn(),
    });

    const { unmount } = renderHook(() => useAiTurn());

    // Allow the promise to resolve
    await vi.advanceTimersByTimeAsync(0);

    // Unmount before any timeouts fire
    unmount();

    // Advance timers past all scheduled timeouts
    await vi.advanceTimersByTimeAsync(5000);

    // No moves should have been applied since we unmounted
    expect(aiSelectMoveSpy).not.toHaveBeenCalled();
  });

  it('should not double-fire when re-rendered with same ai-thinking phase', async () => {
    mockRequestAiMove.mockResolvedValue({ moves: [] });

    setGameState({
      phase: 'ai-thinking',
      gameMode: 'pva',
      currentPlayer: 'black',
      difficulty: 'medium',
      board: Board.initial().getState(),
      dice: [3, 1],
      remainingDice: [3, 1],
      legalMovesForTurn: [[{ from: 23, to: 20, dieUsed: 3 }]],
    });

    const confirmSpy = vi.fn();
    useGameStore.setState({
      handleAiRollDice: (): void => {
        // No-op
      },
      handleConfirmTurn: confirmSpy,
    });

    const { rerender } = renderHook(() => useAiTurn());

    // Allow microtask to resolve
    await vi.advanceTimersByTimeAsync(0);

    // Confirm should fire for the empty-moves case (confirm at delay 600ms)
    await vi.advanceTimersByTimeAsync(600);

    const callsAfterFirst = confirmSpy.mock.calls.length;

    // Re-render with same phase — should not trigger again
    rerender();
    await vi.advanceTimersByTimeAsync(5000);

    expect(confirmSpy.mock.calls.length).toBe(callsAfterFirst);
  });
});

import { describe, expect, it } from 'vitest';

import { useGameStore } from '@/state/game.store';

describe('game.store', () => {
  describe('initGame()', () => {
    it('should start in opening-roll-done phase for pva mode', () => {
      useGameStore.getState().initGame('pva', 'medium');
      const { phase } = useGameStore.getState();
      expect(phase).toBe('opening-roll-done');
    });

    it('should always start in opening-roll-done phase for pvp mode', () => {
      for (let i = 0; i < 10; i++) {
        useGameStore.getState().initGame('pvp', 'medium');
        const { phase } = useGameStore.getState();
        expect(phase).toBe('opening-roll-done');
      }
    });

    it('should reset selected point and valid destinations', () => {
      useGameStore.getState().initGame('pvp', 'medium');
      const state = useGameStore.getState();
      expect(state.selectedPoint).toBeNull();
      expect(state.validDestinations).toHaveLength(0);
    });
  });

  describe('initGame() — opening roll done', () => {
    it('should start in opening-roll-done phase (not moving)', () => {
      useGameStore.getState().initGame('pvp', 'medium');
      const state = useGameStore.getState();
      expect(state.phase).toBe('opening-roll-done');
    });

    it('should have dice set after initGame', () => {
      useGameStore.getState().initGame('pvp', 'medium');
      const state = useGameStore.getState();
      expect(state.dice).not.toBeNull();
      expect(state.remainingDice.length).toBeGreaterThan(0);
    });
  });

  describe('handleConfirmOpeningRoll()', () => {
    it('should transition to moving in pvp mode', () => {
      useGameStore.getState().initGame('pvp', 'medium');
      useGameStore.getState().handleConfirmOpeningRoll();
      const state = useGameStore.getState();
      expect(state.phase).toBe('moving');
    });

    it('should transition to moving or ai-thinking in pva mode', () => {
      useGameStore.getState().initGame('pva', 'medium');
      useGameStore.getState().handleConfirmOpeningRoll();
      const state = useGameStore.getState();
      // white goes first → moving, black (AI) goes first → ai-thinking
      expect(['moving', 'ai-thinking']).toContain(state.phase);
    });
  });

  describe('pva mode turn transitions', () => {
    it('should transition to ai-thinking after white confirms turn in pva mode', () => {
      useGameStore.getState().initGame('pva', 'medium');
      useGameStore.getState().handleConfirmOpeningRoll();

      const { handleConfirmTurn } = useGameStore.getState();

      // Force white to start
      if (useGameStore.getState().currentPlayer !== 'white') {
        return; // AI went first, skip test (it'll get 'rolling' after AI turn)
      }

      // White's turn: currently in 'moving' with initial dice from opening roll
      // handleConfirmTurn will switch to black's AI turn
      handleConfirmTurn();

      const state = useGameStore.getState();
      expect(state.currentPlayer).toBe('black');
      expect(state.phase).toBe('ai-thinking');
    });

    it('should transition back to rolling for white after AI confirms in pva mode', () => {
      // Set up a state where black (AI) just finished moving
      const store = useGameStore.getState();
      store.loadState({
        board: useGameStore.getState().board,
        currentPlayer: 'black',
        phase: 'moving',
        dice: [1, 2],
        remainingDice: [],
        pendingMoves: [],
        moveHistory: [],
        boardHistory: [],
        openingRolls: { white: null, black: null },
        winner: null,
        gameMode: 'pva',
        difficulty: 'medium',
        legalMovesForTurn: [],
        noMovesMessage: false,
        timerElapsed: 0,
      });

      useGameStore.getState().handleConfirmTurn();

      const state = useGameStore.getState();
      expect(state.currentPlayer).toBe('white');
      expect(state.phase).toBe('rolling');
    });
  });

  describe('handleAiRollDice()', () => {
    it('should transition from ai-thinking to moving and set dice', () => {
      useGameStore.getState().loadState({
        board: useGameStore.getState().board,
        currentPlayer: 'black',
        phase: 'ai-thinking',
        dice: null,
        remainingDice: [],
        pendingMoves: [],
        moveHistory: [],
        boardHistory: [],
        openingRolls: { white: null, black: null },
        winner: null,
        gameMode: 'pva',
        difficulty: 'medium',
        legalMovesForTurn: [],
        noMovesMessage: false,
        timerElapsed: 0,
      });

      useGameStore.getState().handleAiRollDice();

      const state = useGameStore.getState();
      expect(state.phase).toBe('moving');
      expect(state.dice).not.toBeNull();
      expect(state.remainingDice.length).toBeGreaterThan(0);
    });

    it('should do nothing if not in ai-thinking phase', () => {
      useGameStore.getState().loadState({
        board: useGameStore.getState().board,
        currentPlayer: 'black',
        phase: 'rolling',
        dice: null,
        remainingDice: [],
        pendingMoves: [],
        moveHistory: [],
        boardHistory: [],
        openingRolls: { white: null, black: null },
        winner: null,
        gameMode: 'pva',
        difficulty: 'medium',
        legalMovesForTurn: [],
        noMovesMessage: false,
        timerElapsed: 0,
      });

      useGameStore.getState().handleAiRollDice();
      expect(useGameStore.getState().phase).toBe('rolling');
    });
  });

  describe('pvp mode turn transitions', () => {
    it('should always go to rolling phase (never ai-thinking) in pvp mode', () => {
      useGameStore.getState().loadState({
        board: useGameStore.getState().board,
        currentPlayer: 'white',
        phase: 'moving',
        dice: [1, 2],
        remainingDice: [],
        pendingMoves: [],
        moveHistory: [],
        boardHistory: [],
        openingRolls: { white: null, black: null },
        winner: null,
        gameMode: 'pvp',
        difficulty: 'medium',
        legalMovesForTurn: [],
        noMovesMessage: false,
        timerElapsed: 0,
      });

      useGameStore.getState().handleConfirmTurn();
      expect(useGameStore.getState().phase).toBe('rolling');

      // Simulate black's pvp turn
      useGameStore.getState().loadState({
        ...useGameStore.getState(),
        currentPlayer: 'black',
        phase: 'moving',
        remainingDice: [],
        pendingMoves: [],
      });
      useGameStore.getState().handleConfirmTurn();
      expect(useGameStore.getState().phase).toBe('rolling');
    });
  });
});

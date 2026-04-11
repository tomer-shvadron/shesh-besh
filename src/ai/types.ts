import type { BoardState, DiceValue, Difficulty, Move, Player } from '@/engine/types';

export interface AiRequest {
  board: BoardState;
  player: Player;
  dice: DiceValue[];
  difficulty: Difficulty;
}

export interface AiResponse {
  moves: Move[];
}

export interface EvalWeights {
  pipCount: number;
  blotExposure: number;
  homeBoardStrength: number;
  blockingPrimes: number;
  barCheckers: number;
  bearingOff: number;
  anchorPosition: number;
}

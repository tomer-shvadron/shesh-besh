export type Player = 'white' | 'black';

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;
export type DiceRoll = [DiceValue, DiceValue];

export type MoveFrom = number | 'bar';
export type MoveTo = number | 'off';

export interface Move {
  from: MoveFrom;
  to: MoveTo;
  dieUsed: DiceValue;
}

export type TurnMoves = Move[];

export interface PointState {
  player: Player | null;
  count: number;
}

export interface BoardState {
  points: PointState[];
  bar: Record<Player, number>;
  borneOff: Record<Player, number>;
}

export type GamePhase = 'not-started' | 'opening-roll' | 'rolling' | 'moving' | 'ai-thinking' | 'game-over' | 'paused';

export type GameMode = 'pvp' | 'pva';

export type Difficulty = 'easy' | 'medium' | 'hard';

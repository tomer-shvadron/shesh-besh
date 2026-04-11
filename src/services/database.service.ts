import Dexie from 'dexie';

import type { BoardState, Difficulty, DiceRoll, GameMode, Move, Player } from '@/engine/types';
import type { TextureMode, Theme } from '@/state/settings.store';

export interface ActiveGameRecord {
  id: string;
  boardState: BoardState;
  dice: DiceRoll | null;
  currentPlayer: Player;
  moveHistory: Move[][];
  timerElapsed: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  savedAt: Date;
}

export interface HighScoreRecord {
  id?: number;
  score: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  date: Date;
  duration: number;
  margin: number;
}

export interface SettingsRecord {
  id: string;
  theme: Theme;
  textureMode: TextureMode;
  soundEnabled: boolean;
  defaultDifficulty: Difficulty;
}

class SheshBeshDatabase extends Dexie {
  activeGame!: Dexie.Table<ActiveGameRecord, string>;
  highScores!: Dexie.Table<HighScoreRecord, number>;
  settings!: Dexie.Table<SettingsRecord, string>;

  constructor() {
    super('shesh-besh');

    this.version(1).stores({
      activeGame: 'id',
      highScores: '++id, score, difficulty, gameMode, date',
      settings: 'id',
    });
  }
}

export const db = new SheshBeshDatabase();

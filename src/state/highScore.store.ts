import { create } from 'zustand';

import { db } from '@/services/database.service';
import type { HighScoreRecord } from '@/services/database.service';

const MAX_SCORES = 20;

interface HighScoreState {
  scores: HighScoreRecord[];
  isLoaded: boolean;
  loadScores: () => Promise<void>;
  addScore: (record: Omit<HighScoreRecord, 'id'>) => Promise<void>;
  clearScores: () => Promise<void>;
}

export const useHighScoreStore = create<HighScoreState>((set) => ({
  scores: [],
  isLoaded: false,

  loadScores: async () => {
    const records = await db.highScores.orderBy('score').reverse().limit(MAX_SCORES).toArray();
    set({ scores: records, isLoaded: true });
  },

  addScore: async (record) => {
    const id = await db.highScores.add(record);
    const newRecord: HighScoreRecord = { ...record, id: id as number };

    set((state) => {
      const updated = [...state.scores, newRecord].sort((a, b) => b.score - a.score).slice(0, MAX_SCORES);
      return { scores: updated };
    });
  },

  clearScores: async () => {
    await db.highScores.clear();
    set({ scores: [] });
  },
}));

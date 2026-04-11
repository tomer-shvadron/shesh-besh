import { useEffect, useState } from 'react';

import type { HighScoreRecord } from '@/services/database.service';
import { useHighScoreStore } from '@/state/highScore.store';

export type Tab = 'leaderboard' | 'stats';

interface Stats {
  totalGames: number;
  easyWins: number;
  mediumWins: number;
  hardWins: number;
}

export interface HighScoresPanelLogicReturn {
  tab: Tab;
  setTab: (t: Tab) => void;
  scores: HighScoreRecord[];
  isLoaded: boolean;
  stats: Stats;
  clearScores: () => Promise<void>;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString();
}

export { formatDate };

function computeStats(scores: HighScoreRecord[]): Stats {
  return {
    totalGames: scores.length,
    easyWins: scores.filter((s) => s.difficulty === 'easy').length,
    mediumWins: scores.filter((s) => s.difficulty === 'medium').length,
    hardWins: scores.filter((s) => s.difficulty === 'hard').length,
  };
}

export function useHighScoresPanelLogic(isOpen: boolean): HighScoresPanelLogicReturn {
  const [tab, setTab] = useState<Tab>('leaderboard');
  const scores = useHighScoreStore((s) => s.scores);
  const isLoaded = useHighScoreStore((s) => s.isLoaded);
  const loadScores = useHighScoreStore((s) => s.loadScores);
  const clearScores = useHighScoreStore((s) => s.clearScores);

  useEffect(() => {
    if (isOpen && !isLoaded) {
      void loadScores();
    }
  }, [isOpen, isLoaded, loadScores]);

  return {
    tab,
    setTab,
    scores,
    isLoaded,
    stats: computeStats(scores),
    clearScores,
  };
}

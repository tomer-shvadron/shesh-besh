import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HighScoreRecord } from '@/services/database.service';
import { db } from '@/services/database.service';
import { useHighScoreStore } from '@/state/highScore.store';

// Mock database — vi.mock is hoisted by Vitest, so it runs before the imports above
vi.mock('@/services/database.service', () => {
  const records: HighScoreRecord[] = [];
  let nextId = 1;

  const highScores = {
    _records: records,
    orderBy: vi.fn(() => ({
      reverse: vi.fn(() => ({
        limit: vi.fn(() => ({
          toArray: vi.fn(async () =>
            [...records].sort((a, b) => b.score - a.score).slice(0, 20),
          ),
        })),
      })),
    })),
    add: vi.fn(async (record: HighScoreRecord) => {
      const id = nextId++;
      records.push({ ...record, id });
      return id;
    }),
    clear: vi.fn(async () => {
      records.splice(0, records.length);
    }),
  };

  return { db: { highScores } };
});

function makeRecord(overrides: Partial<HighScoreRecord> = {}): Omit<HighScoreRecord, 'id'> {
  return {
    score: 1000,
    difficulty: 'medium',
    gameMode: 'pva',
    date: new Date('2026-01-01'),
    duration: 120000,
    margin: 5,
    ...overrides,
  };
}

describe('highScore.store', () => {
  beforeEach(() => {
    // Reset store state between tests
    useHighScoreStore.setState({ scores: [], isLoaded: false });
    vi.clearAllMocks();
    // Clear the in-memory records array
    (db.highScores as unknown as { _records: HighScoreRecord[] })._records.splice(0);
  });

  describe('loadScores()', () => {
    it('should load scores from the database and set isLoaded=true', async () => {
      // Pre-populate via the mock
      await db.highScores.add({ ...makeRecord({ score: 500 }), id: undefined } as unknown as HighScoreRecord);
      await db.highScores.add({ ...makeRecord({ score: 1200 }), id: undefined } as unknown as HighScoreRecord);

      await useHighScoreStore.getState().loadScores();

      const { scores, isLoaded } = useHighScoreStore.getState();
      expect(isLoaded).toBe(true);
      expect(scores).toHaveLength(2);
    });

    it('should return scores sorted by score descending', async () => {
      await db.highScores.add({ ...makeRecord({ score: 300 }), id: undefined } as unknown as HighScoreRecord);
      await db.highScores.add({ ...makeRecord({ score: 1500 }), id: undefined } as unknown as HighScoreRecord);
      await db.highScores.add({ ...makeRecord({ score: 700 }), id: undefined } as unknown as HighScoreRecord);

      await useHighScoreStore.getState().loadScores();

      const { scores } = useHighScoreStore.getState();
      expect(scores[0]!.score).toBe(1500);
      expect(scores[1]!.score).toBe(700);
      expect(scores[2]!.score).toBe(300);
    });
  });

  describe('addScore()', () => {
    it('should persist the record and update store state', async () => {
      const record = makeRecord({ score: 800 });
      await useHighScoreStore.getState().addScore(record);

      expect(db.highScores.add).toHaveBeenCalledOnce();
      const { scores } = useHighScoreStore.getState();
      expect(scores).toHaveLength(1);
      expect(scores[0]!.score).toBe(800);
    });

    it('should keep scores sorted by score descending in state', async () => {
      await useHighScoreStore.getState().addScore(makeRecord({ score: 400 }));
      await useHighScoreStore.getState().addScore(makeRecord({ score: 1200 }));
      await useHighScoreStore.getState().addScore(makeRecord({ score: 600 }));

      const { scores } = useHighScoreStore.getState();
      expect(scores[0]!.score).toBe(1200);
      expect(scores[1]!.score).toBe(600);
      expect(scores[2]!.score).toBe(400);
    });
  });

  describe('clearScores()', () => {
    it('should clear all scores from db and reset state', async () => {
      await useHighScoreStore.getState().addScore(makeRecord({ score: 1000 }));
      expect(useHighScoreStore.getState().scores).toHaveLength(1);

      await useHighScoreStore.getState().clearScores();

      expect(db.highScores.clear).toHaveBeenCalledOnce();
      expect(useHighScoreStore.getState().scores).toHaveLength(0);
    });
  });
});

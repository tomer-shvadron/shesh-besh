import { describe, expect, it } from 'vitest';

import { db } from '@/services/database.service';

describe('database.service', () => {
  it('should have the correct database name', () => {
    expect(db.name).toBe('shesh-besh');
  });

  it('should have activeGame table', () => {
    expect(db.activeGame).toBeDefined();
  });

  it('should have highScores table', () => {
    expect(db.highScores).toBeDefined();
  });

  it('should have settings table', () => {
    expect(db.settings).toBeDefined();
  });
});

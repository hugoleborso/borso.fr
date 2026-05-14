import { beforeEach, describe, expect, it } from 'vitest';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { findBucket, upsertBucket } from './auth.repository';

describe('auth.repository', () => {
  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  it('upsertBucket inserts then findBucket reads it back', async () => {
    const database = freshDatabase();
    const now = new Date('2026-09-19T06:00:00+02:00');
    await upsertBucket(database, { ipAddress: '10.1.1.1', count: 1, windowStartedAt: now });
    const found = await findBucket(database, '10.1.1.1');
    expect(found?.count).toBe(1);
  });

  it('upsertBucket overwrites existing rows', async () => {
    const database = freshDatabase();
    const now = new Date('2026-09-19T06:00:00+02:00');
    await upsertBucket(database, { ipAddress: '10.1.1.2', count: 1, windowStartedAt: now });
    await upsertBucket(database, { ipAddress: '10.1.1.2', count: 4, windowStartedAt: now });
    const found = await findBucket(database, '10.1.1.2');
    expect(found?.count).toBe(4);
  });

  it('findBucket returns null on unknown IP', async () => {
    const found = await findBucket(freshDatabase(), 'unseen');
    expect(found).toBeNull();
  });
});

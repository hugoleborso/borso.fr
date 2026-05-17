import { beforeEach, describe, expect, it } from 'vitest';
import {
  freshDatabase,
  seedAdminCredentials,
  TEST_ADMIN_PIN_SCRYPT_HASH,
  truncateAllTables,
} from '../../../test/database-utils';
import {
  createSession,
  deleteSession,
  findAdminPinHash,
  findBucket,
  findValidSession,
  purgeExpiredSessions,
  upsertBucket,
} from './auth.repository';

describe('auth.repository — rate limit buckets', () => {
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

describe('auth.repository — admin credentials', () => {
  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  it('findAdminPinHash returns null when the table is empty', async () => {
    expect(await findAdminPinHash(freshDatabase())).toBeNull();
  });

  it('findAdminPinHash returns the seeded hash', async () => {
    await seedAdminCredentials(freshDatabase());
    expect(await findAdminPinHash(freshDatabase())).toBe(TEST_ADMIN_PIN_SCRYPT_HASH);
  });
});

describe('auth.repository — admin sessions', () => {
  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  it('createSession + findValidSession round-trips an unexpired session', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    const expiresAt = new Date(now.getTime() + 60_000);
    await createSession(freshDatabase(), { id: 'sess-a', expiresAt });
    const found = await findValidSession(freshDatabase(), 'sess-a', now);
    expect(found?.id).toBe('sess-a');
  });

  it('findValidSession returns null when expires_at is in the past', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    const expiresAt = new Date(now.getTime() - 60_000);
    await createSession(freshDatabase(), { id: 'sess-b', expiresAt });
    expect(await findValidSession(freshDatabase(), 'sess-b', now)).toBeNull();
  });

  it('deleteSession removes the row', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    await createSession(freshDatabase(), { id: 'sess-c', expiresAt: new Date(now.getTime() + 60_000) });
    await deleteSession(freshDatabase(), 'sess-c');
    expect(await findValidSession(freshDatabase(), 'sess-c', now)).toBeNull();
  });

  it('purgeExpiredSessions drops only the rows whose expires_at has passed', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    await createSession(freshDatabase(), { id: 'sess-live', expiresAt: new Date(now.getTime() + 60_000) });
    await createSession(freshDatabase(), { id: 'sess-dead', expiresAt: new Date(now.getTime() - 60_000) });
    await purgeExpiredSessions(freshDatabase(), now);
    expect(await findValidSession(freshDatabase(), 'sess-live', now)).not.toBeNull();
    // Probe with `new Date(0)` so the expires_at filter doesn't itself hide the row.
    expect(await findValidSession(freshDatabase(), 'sess-dead', new Date(0))).toBeNull();
  });
});

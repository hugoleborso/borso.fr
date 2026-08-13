import { beforeEach, describe, expect, it } from 'vitest';
import {
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

// @FollowsBlueprint test-repository-integration
describe('auth.repository — rate limit buckets', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('upsertBucket inserts then findBucket reads it back', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    await upsertBucket({ ipAddress: '10.1.1.1', count: 1, windowStartedAt: now });
    const found = await findBucket('10.1.1.1');
    expect(found?.count).toBe(1);
  });

  it('upsertBucket overwrites existing rows', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    await upsertBucket({ ipAddress: '10.1.1.2', count: 1, windowStartedAt: now });
    await upsertBucket({ ipAddress: '10.1.1.2', count: 4, windowStartedAt: now });
    const found = await findBucket('10.1.1.2');
    expect(found?.count).toBe(4);
  });

  it('findBucket returns null on unknown IP', async () => {
    const found = await findBucket('unseen');
    expect(found).toBeNull();
  });
});

// @FollowsBlueprint test-repository-integration
describe('auth.repository — admin credentials', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('findAdminPinHash returns null when the table is empty', async () => {
    expect(await findAdminPinHash()).toBeNull();
  });

  it('findAdminPinHash returns the seeded hash', async () => {
    await seedAdminCredentials();
    expect(await findAdminPinHash()).toBe(TEST_ADMIN_PIN_SCRYPT_HASH);
  });
});

// @FollowsBlueprint test-repository-integration
describe('auth.repository — admin sessions', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('createSession + findValidSession round-trips an unexpired session', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    const expiresAt = new Date(now.getTime() + 60_000);
    await createSession({ id: 'sess-a', expiresAt });
    const found = await findValidSession('sess-a', now);
    expect(found?.id).toBe('sess-a');
  });

  it('findValidSession returns null when expires_at is in the past', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    const expiresAt = new Date(now.getTime() - 60_000);
    await createSession({ id: 'sess-b', expiresAt });
    expect(await findValidSession('sess-b', now)).toBeNull();
  });

  it('deleteSession removes the row', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    await createSession({
      id: 'sess-c',
      expiresAt: new Date(now.getTime() + 60_000),
    });
    await deleteSession('sess-c');
    expect(await findValidSession('sess-c', now)).toBeNull();
  });

  it('purgeExpiredSessions drops only the rows whose expires_at has passed', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    await createSession({
      id: 'sess-live',
      expiresAt: new Date(now.getTime() + 60_000),
    });
    await createSession({
      id: 'sess-dead',
      expiresAt: new Date(now.getTime() - 60_000),
    });
    await purgeExpiredSessions(now);
    expect(await findValidSession('sess-live', now)).not.toBeNull();
    // Probe with `new Date(0)` so the expires_at filter doesn't itself hide the row.
    expect(await findValidSession('sess-dead', new Date(0))).toBeNull();
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import {
  seedAdminCredentials,
  TEST_ADMIN_PIN_SCRYPT_HASH,
  truncateAllTables,
} from '../../../test/database-utils';
import {
  createSession,
  deleteAllBuckets,
  deleteBucket,
  deleteSession,
  findAdminPinHash,
  incrementBucket,
  findValidSession,
  purgeExpiredSessions,
} from './auth.repository';

// @FollowsBlueprint test-repository-integration
describe('auth.repository — rate limit buckets', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  const windowStart = new Date('2026-09-19T06:00:00+02:00');
  const insideWindowFloor = new Date(windowStart.getTime() - 1);

  it('incrementBucket opens a bucket at one and counts up inside the window', async () => {
    expect((await incrementBucket('10.1.1.1', windowStart, insideWindowFloor)).count).toBe(1);
    const later = new Date(windowStart.getTime() + 1_000);
    const bumped = await incrementBucket('10.1.1.1', later, insideWindowFloor);
    expect(bumped.count).toBe(2);
    expect(bumped.windowStartedAt).toEqual(windowStart);
  });

  it('incrementBucket restarts the window once the stored start is at or before the floor', async () => {
    await incrementBucket('10.1.1.2', windowStart, insideWindowFloor);
    await incrementBucket('10.1.1.2', windowStart, insideWindowFloor);
    const later = new Date(windowStart.getTime() + 60_000);
    const restarted = await incrementBucket('10.1.1.2', later, windowStart);
    expect(restarted.count).toBe(1);
    expect(restarted.windowStartedAt).toEqual(later);
  });

  it('deleteBucket and deleteAllBuckets drop the counts', async () => {
    await incrementBucket('10.1.1.3', windowStart, insideWindowFloor);
    await incrementBucket('10.1.1.4', windowStart, insideWindowFloor);
    await deleteBucket('10.1.1.3');
    expect((await incrementBucket('10.1.1.3', windowStart, insideWindowFloor)).count).toBe(1);
    await deleteAllBuckets();
    expect((await incrementBucket('10.1.1.4', windowStart, insideWindowFloor)).count).toBe(1);
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
    const beforeAnySessionCouldExpire = new Date(0);
    expect(await findValidSession('sess-dead', beforeAnySessionCouldExpire)).toBeNull();
  });
});

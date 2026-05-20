import { beforeEach, describe, expect, it } from 'vitest';
import { freshDatabase, seedAdminCredentials, truncateAllTables } from '../../../test/database-utils';
import { findValidSession } from './auth.repository';
import { AuthDeniedError, login, logout, verifySession } from './auth.service';

describe('auth.service', () => {
  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
    await seedAdminCredentials(freshDatabase());
  });

  it('returns a session id and persists the session row on the correct PIN', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    const result = await login(freshDatabase(), { pin: 'lastloop', ipAddress: '10.0.0.1' }, now);
    expect(result.sessionId).toHaveLength(64);
    expect(result.expiresAt.getTime()).toBeGreaterThan(now.getTime());
    const persisted = await findValidSession(freshDatabase(), result.sessionId, now);
    expect(persisted?.id).toBe(result.sessionId);
  });

  it('throws AuthDeniedError("invalid-pin") on wrong PIN', async () => {
    await expect(
      login(freshDatabase(), { pin: 'wrong', ipAddress: '10.0.0.2' }, new Date()),
    ).rejects.toBeInstanceOf(AuthDeniedError);
  });

  it('throws AuthDeniedError("rate-limited") past 5 failures', async () => {
    const database = freshDatabase();
    const now = new Date('2026-09-19T06:00:00+02:00');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(database, { pin: 'wrong', ipAddress: '10.0.0.3' }, now).catch(() => undefined);
    }
    await expect(
      login(database, { pin: 'wrong', ipAddress: '10.0.0.3' }, now),
    ).rejects.toMatchObject({ reason: 'rate-limited' });
  });

  it('throws AuthDeniedError("misconfigured") when admin_credentials is empty', async () => {
    await truncateAllTables(freshDatabase());
    await expect(
      login(freshDatabase(), { pin: 'lastloop', ipAddress: '10.0.0.4' }, new Date()),
    ).rejects.toMatchObject({ reason: 'misconfigured' });
  });

  it('verifySession returns null for unknown ids and for expired sessions', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    const result = await login(freshDatabase(), { pin: 'lastloop', ipAddress: '10.0.0.5' }, now);
    const live = await verifySession(freshDatabase(), result.sessionId, now);
    expect(live?.id).toBe(result.sessionId);
    const tooLate = new Date(result.expiresAt.getTime() + 1);
    const expired = await verifySession(freshDatabase(), result.sessionId, tooLate);
    expect(expired).toBeNull();
    const missing = await verifySession(freshDatabase(), 'no-such-id', now);
    expect(missing).toBeNull();
  });

  it('logout deletes the session so subsequent verify returns null', async () => {
    const now = new Date('2026-09-19T06:00:00+02:00');
    const result = await login(freshDatabase(), { pin: 'lastloop', ipAddress: '10.0.0.6' }, now);
    await logout(freshDatabase(), result.sessionId);
    const after = await verifySession(freshDatabase(), result.sessionId, now);
    expect(after).toBeNull();
  });
});

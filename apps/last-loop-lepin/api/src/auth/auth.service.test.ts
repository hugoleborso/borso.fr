import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { AuthDeniedError, login } from './auth.service';

const SCRYPT_HASH_FOR_PIN_LASTLOOP =
  'scrypt$6ccc66eb93981b9b83e8817f584ca8f5$60191a1c31f18e88590e0e5c6995d1d6f7f0f053b6ffce8e3ea4288c56bd0e790d6a340ad59de2d29792c9d471ad144907d5d10e05ef03d0aea5f6383f734107';

describe('auth.service', () => {
  const original = { ...process.env };

  beforeAll(() => {
    process.env.PIN_HASH = SCRYPT_HASH_FOR_PIN_LASTLOOP;
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-32-chars-min-padding';
  });

  afterEach(() => {
    process.env = { ...original, PIN_HASH: SCRYPT_HASH_FOR_PIN_LASTLOOP };
  });

  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  it('returns a token on the correct PIN', async () => {
    const result = await login(
      freshDatabase(),
      { pin: 'lastloop', ipAddress: '10.0.0.1' },
      new Date(),
    );
    expect(result.token.length).toBeGreaterThan(20);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
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

  it('throws AuthDeniedError("misconfigured") when env is missing', async () => {
    delete process.env.PIN_HASH;
    await expect(
      login(freshDatabase(), { pin: 'lastloop', ipAddress: '10.0.0.4' }, new Date()),
    ).rejects.toMatchObject({ reason: 'misconfigured' });
  });
});

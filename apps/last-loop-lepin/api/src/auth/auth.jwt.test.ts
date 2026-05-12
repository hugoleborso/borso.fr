/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import { JwtVerificationError, signAdminSession, verifyAdminSession } from './auth.jwt';

const SECRET = 'test-secret-that-is-long-enough-for-hs256-32+';

describe('auth.jwt', () => {
  it('round-trips a signed token', async () => {
    const issuedAt = new Date('2026-09-19T06:00:00+02:00');
    const token = await signAdminSession(SECRET, issuedAt);
    const session = await verifyAdminSession(SECRET, token);
    expect(session.subject).toBe('admin');
    expect(session.issuedAt).toBe(issuedAt.getTime() - (issuedAt.getTime() % 1000));
    expect(session.expiresAt).toBeGreaterThan(session.issuedAt);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signAdminSession(SECRET, new Date());
    await expect(verifyAdminSession('a-different-secret-32-chars-min-padding', token)).rejects.toBeInstanceOf(
      JwtVerificationError,
    );
  });

  it('rejects a tampered token', async () => {
    const token = await signAdminSession(SECRET, new Date());
    const tampered = `${token.slice(0, -3)}AAA`;
    await expect(verifyAdminSession(SECRET, tampered)).rejects.toBeInstanceOf(JwtVerificationError);
  });

  it('rejects garbage that is not a JWT at all', async () => {
    await expect(verifyAdminSession(SECRET, 'not-a-jwt')).rejects.toBeInstanceOf(JwtVerificationError);
  });
});

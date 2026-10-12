import { describe, expect, it } from 'vitest';
import {
  buildSessionPayload,
  isStoredSessionLive,
  parseSessionPayload,
  SESSION_LIFETIME_MS,
} from './session.core';

const NOW = 1_700_000_000_000;

describe('buildSessionPayload', () => {
  it('lets a session live thirty days from its issue', () => {
    expect(buildSessionPayload('abc', NOW)).toEqual({
      sessionId: 'abc',
      issuedAt: NOW,
      expiresAt: NOW + 30 * 24 * 60 * 60 * 1000,
    });
    expect(SESSION_LIFETIME_MS).toBe(2_592_000_000);
  });
});

describe('parseSessionPayload', () => {
  it('reads back a payload it built', () => {
    const sessionPayload = buildSessionPayload('abc', NOW);
    expect(parseSessionPayload(JSON.stringify(sessionPayload))).toEqual(sessionPayload);
  });

  it('answers null for text that is not a payload', () => {
    expect(parseSessionPayload('{"sessionId":""}')).toBeNull();
    expect(parseSessionPayload('pas du json')).toBeNull();
  });
});

describe('isStoredSessionLive', () => {
  it('accepts a stored session before its expiry', () => {
    expect(isStoredSessionLive({ expiresAt: new Date(NOW + 1) }, NOW)).toBe(true);
  });

  it('refuses a stored session at its expiry', () => {
    expect(isStoredSessionLive({ expiresAt: new Date(NOW) }, NOW)).toBe(false);
  });

  it('refuses a session that was signed out', () => {
    expect(isStoredSessionLive(null, NOW)).toBe(false);
  });
});

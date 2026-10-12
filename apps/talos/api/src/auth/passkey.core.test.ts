import { describe, expect, it } from 'vitest';
import {
  isChallengeUsable,
  isWebauthnResponse,
  parseTransports,
  readChallengeFromResponse,
  readCredentialIdFromResponse,
  readTransportsFromResponse,
} from './passkey.core';

function encodeClientData(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

// @FollowsBlueprint test-pure-unit
describe('passkey.core', () => {
  it('reads the challenge the options object carries directly', () => {
    expect(readChallengeFromResponse({ challenge: 'abc' })).toBe('abc');
  });

  it('reads the challenge out of a browser response', () => {
    const response = { response: { clientDataJSON: encodeClientData({ challenge: 'xyz' }) } };
    expect(readChallengeFromResponse(response)).toBe('xyz');
  });

  it('answers null for a value that is not an object', () => {
    expect(readChallengeFromResponse('nope')).toBeNull();
    expect(readChallengeFromResponse(null)).toBeNull();
  });

  it('answers null when the response carries no client data', () => {
    expect(readChallengeFromResponse({ response: {} })).toBeNull();
  });

  it('answers null when the client data is not decodable JSON', () => {
    expect(readChallengeFromResponse({ response: { clientDataJSON: '####' } })).toBeNull();
  });

  it('answers null when the decoded client data carries no challenge', () => {
    expect(
      readChallengeFromResponse({ response: { clientDataJSON: encodeClientData({ a: 1 }) } }),
    ).toBeNull();
  });

  it('reads a credential identifier', () => {
    expect(readCredentialIdFromResponse({ id: 'credential-1' })).toBe('credential-1');
    expect(readCredentialIdFromResponse({ id: '' })).toBeNull();
    expect(readCredentialIdFromResponse(42)).toBeNull();
  });

  it('keeps only the transports the specification names', () => {
    expect(parseTransports(JSON.stringify(['usb', 'carrier-pigeon', 'internal']))).toEqual([
      'usb',
      'internal',
    ]);
  });

  it('answers an empty list for stored text that is not a JSON array', () => {
    expect(parseTransports('not-json')).toEqual([]);
    expect(parseTransports(JSON.stringify({ usb: true }))).toEqual([]);
  });

  it('recognises a browser response by its identifier fields', () => {
    expect(isWebauthnResponse({ id: 'a', rawId: 'a' })).toBe(true);
    expect(isWebauthnResponse({ id: 'a' })).toBe(false);
    expect(isWebauthnResponse(null)).toBe(false);
  });
});

describe('isWebauthnResponse needs both identifiers', () => {
  it('refuses a response carrying only a raw identifier', () => {
    expect(isWebauthnResponse({ rawId: 'a' })).toBe(false);
  });
});

describe('isChallengeUsable', () => {
  const NOW = 1_700_000_000_000;
  const stored = { purpose: 'registration', expiresAt: new Date(NOW + 1) };

  it('accepts an unexpired challenge issued for the same ceremony', () => {
    expect(isChallengeUsable(stored, 'registration', NOW)).toBe(true);
  });

  it('refuses a challenge issued for the other ceremony', () => {
    expect(isChallengeUsable(stored, 'authentication', NOW)).toBe(false);
  });

  it('refuses a challenge at its expiry instant', () => {
    expect(isChallengeUsable(stored, 'registration', NOW + 1)).toBe(false);
  });

  it('refuses a challenge that was never issued or already used', () => {
    expect(isChallengeUsable(null, 'registration', NOW)).toBe(false);
  });
});

describe('readTransportsFromResponse', () => {
  it('keeps the known transports the authenticator declared', () => {
    expect(
      readTransportsFromResponse({ response: { transports: ['internal', 'pigeon', 'hybrid'] } }),
    ).toEqual(['internal', 'hybrid']);
  });

  it('answers an empty list when the response declares none', () => {
    expect(readTransportsFromResponse({ response: {} })).toEqual([]);
  });
});

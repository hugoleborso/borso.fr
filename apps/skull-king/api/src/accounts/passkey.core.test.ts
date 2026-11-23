import { describe, expect, it } from 'vitest';
import {
  isWebauthnResponse,
  readChallengeFromResponse,
  readCredentialIdFromResponse,
} from './passkey.core';

const clientData = (data: unknown) => Buffer.from(JSON.stringify(data)).toString('base64url');

// @FollowsBlueprint test-pure-unit
describe('readChallengeFromResponse', () => {
  it('reads the challenge of the options the server built', () => {
    expect(readChallengeFromResponse({ challenge: 'abc' })).toBe('abc');
  });

  it('reads the challenge the browser signed, out of its client data', () => {
    const response = { response: { clientDataJSON: clientData({ challenge: 'abc' }) } };
    expect(readChallengeFromResponse(response)).toBe('abc');
  });

  it('answers no challenge for a browser response without client data', () => {
    expect(readChallengeFromResponse({ response: {} })).toBeNull();
    expect(readChallengeFromResponse({ response: { clientDataJSON: 7 } })).toBeNull();
  });

  it('answers no challenge for anything else', () => {
    expect(readChallengeFromResponse('abc')).toBeNull();
    expect(readChallengeFromResponse({ response: { clientDataJSON: clientData({}) } })).toBeNull();
    expect(
      readChallengeFromResponse({ response: { clientDataJSON: 'not json at all' } }),
    ).toBeNull();
  });
});

describe('the credential of a browser response', () => {
  it('reads the credential id', () => {
    expect(readCredentialIdFromResponse({ id: 'credential-1' })).toBe('credential-1');
    expect(readCredentialIdFromResponse({ id: '' })).toBeNull();
  });

  it('recognises a browser response by its id and raw id', () => {
    expect(isWebauthnResponse({ id: 'a', rawId: 'a' })).toBe(true);
    expect(isWebauthnResponse({ id: 'a' })).toBe(false);
    expect(isWebauthnResponse({ rawId: 'a' })).toBe(false);
  });
});

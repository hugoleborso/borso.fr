import { describe, expect, it } from 'vitest';
import {
  buildRedirectLocation,
  isAcceptedRedirectUri,
  isRegisteredRedirectUri,
} from './redirect-uri.core';

// @FollowsBlueprint test-pure-unit
describe('isAcceptedRedirectUri', () => {
  it.each([
    'https://claude.ai/api/mcp/auth_callback',
    'http://localhost:47823/callback',
    'http://127.0.0.1/callback',
    'http://[::1]:8080/callback',
  ])('accepts %s', (uri) => {
    expect(isAcceptedRedirectUri(uri)).toBe(true);
  });

  it.each([
    ['plain http off the loopback', 'http://example.com/cb'],
    ['a fragment', 'https://claude.ai/callback#fragment'],
    ['an empty fragment', 'https://claude.ai/callback#'],
    ['credentials in the address', 'https://user@claude.ai/callback'],
    ['a password in the address', 'https://:secret@claude.ai/callback'],
    ['a custom scheme', 'vibe://callback'],
    ['something that is not an address', 'not a url'],
  ])('refuses %s', (_label, uri) => {
    expect(isAcceptedRedirectUri(uri)).toBe(false);
  });
});

describe('isRegisteredRedirectUri', () => {
  it('accepts an exact registered address', () => {
    expect(
      isRegisteredRedirectUri('https://claude.ai/api/mcp/auth_callback', [
        'https://claude.ai/api/mcp/auth_callback',
      ]),
    ).toBe(true);
  });

  it('accepts a loopback address on any port against the same host, path and query', () => {
    expect(
      isRegisteredRedirectUri('http://127.0.0.1:47823/callback', ['http://127.0.0.1/callback']),
    ).toBe(true);
    expect(
      isRegisteredRedirectUri('http://localhost:51000/cb?client=vibe', [
        'https://claude.ai/cb',
        'http://localhost:40000/cb?client=vibe',
      ]),
    ).toBe(true);
  });

  it('refuses a loopback address whose host, path or query differs', () => {
    expect(
      isRegisteredRedirectUri('http://localhost:47823/callback', ['http://127.0.0.1/callback']),
    ).toBe(false);
    expect(
      isRegisteredRedirectUri('http://127.0.0.1:47823/other', ['http://127.0.0.1/callback']),
    ).toBe(false);
    expect(
      isRegisteredRedirectUri('http://127.0.0.1:47823/callback?a=1', ['http://127.0.0.1/callback']),
    ).toBe(false);
  });

  it('never matches any port on an https address', () => {
    expect(
      isRegisteredRedirectUri('https://claude.ai:8443/callback', ['https://claude.ai/callback']),
    ).toBe(false);
  });

  it('refuses a loopback request against a registered https address on the same host', () => {
    expect(
      isRegisteredRedirectUri('http://localhost:1234/callback', ['https://localhost/callback']),
    ).toBe(false);
  });

  it('refuses an https request against a registered loopback address on the same host', () => {
    expect(
      isRegisteredRedirectUri('https://localhost:8443/callback', ['http://localhost/callback']),
    ).toBe(false);
  });

  it('refuses a registered address that no longer parses', () => {
    expect(isRegisteredRedirectUri('http://localhost:1234/callback', ['not a url'])).toBe(false);
  });

  it('refuses a requested address that is not acceptable, even when registered verbatim', () => {
    expect(
      isRegisteredRedirectUri('https://claude.ai/callback#x', ['https://claude.ai/callback#x']),
    ).toBe(false);
  });
});

describe('buildRedirectLocation', () => {
  it('appends every defined parameter and skips the undefined ones', () => {
    expect(
      buildRedirectLocation('http://127.0.0.1:47823/callback?keep=1', {
        code: 'abc',
        state: undefined,
      }),
    ).toBe('http://127.0.0.1:47823/callback?keep=1&code=abc');
  });
});

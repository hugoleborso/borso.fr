import { describe, expect, it } from 'vitest';
import { readAuthorizationQuery, selectConsentView } from './consent.core';

// @FollowsBlueprint test-pure-unit
describe('readAuthorizationQuery', () => {
  it('keeps every authorization parameter the address carries', () => {
    const search =
      '?response_type=code&client_id=client-1&redirect_uri=http%3A%2F%2F127.0.0.1%3A4000%2Fcallback' +
      '&code_challenge=abc&code_challenge_method=S256&state=s1&scope=pragma' +
      '&resource=https%3A%2F%2Fpragma.borso.fr%2Fmcp';
    expect(readAuthorizationQuery(search)).toEqual({
      response_type: 'code',
      client_id: 'client-1',
      redirect_uri: 'http://127.0.0.1:4000/callback',
      code_challenge: 'abc',
      code_challenge_method: 'S256',
      state: 's1',
      scope: 'pragma',
      resource: 'https://pragma.borso.fr/mcp',
    });
  });

  it('leaves out absent parameters and ignores ones the server does not read', () => {
    expect(readAuthorizationQuery('?client_id=client-1&prompt=consent')).toEqual({
      client_id: 'client-1',
    });
    expect(readAuthorizationQuery('')).toEqual({});
  });
});

describe('selectConsentView', () => {
  it('waits for the request, then shows the question', () => {
    expect(selectConsentView({ isPending: true, isError: false })).toBe('loading');
    expect(selectConsentView({ isPending: false, isError: false })).toBe('ready');
  });

  it('reads a refused request as invalid', () => {
    expect(selectConsentView({ isPending: false, isError: true })).toBe('invalid');
  });
});

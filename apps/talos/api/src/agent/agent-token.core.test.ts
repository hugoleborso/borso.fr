import { describe, expect, it } from 'vitest';
import { selectAgentTokenName } from './agent-token.core';

const CONFIGURED = [
  { name: 'lecture', value: 'jeton-lecture' },
  { name: 'build', value: undefined },
  { name: 'mac', value: 'jeton-mac' },
] as const;

describe('selectAgentTokenName', () => {
  it('names the token the bearer matches', () => {
    expect(selectAgentTokenName('Bearer jeton-mac', CONFIGURED)).toBe('mac');
    expect(selectAgentTokenName('Bearer jeton-lecture', CONFIGURED)).toBe('lecture');
  });

  it('refuses a missing header, a wrong token and a token absent from the store', () => {
    expect(selectAgentTokenName(undefined, CONFIGURED)).toBeNull();
    expect(selectAgentTokenName('Bearer faux', CONFIGURED)).toBeNull();
    expect(selectAgentTokenName('Bearer ', [{ name: 'build', value: '' }])).toBeNull();
  });

  it('never matches an empty configured value', () => {
    expect(selectAgentTokenName('Bearer x', [{ name: 'build', value: '' }])).toBeNull();
  });
});

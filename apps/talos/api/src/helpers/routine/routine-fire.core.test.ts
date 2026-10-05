import { describe, expect, it } from 'vitest';
import { buildFireBody, buildFireHeaders, readFireOutcome } from './routine-fire.core';

describe('buildFireHeaders', () => {
  it('sends the token and the routine headers the contract names', () => {
    expect(buildFireHeaders('jeton')).toEqual({
      Authorization: 'Bearer jeton',
      'anthropic-beta': 'experimental-cc-routine-2026-04-01',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    });
  });

  it('sends an empty bearer when no token is configured', () => {
    expect(buildFireHeaders(undefined).Authorization).toBe('Bearer ');
  });
});

describe('buildFireBody', () => {
  it('writes the secret phrase, then the type and the path of the file', () => {
    expect(JSON.parse(buildFireBody('phrase', 'message', 'boite/messages/a.md'))).toEqual({
      text: 'phrase\nmessage: boite/messages/a.md',
    });
  });

  it('leaves the phrase empty when none is configured', () => {
    expect(JSON.parse(buildFireBody(undefined, 'proposition', 'p.md'))).toEqual({
      text: '\nproposition: p.md',
    });
  });
});

describe('readFireOutcome', () => {
  it.each([[200], [204], [299]])('reads status %i as fired', (status) => {
    expect(readFireOutcome(status)).toEqual({ kind: 'fired' });
  });

  it.each([[199], [300], [401]])('reads status %i as failed', (status) => {
    expect(readFireOutcome(status)).toEqual({ kind: 'failed', status });
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildFireBody,
  buildFireHeaders,
  readFireOutcome,
  readSessionUrl,
} from './routine-fire.core';

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
    expect(JSON.parse(buildFireBody('phrase', 'proposition', 'etat/propositions/a.md'))).toEqual({
      text: 'phrase\nproposition: etat/propositions/a.md',
    });
  });

  it('writes a message whole after its trigger', () => {
    expect(JSON.parse(buildFireBody('phrase', 'message', 'Rappelle Julie\ndemain'))).toEqual({
      text: 'phrase\nmessage: Rappelle Julie\ndemain',
    });
  });

  it('leaves the phrase empty when none is configured', () => {
    expect(JSON.parse(buildFireBody(undefined, 'proposition', 'p.md'))).toEqual({
      text: '\nproposition: p.md',
    });
  });
});

const SESSION_URL = 'https://claude.ai/code/session_01ExempleInvente';

describe('readSessionUrl', () => {
  it('keeps an address of Claude Code', () => {
    expect(
      readSessionUrl({
        type: 'routine_fire',
        claude_code_session_id: 'session_01ExempleInvente',
        claude_code_session_url: SESSION_URL,
      }),
    ).toBe(SESSION_URL);
  });

  it.each([
    ['another site', { claude_code_session_url: 'https://exemple.fr/code/session_1' }],
    ['a look-alike host', { claude_code_session_url: 'https://claude.ai.exemple.fr/code/s' }],
    ['plain http', { claude_code_session_url: 'http://claude.ai/code/session_1' }],
    ['the prefix further in', { claude_code_session_url: ' https://claude.ai/code/session_1' }],
    ['another page of the site', { claude_code_session_url: 'https://claude.ai/chat/1' }],
    ['a value that is not text', { claude_code_session_url: 42 }],
    ['no address', { type: 'routine_fire' }],
    ['an answer that is not an object', null],
  ])('stores nothing for %s', (_case, answer) => {
    expect(readSessionUrl(answer)).toBeNull();
  });
});

describe('readFireOutcome', () => {
  it.each([[200], [204], [299]])('reads status %i as fired, with its address', (status) => {
    expect(readFireOutcome(status, { claude_code_session_url: SESSION_URL })).toEqual({
      kind: 'fired',
      sessionUrl: SESSION_URL,
    });
  });

  it('reads a fire whose answer carries no usable address as fired without one', () => {
    expect(readFireOutcome(200, null)).toEqual({ kind: 'fired', sessionUrl: null });
  });

  it.each([[199], [300], [401]])('reads status %i as failed', (status) => {
    expect(readFireOutcome(status, { claude_code_session_url: SESSION_URL })).toEqual({
      kind: 'failed',
      status,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildStaleMessage,
  EVERY_STALE_SCOPE,
  isStaleScope,
  NARROW_STALE_SCOPES,
} from './stale-scope.core';

// @FollowsBlueprint test-pure-unit
describe('stale scope', () => {
  it('recognises every narrow scope and the scope covering everything', () => {
    expect([...NARROW_STALE_SCOPES, EVERY_STALE_SCOPE].every(isStaleScope)).toBe(true);
    expect(isStaleScope('all')).toBe(true);
  });

  it('refuses a string naming no query key root the site reads', () => {
    expect(isStaleScope('auth')).toBe(false);
    expect(isStaleScope('')).toBe(false);
  });

  it('refuses a value that is not a string', () => {
    expect(isStaleScope(null)).toBe(false);
    expect(isStaleScope(['setlists'])).toBe(false);
  });

  it('wraps a scope in the message the socket carries', () => {
    expect(buildStaleMessage('setlists')).toStrictEqual({ kind: 'stale', scope: 'setlists' });
  });
});

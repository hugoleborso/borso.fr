import { describe, expect, it } from 'vitest';
import {
  CONFLICTED_WRITE_MAX_ATTEMPTS,
  isConflictAbort,
  isWorthRetrying,
} from './conflict-abort.core';

// @FollowsBlueprint test-pure-unit
describe('isConflictAbort', () => {
  it('reads a DSQL or Postgres serialization failure as a conflict', () => {
    expect(isConflictAbort({ code: 'OC000' })).toBe(true);
    expect(isConflictAbort({ code: '40001' })).toBe(true);
    expect(isConflictAbort({ message: 'wrapped', cause: { code: 'OC000' } })).toBe(true);
    expect(isConflictAbort({ cause: { code: '40001' } })).toBe(true);
  });

  it('reads anything else as a real failure', () => {
    expect(isConflictAbort({ code: '23505' })).toBe(false);
    expect(isConflictAbort({ code: '23505', cause: { code: 'OC000' } })).toBe(false);
    expect(isConflictAbort({ cause: { code: '23505' } })).toBe(false);
    expect(isConflictAbort({ cause: new Error('no code') })).toBe(false);
    expect(isConflictAbort(new Error('timeout'))).toBe(false);
    expect(isConflictAbort('OC000')).toBe(false);
  });
});

describe('isWorthRetrying', () => {
  const conflict = { code: 'OC000' };

  it('retries a conflict abort while attempts remain', () => {
    expect(CONFLICTED_WRITE_MAX_ATTEMPTS).toBe(3);
    expect(isWorthRetrying(conflict, 1)).toBe(true);
    expect(isWorthRetrying(conflict, 2)).toBe(true);
  });

  it('gives up on the last attempt', () => {
    expect(isWorthRetrying(conflict, 3)).toBe(false);
  });

  it('never retries a real failure', () => {
    expect(isWorthRetrying(new Error('timeout'), 1)).toBe(false);
  });
});

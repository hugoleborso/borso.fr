import { describe, expect, it } from 'vitest';
import { isConflictAbort } from './conflict-abort.core';

// @FollowsBlueprint test-pure-unit
describe('isConflictAbort', () => {
  it('reads a DSQL or Postgres serialization failure as a conflict', () => {
    expect(isConflictAbort({ code: 'OC000' })).toBe(true);
    expect(isConflictAbort({ code: 'OC001' })).toBe(true);
    expect(isConflictAbort({ code: '40001' })).toBe(true);
  });

  it('reads the code on the cause the query builder wraps it in', () => {
    expect(isConflictAbort({ message: 'Failed query', cause: { code: '40001' } })).toBe(true);
  });

  it('reads a conflict named only in the message', () => {
    expect(
      isConflictAbort({
        code: 'XX000',
        message: 'change conflicts with another transaction (OC000)',
      }),
    ).toBe(true);
    expect(isConflictAbort({ message: 'syntax error at or near "OC001"' })).toBe(false);
  });

  it('reads anything else as a real failure', () => {
    expect(isConflictAbort({ code: '23505' })).toBe(false);
    expect(isConflictAbort({ cause: { code: '23505' } })).toBe(false);
    expect(isConflictAbort({ cause: new Error('no code') })).toBe(false);
    expect(isConflictAbort(new Error('timeout'))).toBe(false);
    expect(isConflictAbort('OC000')).toBe(false);
  });
});

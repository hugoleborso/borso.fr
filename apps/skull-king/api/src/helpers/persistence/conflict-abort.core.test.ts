import { describe, expect, it, vi } from 'vitest';
import { isConflictAbort, retryOnConflictAbort } from './conflict-abort.core';

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

const CONFLICT = Object.assign(new Error('change conflicts with another transaction'), {
  code: 'OC000',
});

function failingFirst(failures: readonly Error[]) {
  const queue = [...failures];
  return vi.fn(async () => {
    const failure = queue.shift();
    if (failure !== undefined) throw failure;
    return await Promise.resolve('written');
  });
}

describe('retryOnConflictAbort', () => {
  it('answers the first attempt that commits, after as many conflicts as it may retry', async () => {
    const operation = failingFirst([CONFLICT, CONFLICT, CONFLICT]);

    await expect(retryOnConflictAbort(operation, 3)).resolves.toBe('written');
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it('gives up with the conflict once the retries are spent', async () => {
    const operation = failingFirst([CONFLICT, CONFLICT, CONFLICT]);

    await expect(retryOnConflictAbort(operation, 2)).rejects.toBe(CONFLICT);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('never retries a failure that is not a conflict', async () => {
    const refusal = new Error('round-not-played');
    const operation = failingFirst([refusal]);

    await expect(retryOnConflictAbort(operation, 3)).rejects.toBe(refusal);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

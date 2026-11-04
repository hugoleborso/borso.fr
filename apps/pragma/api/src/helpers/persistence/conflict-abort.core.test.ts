import { describe, expect, it, vi } from 'vitest';
import {
  CONFLICTED_WRITE_MAX_ATTEMPTS,
  isConflictAbort,
  isLostInsertRace,
  isUniqueViolation,
  isWorthRetrying,
  retryingConflictAborts,
  retryingStatement,
  retryingConflictAbortsOf,
} from './conflict-abort.core';

// @FollowsBlueprint test-pure-unit
describe('isConflictAbort', () => {
  it('reads a DSQL or Postgres serialization failure as a conflict', () => {
    expect(isConflictAbort({ code: 'OC000' })).toBe(true);
    expect(isConflictAbort({ code: '40001' })).toBe(true);
    expect(isConflictAbort({ message: 'wrapped', cause: { code: 'OC000' } })).toBe(true);
    expect(isConflictAbort({ cause: { code: '40001' } })).toBe(true);
  });

  it('reads a schema change under a running statement as a conflict', () => {
    expect(isConflictAbort({ code: 'OC001' })).toBe(true);
    expect(
      isConflictAbort({
        code: 'XX000',
        message: 'schema has been updated by another transaction (OC001)',
      }),
    ).toBe(true);
    expect(isConflictAbort({ message: 'change conflicts with another transaction (OC000)' })).toBe(
      true,
    );
    expect(isConflictAbort({ message: 'syntax error at or near "OC001"' })).toBe(false);
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

describe('isUniqueViolation', () => {
  it('reads a duplicate key on the error or on its cause as a unique violation', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ message: 'wrapped', cause: { code: '23505' } })).toBe(true);
  });

  it('reads anything else as something other than a unique violation', () => {
    expect(isUniqueViolation({ code: 'OC000' })).toBe(false);
    expect(isUniqueViolation({ code: 'OC000', cause: { code: '23505' } })).toBe(false);
    expect(isUniqueViolation({ cause: new Error('no code') })).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
  });
});

describe('isLostInsertRace', () => {
  it('reads a duplicate key or a commit conflict as an insert another writer won', () => {
    expect(isLostInsertRace({ code: '23505' })).toBe(true);
    expect(isLostInsertRace({ cause: { code: 'OC000' } })).toBe(true);
    expect(isLostInsertRace({ code: '40001' })).toBe(true);
  });

  it('reads any other failure as one no re-read can answer', () => {
    expect(isLostInsertRace({ code: '23502' })).toBe(false);
    expect(isLostInsertRace(new Error('timeout'))).toBe(false);
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

describe('retryingConflictAborts', () => {
  const conflict = { code: 'OC000' };

  it('answers the first attempt that commits, after a conflict abort', async () => {
    const write = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce('committed');
    await expect(retryingConflictAborts(write)).resolves.toBe('committed');
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('runs the write once when it commits straight away', async () => {
    const write = vi.fn<() => Promise<string>>().mockResolvedValue('committed');
    await expect(retryingConflictAborts(write)).resolves.toBe('committed');
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('rethrows the conflict once every attempt has been aborted', async () => {
    const write = vi.fn<() => Promise<string>>().mockRejectedValue(conflict);
    await expect(retryingConflictAborts(write)).rejects.toBe(conflict);
    expect(write).toHaveBeenCalledTimes(CONFLICTED_WRITE_MAX_ATTEMPTS);
  });

  it('rethrows any other failure without trying again', async () => {
    const failure = new Error('timeout');
    const write = vi.fn<() => Promise<string>>().mockRejectedValue(failure);
    await expect(retryingConflictAborts(write)).rejects.toBe(failure);
    expect(write).toHaveBeenCalledTimes(1);
  });
});

function conflictError(code: string): Error {
  return Object.assign(new Error(`conflict (${code})`), { code });
}

function startingStatements(outcomes: readonly (string | Error)[]) {
  let started = 0;
  return vi.fn(() => {
    const outcome = outcomes[started] ?? 'rows';
    started += 1;
    const settle = async (): Promise<string> => {
      if (typeof outcome === 'string') return outcome;
      throw outcome;
    };
    return {
      // eslint-disable-next-line unicorn/no-thenable -- stands in for a lazy postgres.js statement, which is a thenable
      then: <First, Second>(
        onFulfilled?: ((rows: string) => First | PromiseLike<First>) | null,
        onRejected?: ((reason: unknown) => Second | PromiseLike<Second>) | null,
      ) => settle().then(onFulfilled, onRejected),
      values: async () => `${await settle()} as values`,
    };
  });
}

describe('retryingStatement', () => {
  it('starts the statement again when the first run lost to a schema change', async () => {
    const start = startingStatements([conflictError('OC001'), 'rows']);
    await expect(retryingStatement(start)).resolves.toBe('rows');
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('retries the values form the same way', async () => {
    const start = startingStatements([conflictError('OC001'), 'rows']);
    await expect(retryingStatement(start).values()).resolves.toBe('rows as values');
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('starts nothing before it is awaited and passes any other failure through', async () => {
    const failure = new Error('syntax error');
    const start = startingStatements([failure]);
    const statement = retryingStatement(start);
    expect(start).not.toHaveBeenCalled();
    await expect(statement).rejects.toBe(failure);
    expect(start).toHaveBeenCalledTimes(1);
  });
});

describe('retryingConflictAbortsOf', () => {
  it('retries what unsafe starts and hands every other member through untouched', async () => {
    const unsafe = startingStatements([conflictError('OC001'), 'rows']);
    const begin = vi.fn(async () => await Promise.resolve('committed'));
    const client = retryingConflictAbortsOf({ unsafe, begin, options: { parsers: {} } });

    await expect(client.unsafe()).resolves.toBe('rows');

    expect(unsafe).toHaveBeenCalledTimes(2);
    expect(client.options).toEqual({ parsers: {} });
  });

  it('runs a transaction again whole when it lost to a conflict', async () => {
    const unsafe = startingStatements(['rows']);
    const begin = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(conflictError('OC000'))
      .mockResolvedValueOnce('committed');
    const client = retryingConflictAbortsOf({ unsafe, begin });

    await expect(client.begin()).resolves.toBe('committed');

    expect(begin).toHaveBeenCalledTimes(2);
  });
});

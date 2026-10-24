import { describe, expect, it, vi } from 'vitest';
import {
  CONFLICTED_WRITE_MAX_ATTEMPTS,
  isConflictAbort,
  isLostInsertRace,
  isUniqueViolation,
  isWorthRetrying,
  retryingConflictAborts,
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

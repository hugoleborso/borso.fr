import { describe, expect, it } from 'vitest';
import { UNKNOWN_FAILURE_CODE } from './api-failure.core';
import { ApiError } from './api.client';
import { readRejectionCode } from './rejection-code.core';

// @FollowsBlueprint test-pure-unit
describe('readRejectionCode', () => {
  it('answers nothing when there is no rejection', () => {
    expect(readRejectionCode(null)).toBeNull();
    expect(readRejectionCode(undefined)).toBeNull();
  });

  it('reads the code off a refusal the API named', () => {
    expect(readRejectionCode(new ApiError(409, 'already-bid'))).toBe('already-bid');
  });

  it('falls back for a request that never reached the server', () => {
    expect(readRejectionCode(new TypeError('Failed to fetch'))).toBe(UNKNOWN_FAILURE_CODE);
  });

  it('falls back for an object whose code is not a string', () => {
    expect(readRejectionCode({ code: 500 })).toBe(UNKNOWN_FAILURE_CODE);
  });

  it('falls back for a rejection that is not an object at all', () => {
    expect(readRejectionCode('boom')).toBe(UNKNOWN_FAILURE_CODE);
  });
});

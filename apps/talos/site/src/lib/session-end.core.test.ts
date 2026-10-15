import { describe, expect, it } from 'vitest';
import { ApiError } from './api.client';
import { isEndedSessionFailure } from './session-end.core';

describe('isEndedSessionFailure', () => {
  it('reads a read refused as unauthorised as a session the server no longer accepts', () => {
    expect(isEndedSessionFailure(new ApiError(401, 'messages 401', null))).toBe(true);
  });

  it.each([403, 404, 500])('leaves the session alone on %i', (status) => {
    expect(isEndedSessionFailure(new ApiError(status, `messages ${status}`, null))).toBe(false);
  });

  it.each([null, 'failed', new Error('network')])(
    'leaves the session alone on a failure that carries no status: %s',
    (failure) => {
      expect(isEndedSessionFailure(failure)).toBe(false);
    },
  );
});

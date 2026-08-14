import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import { selectMissingSessionMessageKey } from './missing-session.core';

describe('selectMissingSessionMessageKey', () => {
  it('says the session is gone when the API answered 404', () => {
    expect(selectMissingSessionMessageKey(new ApiError(404, 'session 404', null))).toBe(
      'sessions.sessionNotFound',
    );
  });

  it('says the read failed for anything else', () => {
    expect(selectMissingSessionMessageKey(new ApiError(500, 'session 500', null))).toBe(
      'common.loadFailed',
    );
  });
});

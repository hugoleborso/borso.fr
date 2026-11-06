import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api.client';
import { selectMissingSetlistMessageKey } from './missing-setlist.core';

// @FollowsBlueprint test-pure-unit
describe('selectMissingSetlistMessageKey', () => {
  it('says the setlist is gone when the API answered 404', () => {
    expect(selectMissingSetlistMessageKey(new ApiError(404, 'setlist 404', null))).toBe(
      'setlist.notFound',
    );
  });

  it.each([
    ['a refusal', new ApiError(503, 'setlist 503', null)],
    ['a read paused offline, which holds no error', null],
  ])('says the read failed for %s', (_case, error) => {
    expect(selectMissingSetlistMessageKey(error)).toBe('common.loadFailed');
  });
});

import { describe, expect, it } from 'vitest';
import { ApiError } from '../api.client';
import { readInspirationRefusal } from './inspiration-refusal.core';

// @FollowsBlueprint test-pure-unit
describe('readInspirationRefusal', () => {
  it('reads the sketches that still use an inspiration', () => {
    const error = new ApiError(409, 'delete 409', {
      error: 'inspiration-in-use',
      sketches: [{ songId: 'song-1', title: 'New 7' }],
    });
    expect(readInspirationRefusal(error)).toEqual({
      kind: 'inspiration-in-use',
      sketches: [{ songId: 'song-1', title: 'New 7' }],
    });
  });

  it('reads an inspiration another member deleted', () => {
    const error = new ApiError(404, 'update 404', { error: 'inspiration-not-found' });
    expect(readInspirationRefusal(error)).toEqual({ kind: 'inspiration-not-found' });
  });

  it('reads any other failure as unknown, a gateway page or a thrown error alike', () => {
    expect(readInspirationRefusal(new ApiError(502, 'delete 502', '<html>'))).toEqual({
      kind: 'unknown',
    });
    expect(readInspirationRefusal(new Error('offline'))).toEqual({ kind: 'unknown' });
  });
});

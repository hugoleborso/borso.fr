import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import { selectMissingSongMessageKey } from './missing-song.core';

describe('selectMissingSongMessageKey', () => {
  it('says the song is gone when the API answered 404', () => {
    expect(selectMissingSongMessageKey(new ApiError(404, 'song 404', null))).toBe(
      'catalog.songNotFound',
    );
  });

  it('says the read failed for anything else', () => {
    expect(selectMissingSongMessageKey(new ApiError(503, 'song 503', null))).toBe(
      'common.loadFailed',
    );
  });
});

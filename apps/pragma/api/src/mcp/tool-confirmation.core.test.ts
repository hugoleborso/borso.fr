import { describe, expect, it } from 'vitest';
import { confirmUpdate } from './tool-confirmation.core';

// @FollowsBlueprint test-pure-unit
describe('confirmUpdate', () => {
  it('names the fields that were given, null included, and none that were left out', () => {
    expect(confirmUpdate('song-1', { title: 'Creep', album: null, notes: undefined })).toEqual({
      id: 'song-1',
      updated: ['title', 'album'],
    });
  });
});

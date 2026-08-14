import { describe, expect, it } from 'vitest';
import { didLastSongWriteFail } from './song-write-failure.core';

// @FollowsBlueprint test-pure-unit
describe('didLastSongWriteFail', () => {
  it('answers no when nothing has been written', () => {
    expect(didLastSongWriteFail([], 'song-1')).toBe(false);
  });

  it('answers no when the failed write named another song', () => {
    expect(didLastSongWriteFail([{ variables: { id: 'song-2' }, status: 'error' }], 'song-1')).toBe(
      false,
    );
  });

  it('answers yes when the last write for this song failed', () => {
    expect(
      didLastSongWriteFail(
        [
          { variables: { id: 'song-1' }, status: 'success' },
          { variables: { id: 'song-2' }, status: 'error' },
          { variables: { id: 'song-1', artist: 'Nina Simone' }, status: 'error' },
        ],
        'song-1',
      ),
    ).toBe(true);
  });

  it('forgets a failure the operator has since written over', () => {
    expect(
      didLastSongWriteFail(
        [
          { variables: { id: 'song-1' }, status: 'error' },
          { variables: { id: 'song-1' }, status: 'success' },
        ],
        'song-1',
      ),
    ).toBe(false);
  });

  it('ignores a write whose variables name no song', () => {
    expect(
      didLastSongWriteFail(
        [
          { variables: null, status: 'error' },
          { variables: 'song-1', status: 'error' },
          { variables: { title: 'Feeling Good' }, status: 'error' },
        ],
        'song-1',
      ),
    ).toBe(false);
  });
});

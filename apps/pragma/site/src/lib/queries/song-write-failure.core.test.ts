import { describe, expect, it } from 'vitest';
import { didLastSongWriteFail, selectSongThatLostItsLastWrite } from './song-write-failure.core';

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

// @FollowsBlueprint test-pure-unit
describe('selectSongThatLostItsLastWrite', () => {
  it('answers nothing when nothing has been written', () => {
    expect(selectSongThatLostItsLastWrite([])).toBe(null);
  });

  it('answers nothing when every last write went through', () => {
    expect(
      selectSongThatLostItsLastWrite([
        { variables: { id: 'song-1' }, status: 'success' },
        { variables: { id: 'song-2' }, status: 'success' },
      ]),
    ).toBe(null);
  });

  it('names the song whose last write failed', () => {
    expect(
      selectSongThatLostItsLastWrite([
        { variables: { id: 'song-1' }, status: 'success' },
        { variables: { id: 'song-2' }, status: 'error' },
      ]),
    ).toBe('song-2');
  });

  it('forgets a failure the operator has since written over', () => {
    expect(
      selectSongThatLostItsLastWrite([
        { variables: { id: 'song-1' }, status: 'error' },
        { variables: { id: 'song-1' }, status: 'success' },
      ]),
    ).toBe(null);
  });

  it('answers the most recently fired failure when two songs failed', () => {
    expect(
      selectSongThatLostItsLastWrite([
        { variables: { id: 'song-1' }, status: 'error' },
        { variables: { id: 'song-2' }, status: 'error' },
      ]),
    ).toBe('song-2');
  });

  it('ignores a write whose variables name no song', () => {
    expect(
      selectSongThatLostItsLastWrite([
        { variables: null, status: 'error' },
        { variables: { title: 'Feeling Good' }, status: 'error' },
      ]),
    ).toBe(null);
  });

  it('still names the song when a failed create follows it', () => {
    // A create carries no id, so it cannot be the answer. Reaching the map, it
    // would take the last word and hide the song that really lost its write.
    expect(
      selectSongThatLostItsLastWrite([
        { variables: { id: 'song-1' }, status: 'error' },
        { variables: { title: 'Feeling Good' }, status: 'error' },
      ]),
    ).toBe('song-1');
  });
});

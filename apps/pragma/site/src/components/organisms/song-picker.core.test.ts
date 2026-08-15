import { describe, expect, it } from 'vitest';
import {
  filterPickableSongs,
  selectPickerCloseLabelKey,
  shouldOfferCreatingSong,
} from './song-picker.core';

const SONGS = [
  { id: '2', title: 'Midnight Drive', artist: 'Nova Reef' },
  { id: '1', title: 'Afterglow', artist: 'Nova Reef' },
  { id: '3', title: 'Lightning', artist: 'Volt' },
];

// @FollowsBlueprint test-pure-unit
describe('filterPickableSongs', () => {
  it('sorts by title when nothing is typed', () => {
    expect(filterPickableSongs(SONGS, '').map((song) => song.title)).toEqual([
      'Afterglow',
      'Lightning',
      'Midnight Drive',
    ]);
  });

  it('matches on the title, ignoring case and surrounding spaces', () => {
    expect(filterPickableSongs(SONGS, '  light ').map((song) => song.id)).toEqual(['3']);
  });

  it('matches on the artist too', () => {
    expect(filterPickableSongs(SONGS, 'nova').map((song) => song.title)).toEqual([
      'Afterglow',
      'Midnight Drive',
    ]);
  });

  it('answers nothing when no song matches', () => {
    expect(filterPickableSongs(SONGS, 'zzz')).toEqual([]);
  });
});

describe('shouldOfferCreatingSong', () => {
  it('offers nothing while the field is empty', () => {
    expect(shouldOfferCreatingSong(SONGS, '   ')).toBe(false);
  });

  it('offers to create a title the catalog does not carry', () => {
    expect(shouldOfferCreatingSong(SONGS, 'New One')).toBe(true);
  });

  it('refuses to offer a duplicate of an existing title', () => {
    expect(shouldOfferCreatingSong(SONGS, '  lightning ')).toBe(false);
  });
});

describe('selectPickerCloseLabelKey', () => {
  it('offers a way out of a job not started', () => {
    expect(selectPickerCloseLabelKey(0)).toBe('common.cancel');
  });

  it('offers a way out of a finished one once a song went in', () => {
    expect(selectPickerCloseLabelKey(2)).toBe('setlist.addSongDone');
  });
});

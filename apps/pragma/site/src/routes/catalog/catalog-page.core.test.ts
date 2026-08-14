import { describe, expect, it } from 'vitest';
import {
  type CatalogSong,
  buildNewSongPath,
  compactLineup,
  countSongsWithStatus,
  isMatchingSearch,
  isMatchingStatusFilter,
  selectVisibleSongs,
  sortSongsByTitle,
} from './catalog-page.core';

const SONGS: readonly CatalogSong[] = [
  { title: 'Slow Burn', artist: 'The Embers', status: 'concert_ready' },
  { title: 'Lightning', artist: 'Volt', status: 'rehearsed' },
  { title: 'Afterglow', artist: 'Nova Reef', status: 'concert_ready' },
];

// @FollowsBlueprint test-pure-unit
describe('countSongsWithStatus', () => {
  it('counts every song for the all filter', () => {
    expect(countSongsWithStatus(SONGS, 'all')).toBe(3);
  });

  it('counts only the songs carrying the status', () => {
    expect(countSongsWithStatus(SONGS, 'concert_ready')).toBe(2);
    expect(countSongsWithStatus(SONGS, 'idea')).toBe(0);
  });
});

const SLOW_BURN: CatalogSong = {
  title: 'Slow Burn',
  artist: 'The Embers',
  status: 'concert_ready',
};
const LIGHTNING: CatalogSong = { title: 'Lightning', artist: 'Volt', status: 'rehearsed' };

describe('isMatchingSearch', () => {
  const song = SLOW_BURN;

  it('matches everything when the query is blank', () => {
    expect(isMatchingSearch(song, '   ')).toBe(true);
  });

  it('matches on the title, ignoring case', () => {
    expect(isMatchingSearch(song, 'slow')).toBe(true);
  });

  it('matches on the artist', () => {
    expect(isMatchingSearch(song, 'embers')).toBe(true);
  });

  it('does not match an unrelated query', () => {
    expect(isMatchingSearch(song, 'zzz')).toBe(false);
  });
});

describe('isMatchingStatusFilter', () => {
  const song = LIGHTNING;

  it('matches every song under the all filter', () => {
    expect(isMatchingStatusFilter(song, 'all')).toBe(true);
  });

  it("matches only the song's own status", () => {
    expect(isMatchingStatusFilter(song, 'rehearsed')).toBe(true);
    expect(isMatchingStatusFilter(song, 'wip')).toBe(false);
  });
});

describe('sortSongsByTitle', () => {
  it('orders by title without mutating the input', () => {
    expect(sortSongsByTitle(SONGS).map((song) => song.title)).toEqual([
      'Afterglow',
      'Lightning',
      'Slow Burn',
    ]);
    expect(SONGS[0]?.title).toBe('Slow Burn');
  });
});

describe('selectVisibleSongs', () => {
  it('applies the status filter and the search together', () => {
    expect(selectVisibleSongs(SONGS, 'concert_ready', 'nova').map((song) => song.title)).toEqual([
      'Afterglow',
    ]);
  });

  it('returns everything under the all filter and a blank search', () => {
    expect(selectVisibleSongs(SONGS, 'all', '')).toHaveLength(3);
  });
});

describe('compactLineup', () => {
  it('drops the members holding nothing', () => {
    expect(compactLineup({ ada: ['guitar'], bob: [] })).toEqual({ ada: ['guitar'] });
  });

  it('keeps both instruments of a member holding two', () => {
    expect(compactLineup({ ada: ['drums', 'vocals'] })).toEqual({ ada: ['drums', 'vocals'] });
  });

  it('returns an empty record for an empty lineup', () => {
    expect(compactLineup({})).toEqual({});
  });
});

describe('buildNewSongPath', () => {
  it('goes to the blank form when nothing was searched', () => {
    expect(buildNewSongPath('   ')).toBe('/catalog/new');
  });

  it('carries what was typed so the title is not typed twice', () => {
    expect(buildNewSongPath(' Slow Burn ')).toBe('/catalog/new?title=Slow%20Burn');
  });
});

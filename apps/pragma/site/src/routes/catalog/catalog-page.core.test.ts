import { describe, expect, it } from 'vitest';
import {
  buildCatalogFilterSearch,
  type CatalogSong,
  describeSongToLearn,
  parseCatalogFilter,
  selectCatalogEmptyMessageKey,
  selectSongsToLearn,
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
describe('buildCatalogFilterSearch', () => {
  it('names a chosen filter in the address', () => {
    expect(buildCatalogFilterSearch('learning')).toEqual({ filter: 'learning' });
  });

  it('leaves the address bare for every song', () => {
    expect(buildCatalogFilterSearch('all')).toEqual({});
  });
});

describe('parseCatalogFilter', () => {
  it('reads a filter named in the address', () => {
    expect(parseCatalogFilter('learning')).toBe('learning');
  });

  it('falls back to every song for a missing or unknown filter', () => {
    expect(parseCatalogFilter(null)).toBe('all');
    expect(parseCatalogFilter('studies')).toBe('all');
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

describe('selectCatalogEmptyMessageKey', () => {
  it('says no song matches when a search is typed', () => {
    expect(selectCatalogEmptyMessageKey(' slow ', 'learning')).toBe('catalog.emptySearch');
  });

  it('says the catalogue is empty with no search', () => {
    expect(selectCatalogEmptyMessageKey('', 'all')).toBe('catalog.emptyList');
  });

  it('says there is nothing to learn under To learn', () => {
    expect(selectCatalogEmptyMessageKey('', 'learning')).toBe('catalog.emptyToLearn');
  });
});

describe('selectSongsToLearn', () => {
  const songs = [
    { id: 'song-1', ...SLOW_BURN },
    { id: 'song-2', ...LIGHTNING },
    { id: 'song-3', title: 'Afterglow', artist: 'Nova Reef', status: 'wip' },
  ];

  it('keeps the queue order, one row per song with its instruments and its lowest score', () => {
    const queue = [
      { songId: 'song-2', instrumentId: 'bass', score: 6, isReady: false },
      { songId: 'song-1', instrumentId: 'voice', score: null, isReady: null },
      { songId: 'song-2', instrumentId: 'voice', score: 3, isReady: false },
      { songId: 'song-1', instrumentId: 'bass', score: 5, isReady: null },
      { songId: 'song-2', instrumentId: 'keys', score: null, isReady: false },
    ];
    expect(selectSongsToLearn(songs, queue, '')).toEqual([
      { song: songs[1], instrumentIds: ['bass', 'voice', 'keys'], lowestScore: 3 },
      { song: songs[0], instrumentIds: ['voice', 'bass'], lowestScore: 5 },
    ]);
  });

  it('leaves out a ready song, a song no longer in the catalogue and a song the search misses', () => {
    const queue = [
      { songId: 'song-1', instrumentId: 'bass', score: 9, isReady: true },
      { songId: 'gone', instrumentId: 'bass', score: 1, isReady: false },
      { songId: 'song-3', instrumentId: 'bass', score: 1, isReady: false },
      { songId: 'song-2', instrumentId: 'bass', score: 1, isReady: false },
    ];
    expect(selectSongsToLearn(songs, queue, 'volt').map((entry) => entry.song.id)).toEqual([
      'song-2',
    ]);
  });
});

describe('describeSongToLearn', () => {
  const names = new Map([
    ['bass', 'Bass'],
    ['voice', 'Voice'],
  ]);

  it('names the instruments and the lowest score', () => {
    expect(
      describeSongToLearn(
        { song: null, instrumentIds: ['bass', 'voice', 'gone'], lowestScore: 4 },
        names,
      ),
    ).toBe('Bass, Voice · 4/10');
  });

  it('names the instruments alone when no score is set', () => {
    expect(
      describeSongToLearn({ song: null, instrumentIds: ['bass'], lowestScore: null }, names),
    ).toBe('Bass');
  });
});

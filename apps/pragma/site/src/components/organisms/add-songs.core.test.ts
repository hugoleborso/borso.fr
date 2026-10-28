import { describe, expect, it } from 'vitest';
import {
  type AddSongsFilter,
  addPick,
  buildAddSongsRows,
  type CandidateSong,
  DEFAULT_ADD_SONGS_FILTER,
  selectAddSongsEmptyMessageKey,
  shouldSearchMusicService,
  togglePick,
} from './add-songs.core';

const SONGS: readonly CandidateSong[] = [
  { id: 'midnight', title: 'Midnight Drive', artist: 'Nova Reef', status: 'concert_ready' },
  { id: 'afterglow', title: 'Afterglow', artist: 'Nova Reef', status: 'rehearsed' },
  { id: 'lightning', title: 'Lightning', artist: 'Volt', status: 'wip' },
  { id: 'dreams', title: 'Dreams', artist: 'Fleetwood Mac', status: 'idea' },
];

function titlesOf(filter: AddSongsFilter, query = '', setlistSongIds: string[] = []): string[] {
  return buildAddSongsRows({ songs: SONGS, setlistSongIds, pickedSongIds: [], query, filter }).map(
    (row) => row.song.title,
  );
}

// @FollowsBlueprint test-pure-unit
describe('buildAddSongsRows', () => {
  it('opens on the songs not in this setlist yet, sorted by title', () => {
    expect(titlesOf(DEFAULT_ADD_SONGS_FILTER, '', ['dreams'])).toEqual([
      'Afterglow',
      'Lightning',
      'Midnight Drive',
    ]);
  });

  it('keeps one status per chip, the songs being learnt under To learn', () => {
    expect(titlesOf('concert-ready')).toEqual(['Midnight Drive']);
    expect(titlesOf('rehearsed')).toEqual(['Afterglow']);
    expect(titlesOf('learning')).toEqual(['Lightning']);
    expect(titlesOf('ideas')).toEqual(['Dreams']);
  });

  it('matches the typed text on the title or the artist, ignoring case and spaces', () => {
    expect(titlesOf(DEFAULT_ADD_SONGS_FILTER, '  NOVA ')).toEqual(['Afterglow', 'Midnight Drive']);
    expect(titlesOf(DEFAULT_ADD_SONGS_FILTER, 'light')).toEqual(['Lightning']);
  });

  it('numbers the picks in the order they were made and leaves the others unnumbered', () => {
    const rows = buildAddSongsRows({
      songs: SONGS,
      setlistSongIds: [],
      pickedSongIds: ['lightning', 'afterglow'],
      query: '',
      filter: DEFAULT_ADD_SONGS_FILTER,
    });
    expect(rows.map((row) => [row.song.id, row.pickNumber])).toEqual([
      ['afterglow', 2],
      ['dreams', null],
      ['lightning', 1],
      ['midnight', null],
    ]);
  });

  it('marks a song already in the setlist with its first position there', () => {
    const rows = buildAddSongsRows({
      songs: SONGS,
      setlistSongIds: ['lightning', 'midnight', 'midnight'],
      pickedSongIds: [],
      query: '',
      filter: 'concert-ready',
    });
    expect(rows.map((row) => [row.song.id, row.positionInSetlist])).toEqual([['midnight', 2]]);
    expect(
      buildAddSongsRows({
        songs: SONGS,
        setlistSongIds: ['lightning'],
        pickedSongIds: [],
        query: '',
        filter: 'rehearsed',
      })[0]?.positionInSetlist,
    ).toBeNull();
  });
});

describe('shouldSearchMusicService', () => {
  it('asks the music service only when typed text matches no song of the catalogue', () => {
    expect(shouldSearchMusicService(SONGS, 'Psycho Chicken')).toBe(true);
    expect(shouldSearchMusicService(SONGS, 'volt')).toBe(false);
    expect(shouldSearchMusicService(SONGS, '   ')).toBe(false);
  });
});

describe('togglePick', () => {
  it('appends an unpicked song and removes a picked one, keeping the others in order', () => {
    expect(togglePick(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(togglePick(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
});

describe('addPick', () => {
  it('appends a song once, never twice', () => {
    expect(addPick(['a'], 'b')).toEqual(['a', 'b']);
    expect(addPick(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });
});

describe('selectAddSongsEmptyMessageKey', () => {
  const emptyView = { rowCount: 0, isSearchingService: false };

  it('says every song is in when the opening view is empty, and no match otherwise', () => {
    expect(
      selectAddSongsEmptyMessageKey({ ...emptyView, filter: DEFAULT_ADD_SONGS_FILTER, query: '' }),
    ).toBe('setlist.addSongsEveryoneIn');
    expect(
      selectAddSongsEmptyMessageKey({ ...emptyView, filter: DEFAULT_ADD_SONGS_FILTER, query: 'x' }),
    ).toBe('setlist.addSongNoMatch');
    expect(selectAddSongsEmptyMessageKey({ ...emptyView, filter: 'ideas', query: '' })).toBe(
      'setlist.addSongNoMatch',
    );
  });

  it('says nothing while rows are listed or the music service is asked instead', () => {
    const view = { filter: DEFAULT_ADD_SONGS_FILTER, query: '' };
    expect(selectAddSongsEmptyMessageKey({ ...view, rowCount: 2, isSearchingService: false })).toBe(
      null,
    );
    expect(selectAddSongsEmptyMessageKey({ ...view, rowCount: 0, isSearchingService: true })).toBe(
      null,
    );
  });
});

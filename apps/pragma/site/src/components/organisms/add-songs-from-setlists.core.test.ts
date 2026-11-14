import { describe, expect, it } from 'vitest';
import {
  buildSourceSongRows,
  listSourceSetlists,
  poolSourceSongIds,
  type SourceSetlist,
  toggleSourceSetlist,
} from './add-songs-from-setlists.core';

const SUMMER: SourceSetlist = { id: 'summer', songIds: ['dreams', 'jolene', 'hey-ya'] };
const WEDDING: SourceSetlist = { id: 'wedding', songIds: ['jolene', 'africa'] };
const EMPTY: SourceSetlist = { id: 'empty', songIds: [] };
const SETLISTS = [SUMMER, WEDDING, EMPTY];

// @FollowsBlueprint test-pure-unit
describe('listSourceSetlists', () => {
  it('leaves out the setlist being edited and the empty ones, in the order given', () => {
    const ids = listSourceSetlists(
      [...SETLISTS, { id: 'current', songIds: ['dreams'] }],
      ['wedding', 'empty', 'current', 'summer'],
      'current',
    ).map((setlist) => setlist.id);
    expect(ids).toEqual(['wedding', 'summer']);
  });
});

// @FollowsBlueprint test-pure-unit
describe('poolSourceSongIds', () => {
  it('pools the songs in setlist order, once each, without those already in the setlist', () => {
    expect(poolSourceSongIds(['summer', 'wedding'], SETLISTS, ['hey-ya'])).toEqual([
      'dreams',
      'jolene',
      'africa',
    ]);
  });

  it('pools nothing from a setlist that is no longer listed', () => {
    expect(poolSourceSongIds(['gone'], SETLISTS, [])).toEqual([]);
  });
});

// @FollowsBlueprint test-pure-unit
describe('buildSourceSongRows', () => {
  it('numbers the picked songs and drops a song the catalogue no longer holds', () => {
    const rows = buildSourceSongRows({
      pickedSetlistIds: ['summer'],
      setlists: SETLISTS,
      setlistSongIds: [],
      songsById: { dreams: { id: 'dreams' }, 'hey-ya': { id: 'hey-ya' } },
      pickedSongIds: ['lemon', 'hey-ya'],
    });
    expect(rows).toEqual([
      { song: { id: 'dreams' }, pickNumber: null },
      { song: { id: 'hey-ya' }, pickNumber: 2 },
    ]);
  });
});

// @FollowsBlueprint test-pure-unit
describe('toggleSourceSetlist', () => {
  it('picks the songs of a ticked setlist after the songs already picked', () => {
    expect(
      toggleSourceSetlist({
        sourceSetlistId: 'wedding',
        pickedSetlistIds: [],
        pickedSongIds: ['dreams', 'jolene'],
        setlists: SETLISTS,
        setlistSongIds: [],
      }),
    ).toEqual({ pickedSetlistIds: ['wedding'], pickedSongIds: ['dreams', 'jolene', 'africa'] });
  });

  it('skips the songs already in the setlist', () => {
    expect(
      toggleSourceSetlist({
        sourceSetlistId: 'summer',
        pickedSetlistIds: ['wedding'],
        pickedSongIds: [],
        setlists: SETLISTS,
        setlistSongIds: ['hey-ya'],
      }).pickedSongIds,
    ).toEqual(['dreams', 'jolene']);
  });

  it('unpicks the songs of an unticked setlist, keeping those another ticked setlist holds', () => {
    expect(
      toggleSourceSetlist({
        sourceSetlistId: 'summer',
        pickedSetlistIds: ['summer', 'wedding'],
        pickedSongIds: ['lemon', 'dreams', 'jolene', 'hey-ya', 'africa'],
        setlists: SETLISTS,
        setlistSongIds: [],
      }),
    ).toEqual({ pickedSetlistIds: ['wedding'], pickedSongIds: ['lemon', 'jolene', 'africa'] });
  });
});

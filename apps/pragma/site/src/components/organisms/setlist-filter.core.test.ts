import { describe, expect, it } from 'vitest';
import type { SetlistEditorSong } from './setlist-editor.utils';
import { type FilterableEntry, filterEntriesForMember } from './setlist-filter.core';

const HUGO = 'hugo-id';
const PAULINE = 'pauline-id';
const ADRIEN = 'adrien-id';
const GUITAR = 'guitar-id';
const BASS = 'bass-id';
const DRUMS = 'drums-id';

const ALPHA_SONG_ID = 'song-alpha';
const BRAVO_SONG_ID = 'song-bravo';
const CHARLIE_SONG_ID = 'song-charlie';

function buildSong(
  id: string,
  defaultLineup: Record<string, readonly string[]>,
): SetlistEditorSong {
  return { id, title: id, artist: '', defaultLineup };
}

function buildEntry(
  id: string,
  songId: string,
  lineupOverride: Record<string, readonly string[]> | null = null,
): FilterableEntry {
  return { id, songId, lineupOverride };
}

// @FollowsBlueprint test-pure-unit
describe('filterEntriesForMember', () => {
  it('returns every entry with an empty instrument map when no member is selected', () => {
    const songsById = { [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: [GUITAR] }) };
    const entries = [buildEntry('e1', ALPHA_SONG_ID), buildEntry('e2', ALPHA_SONG_ID)];
    expect(filterEntriesForMember(entries, songsById, null)).toEqual({
      visibleEntries: entries,
      instrumentIdsByEntryId: {},
    });
  });

  it('returns no entries when the selected member appears in zero lineups', () => {
    const songsById = { [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: [GUITAR] }) };
    const entries = [buildEntry('e1', ALPHA_SONG_ID)];
    expect(filterEntriesForMember(entries, songsById, PAULINE)).toEqual({
      visibleEntries: [],
      instrumentIdsByEntryId: {},
    });
  });

  it('filters down to the entries where the member plays and reports their instrument', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: [GUITAR], [PAULINE]: [BASS] }),
      [BRAVO_SONG_ID]: buildSong(BRAVO_SONG_ID, { [HUGO]: [BASS] }),
      [CHARLIE_SONG_ID]: buildSong(CHARLIE_SONG_ID, { [PAULINE]: [GUITAR], [ADRIEN]: [DRUMS] }),
    };
    const entries = [
      buildEntry('e1', ALPHA_SONG_ID),
      buildEntry('e2', BRAVO_SONG_ID),
      buildEntry('e3', CHARLIE_SONG_ID),
    ];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: [entries[0], entries[1]],
      instrumentIdsByEntryId: { e1: [GUITAR], e2: [BASS] },
    });
  });

  it('lets a lineup override take precedence over the song default when resolving', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: [GUITAR] }),
    };
    const entries = [buildEntry('e1', ALPHA_SONG_ID, { [HUGO]: [BASS] })];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: entries,
      instrumentIdsByEntryId: { e1: [BASS] },
    });
  });

  it('reports every instrument the member holds on one song', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: [DRUMS, GUITAR] }),
    };
    const entries = [buildEntry('e1', ALPHA_SONG_ID)];
    expect(filterEntriesForMember(entries, songsById, HUGO).instrumentIdsByEntryId).toEqual({
      e1: [DRUMS, GUITAR],
    });
  });

  it('drops an entry where the override sits the member out explicitly', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: [GUITAR] }),
    };
    const entries = [buildEntry('e1', ALPHA_SONG_ID, { [HUGO]: [] })];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: [],
      instrumentIdsByEntryId: {},
    });
  });

  it('drops an entry where the song default sits the member out', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: [] }),
    };
    const entries = [buildEntry('e1', ALPHA_SONG_ID)];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: [],
      instrumentIdsByEntryId: {},
    });
  });

  it('drops an entry pointing to an unknown song id', () => {
    const songsById: Record<string, SetlistEditorSong> = {};
    const entries = [buildEntry('e1', 'orphan-song-id')];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: [],
      instrumentIdsByEntryId: {},
    });
  });
});

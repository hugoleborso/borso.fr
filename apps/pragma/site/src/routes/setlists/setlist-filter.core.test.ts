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

function buildSong(id: string, defaultLineup: Record<string, string | null>): SetlistEditorSong {
  return { id, title: id, artist: '', defaultLineup };
}

function buildEntry(
  id: string,
  songId: string,
  lineupOverride: Record<string, string | null> | null = null,
): FilterableEntry {
  return { id, songId, lineupOverride };
}

describe('filterEntriesForMember', () => {
  it('returns every entry with an empty instrument map when no member is selected', () => {
    const songsById = { [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: GUITAR }) };
    const entries = [buildEntry('e1', ALPHA_SONG_ID), buildEntry('e2', ALPHA_SONG_ID)];
    expect(filterEntriesForMember(entries, songsById, null)).toEqual({
      visibleEntries: entries,
      instrumentByEntryId: {},
    });
  });

  it('returns no entries when the selected member appears in zero lineups', () => {
    const songsById = { [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: GUITAR }) };
    const entries = [buildEntry('e1', ALPHA_SONG_ID)];
    expect(filterEntriesForMember(entries, songsById, PAULINE)).toEqual({
      visibleEntries: [],
      instrumentByEntryId: {},
    });
  });

  it('filters down to the entries where the member plays and reports their instrument', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: GUITAR, [PAULINE]: BASS }),
      [BRAVO_SONG_ID]: buildSong(BRAVO_SONG_ID, { [HUGO]: BASS }),
      [CHARLIE_SONG_ID]: buildSong(CHARLIE_SONG_ID, { [PAULINE]: GUITAR, [ADRIEN]: DRUMS }),
    };
    const entries = [
      buildEntry('e1', ALPHA_SONG_ID),
      buildEntry('e2', BRAVO_SONG_ID),
      buildEntry('e3', CHARLIE_SONG_ID),
    ];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: [entries[0], entries[1]],
      instrumentByEntryId: { e1: GUITAR, e2: BASS },
    });
  });

  it('lets a lineup override take precedence over the song default when resolving', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: GUITAR }),
    };
    const entries = [buildEntry('e1', ALPHA_SONG_ID, { [HUGO]: BASS })];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: entries,
      instrumentByEntryId: { e1: BASS },
    });
  });

  it('drops an entry where the override sits the member out explicitly (null in override)', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: GUITAR }),
    };
    const entries = [buildEntry('e1', ALPHA_SONG_ID, { [HUGO]: null })];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: [],
      instrumentByEntryId: {},
    });
  });

  it('drops an entry where the song default sits the member out (null in default)', () => {
    const songsById = {
      [ALPHA_SONG_ID]: buildSong(ALPHA_SONG_ID, { [HUGO]: null }),
    };
    const entries = [buildEntry('e1', ALPHA_SONG_ID)];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: [],
      instrumentByEntryId: {},
    });
  });

  it('drops an entry pointing to an unknown song id', () => {
    const songsById: Record<string, SetlistEditorSong> = {};
    const entries = [buildEntry('e1', 'orphan-song-id')];
    expect(filterEntriesForMember(entries, songsById, HUGO)).toEqual({
      visibleEntries: [],
      instrumentByEntryId: {},
    });
  });
});

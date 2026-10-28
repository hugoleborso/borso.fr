import { describe, expect, it } from 'vitest';
import {
  buildPracticeScreen,
  buildPracticeSongs,
  describePracticePosition,
  describeStoredPosition,
  formatPracticeNextLine,
  isPracticeModeOffered,
  type PracticeSong,
  parseStoredPracticePosition,
  resolvePracticeIndex,
  selectPracticeAnchor,
  serializePracticePosition,
} from './practice-mode.core';

const PRACTICE_EVENING = '2026-10-28T19:00:00.000Z';
const SAME_DAY_MORNING = new Date('2026-10-28T08:00:00.000Z');
const NEXT_DAY = new Date('2026-10-29T08:00:00.000Z');
const TODAY = '2026-10-28';

const SONGS: readonly PracticeSong[] = [
  { entryId: 'entry-a', songId: 'song-a', setlistId: 'set-1', setlistName: 'First half' },
  { entryId: 'entry-b', songId: 'song-b', setlistId: 'set-1', setlistName: 'First half' },
  { entryId: 'entry-c', songId: 'song-c', setlistId: 'set-2', setlistName: 'Encore' },
];

// @FollowsBlueprint test-pure-unit
describe('isPracticeModeOffered', () => {
  it('offers practice mode on the practice day when its setlists hold a song', () => {
    expect(
      isPracticeModeOffered({
        kind: 'practice',
        date: PRACTICE_EVENING,
        songCount: 1,
        now: SAME_DAY_MORNING,
      }),
    ).toBe(true);
  });

  it('refuses a concert, an empty setlist and any other day', () => {
    const base = { kind: 'practice', date: PRACTICE_EVENING, songCount: 3, now: SAME_DAY_MORNING };
    expect(isPracticeModeOffered({ ...base, kind: 'concert' })).toBe(false);
    expect(isPracticeModeOffered({ ...base, songCount: 0 })).toBe(false);
    expect(isPracticeModeOffered({ ...base, now: NEXT_DAY })).toBe(false);
  });
});

describe('buildPracticeSongs', () => {
  it('follows the setlists in the session order, then each entry position', () => {
    const songs = buildPracticeSongs(
      [
        { id: 'set-1', name: 'First half' },
        { id: 'set-2', name: 'Encore' },
      ],
      {
        'set-1': [
          { id: 'entry-b', songId: 'song-b', position: 2 },
          { id: 'entry-a', songId: 'song-a', position: 1 },
        ],
        'set-2': [{ id: 'entry-c', songId: 'song-c', position: 1 }],
      },
    );
    expect(songs).toEqual(SONGS);
  });

  it('skips a setlist whose entries are not loaded yet', () => {
    expect(buildPracticeSongs([{ id: 'set-1', name: 'First half' }], {})).toEqual([]);
  });
});

describe('parseStoredPracticePosition', () => {
  it('reads a position written by this version', () => {
    expect(
      parseStoredPracticePosition('{"day":"2026-10-28","entryId":"entry-b","index":1}'),
    ).toEqual({ day: TODAY, entryId: 'entry-b', index: 1 });
  });

  it('answers nothing for an absent, malformed or foreign value', () => {
    expect(parseStoredPracticePosition(null)).toBeNull();
    expect(parseStoredPracticePosition('not json')).toBeNull();
    expect(parseStoredPracticePosition('{"day":"2026-10-28","index":-1,"entryId":"a"}')).toBeNull();
  });
});

describe('serializePracticePosition', () => {
  it('writes the band day, the entry and its index', () => {
    expect(serializePracticePosition(SONGS, 1, SAME_DAY_MORNING)).toBe(
      '{"day":"2026-10-28","entryId":"entry-b","index":1}',
    );
  });

  it('writes nothing for a position past the end', () => {
    expect(serializePracticePosition(SONGS, 3, SAME_DAY_MORNING)).toBeNull();
  });
});

describe('describeStoredPosition', () => {
  it('describes the song at an index on the band day', () => {
    expect(describeStoredPosition(SONGS, 2, SAME_DAY_MORNING)).toEqual({
      day: TODAY,
      entryId: 'entry-c',
      index: 2,
    });
    expect(describeStoredPosition(SONGS, 3, SAME_DAY_MORNING)).toBeNull();
  });
});

describe('selectPracticeAnchor', () => {
  const arrival = { day: TODAY, entryId: 'entry-a', index: 0 };

  it('follows the stored position of the same day', () => {
    const stored = { day: TODAY, entryId: 'entry-b', index: 1 };
    expect(selectPracticeAnchor(stored, arrival, SAME_DAY_MORNING)).toBe(stored);
  });

  it('keeps the song shown on arrival when nothing is stored for today', () => {
    expect(selectPracticeAnchor(null, arrival, SAME_DAY_MORNING)).toBe(arrival);
    expect(
      selectPracticeAnchor({ day: '2026-10-27', entryId: 'entry-c', index: 2 }, arrival, NEXT_DAY),
    ).toBe(arrival);
  });

  it('keeps the current song current when the setlist is reordered before any move', () => {
    const reordered = [SONGS[1], SONGS[0], SONGS[2]].filter((song) => song !== undefined);
    const anchor = selectPracticeAnchor(
      null,
      describeStoredPosition(SONGS, 0, SAME_DAY_MORNING),
      SAME_DAY_MORNING,
    );
    expect(resolvePracticeIndex(reordered, anchor, SAME_DAY_MORNING)).toBe(1);
  });
});

describe('resolvePracticeIndex', () => {
  it('starts on the first song with nothing stored, or with no song', () => {
    expect(resolvePracticeIndex(SONGS, null, SAME_DAY_MORNING)).toBe(0);
    expect(
      resolvePracticeIndex([], { day: TODAY, entryId: 'entry-b', index: 1 }, SAME_DAY_MORNING),
    ).toBe(0);
  });

  it('resumes on the stored song the same day, wherever it moved', () => {
    const moved = [SONGS[1], SONGS[0], SONGS[2]].filter((song) => song !== undefined);
    expect(
      resolvePracticeIndex(moved, { day: TODAY, entryId: 'entry-b', index: 1 }, SAME_DAY_MORNING),
    ).toBe(0);
  });

  it('ignores a position stored on another day', () => {
    expect(
      resolvePracticeIndex(SONGS, { day: TODAY, entryId: 'entry-c', index: 2 }, NEXT_DAY),
    ).toBe(0);
  });

  it('makes the following song current when the stored one was removed', () => {
    const withoutB = SONGS.filter((song) => song.entryId !== 'entry-b');
    expect(
      resolvePracticeIndex(
        withoutB,
        { day: TODAY, entryId: 'entry-b', index: 1 },
        SAME_DAY_MORNING,
      ),
    ).toBe(1);
    expect(
      resolvePracticeIndex(
        withoutB,
        { day: TODAY, entryId: 'entry-z', index: 9 },
        SAME_DAY_MORNING,
      ),
    ).toBe(1);
  });
});

describe('describePracticePosition', () => {
  it('names the current and the next song, counting from one', () => {
    expect(describePracticePosition(SONGS, 0)).toEqual({
      current: SONGS[0],
      next: SONGS[1],
      number: 1,
      count: 3,
      isLast: false,
      isNextInAnotherSetlist: false,
      currentSetlistName: 'First half',
    });
  });

  it('names the current song setlist only when the practice plays several setlists', () => {
    expect(describePracticePosition(SONGS, 2).currentSetlistName).toBe('Encore');
    expect(describePracticePosition(SONGS.slice(0, 2), 1).currentSetlistName).toBeNull();
    expect(describePracticePosition(SONGS, 3).currentSetlistName).toBeNull();
  });

  it('says when the next song opens another setlist', () => {
    expect(describePracticePosition(SONGS, 1).isNextInAnotherSetlist).toBe(true);
  });

  it('knows the last song has no next one', () => {
    expect(describePracticePosition(SONGS, 2)).toMatchObject({
      next: null,
      isLast: true,
      isNextInAnotherSetlist: false,
    });
  });

  it('holds no current song when the practice has none', () => {
    expect(describePracticePosition([], 0)).toMatchObject({ current: null, count: 0 });
  });
});

const SONGS_BY_ID = {
  'song-a': {
    id: 'song-a',
    title: 'Psycho Killer',
    artist: 'Talking Heads',
    deezerAlbumId: '7',
    tonalityStart: 'A',
    defaultLineup: { 'member-1': ['bass'], 'member-2': [] },
  },
  'song-b': { id: 'song-b', title: 'Zombie', artist: 'The Cranberries', defaultLineup: {} },
  'song-c': { id: 'song-c', title: 'Encore', artist: 'Band', defaultLineup: {} },
};

function screenEntry(id: string, songId: string) {
  return { id, songId, keyOverride: null, capo: null, notes: '', lineupOverride: null };
}

const ENTRIES_BY_ID = {
  'entry-a': { ...screenEntry('entry-a', 'song-a'), capo: 2, notes: 'bridge too fast' },
  'entry-b': { ...screenEntry('entry-b', 'song-b'), keyOverride: 'Em' },
  'entry-c': screenEntry('entry-c', 'song-c'),
};

describe('buildPracticeScreen', () => {
  const input = {
    songs: SONGS,
    index: 0,
    entriesById: ENTRIES_BY_ID,
    songsById: SONGS_BY_ID,
    transitionNotesByPair: { 'song-a::song-b': 'straight in, no count' },
  };

  it('shows the current song with tonight’s key, lineup, note and the transition to the next', () => {
    const screen = buildPracticeScreen(input);
    expect(screen.current).toEqual({
      entry: ENTRIES_BY_ID['entry-a'],
      setlistId: 'set-1',
      title: 'Psycho Killer',
      artist: 'Talking Heads',
      deezerAlbumId: '7',
      keyLabel: 'A',
      lineup: { 'member-1': ['bass'] },
      transitionNote: 'straight in, no count',
    });
    expect(screen.next).toEqual({ title: 'Zombie', artist: 'The Cranberries', setlistName: null });
  });

  it('prefers tonight’s key and names the setlist the next song opens', () => {
    const screen = buildPracticeScreen({ ...input, index: 1 });
    expect(screen.current).toMatchObject({ keyLabel: 'Em', transitionNote: '' });
    expect(screen.next).toEqual({ title: 'Encore', artist: 'Band', setlistName: 'Encore' });
  });

  it('has no next song and no transition on the last song', () => {
    const screen = buildPracticeScreen({ ...input, index: 2 });
    expect(screen.next).toBeNull();
    expect(screen.current?.transitionNote).toBe('');
  });

  it('shows empty names for songs the catalogue has not loaded yet', () => {
    const screen = buildPracticeScreen({ ...input, songsById: {} });
    expect(screen.current).toMatchObject({ title: '', artist: '', deezerAlbumId: null });
    expect(screen.next).toMatchObject({ title: '', artist: '' });
  });

  it('holds no current song before the entries load, or without a song', () => {
    expect(buildPracticeScreen({ ...input, entriesById: {} }).current).toBeNull();
    expect(buildPracticeScreen({ ...input, songs: [] })).toMatchObject({
      current: null,
      next: null,
    });
  });
});

describe('formatPracticeNextLine', () => {
  it('joins the next song title, artist and new setlist, skipping what is empty', () => {
    expect(formatPracticeNextLine(null)).toBeNull();
    expect(formatPracticeNextLine({ title: 'Valerie', artist: '', setlistName: null })).toBe(
      'Valerie',
    );
    expect(
      formatPracticeNextLine({ title: 'Valerie', artist: 'Amy Winehouse', setlistName: 'Encore' }),
    ).toBe('Valerie · Amy Winehouse · Encore');
  });
});

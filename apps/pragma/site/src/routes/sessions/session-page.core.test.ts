import { describe, expect, it } from 'vitest';
import {
  buildPracticePath,
  buildSetlistPreview,
  findSelectedTake,
  groupTakesBySong,
  isPreparedConcertPickerShown,
  listSessionViews,
  type PreviewEntry,
  type PreviewSong,
  readSessionView,
  selectSessionPills,
  toggleTakeSelection,
} from './session-page.core';

function song(id: string, overrides: Partial<PreviewSong> = {}): PreviewSong {
  return {
    id,
    title: `Title ${id}`,
    artist: 'Artist',
    deezerAlbumId: null,
    durationSeconds: 180,
    defaultLineup: { 'member-1': ['bass'] },
    ...overrides,
  };
}

function entry(id: string, songId: string, position: number): PreviewEntry {
  return { id, songId, position, lineupOverride: null };
}

const SONGS_BY_ID: Readonly<Record<string, PreviewSong>> = {
  'song-a': song('song-a', { deezerAlbumId: '42' }),
  'song-b': song('song-b', { defaultLineup: {}, durationSeconds: null }),
  'song-c': song('song-c'),
  'song-d': song('song-d'),
};

// @FollowsBlueprint test-pure-unit
describe('listSessionViews', () => {
  it('offers the details view only when the session has details to show', () => {
    expect(listSessionViews({ hasDetails: true, isPractice: false })).toEqual([
      'setlist',
      'tasks',
      'takes',
      'details',
    ]);
    expect(listSessionViews({ hasDetails: false, isPractice: false })).toEqual([
      'setlist',
      'tasks',
      'takes',
    ]);
  });

  it('opens a practice on its songs instead of a setlist', () => {
    expect(listSessionViews({ hasDetails: true, isPractice: true })).toEqual([
      'songs',
      'tasks',
      'takes',
      'details',
    ]);
  });
});

describe('readSessionView', () => {
  it('reads an offered view from the address', () => {
    expect(
      readSessionView('takes', listSessionViews({ hasDetails: false, isPractice: false })),
    ).toBe('takes');
    expect(
      readSessionView('details', listSessionViews({ hasDetails: true, isPractice: false })),
    ).toBe('details');
  });

  it('falls back to the setlist for a view not offered, unknown or absent', () => {
    expect(
      readSessionView('details', listSessionViews({ hasDetails: false, isPractice: false })),
    ).toBe('setlist');
    expect(
      readSessionView('lineup', listSessionViews({ hasDetails: true, isPractice: false })),
    ).toBe('setlist');
    expect(readSessionView(null, listSessionViews({ hasDetails: true, isPractice: false }))).toBe(
      'setlist',
    );
  });

  it('falls back to the first view offered, and to the setlist when none is', () => {
    expect(readSessionView(null, listSessionViews({ hasDetails: false, isPractice: true }))).toBe(
      'songs',
    );
    expect(readSessionView('setlist', [])).toBe('setlist');
  });
});

describe('buildSetlistPreview', () => {
  it('shows the first three songs in their order, with the count and the total time', () => {
    const preview = buildSetlistPreview(
      [
        entry('entry-d', 'song-d', 4),
        entry('entry-b', 'song-b', 2),
        entry('entry-a', 'song-a', 1),
        entry('entry-c', 'song-c', 3),
      ],
      SONGS_BY_ID,
    );
    expect(preview.songCount).toBe(4);
    expect(preview.totalSeconds).toBe(540);
    expect(preview.rows.map((row) => row.entryId)).toEqual(['entry-a', 'entry-b', 'entry-c']);
    expect(preview.rows[0]).toEqual({
      entryId: 'entry-a',
      songId: 'song-a',
      title: 'Title song-a',
      deezerAlbumId: '42',
      lineup: { 'member-1': ['bass'] },
      hasNoLineup: false,
    });
  });

  it('flags a song nobody plays, and reads tonight’s lineup before the song’s', () => {
    const preview = buildSetlistPreview(
      [
        entry('entry-b', 'song-b', 1),
        { ...entry('entry-a', 'song-a', 2), lineupOverride: { 'member-1': [] } },
      ],
      SONGS_BY_ID,
    );
    expect(preview.rows.map((row) => row.hasNoLineup)).toEqual([true, true]);
  });

  it('holds no total for an empty setlist, and an empty title for a song not loaded yet', () => {
    expect(buildSetlistPreview([], SONGS_BY_ID)).toEqual({
      songCount: 0,
      totalSeconds: null,
      rows: [],
    });
    expect(buildSetlistPreview([entry('entry-x', 'song-x', 1)], {}).rows[0]).toMatchObject({
      title: '',
      deezerAlbumId: null,
      hasNoLineup: true,
    });
  });
});

describe('groupTakesBySong', () => {
  it('groups the takes under their song, the song with the newest take first', () => {
    const takes = [
      { id: 't3', songId: 'song-b' },
      { id: 't2', songId: 'song-a' },
      { id: 't1', songId: 'song-b' },
    ];
    expect(groupTakesBySong(takes, (songId) => `Title ${songId}`)).toEqual([
      { songId: 'song-b', songTitle: 'Title song-b', takes: [takes[0], takes[2]] },
      { songId: 'song-a', songTitle: 'Title song-a', takes: [takes[1]] },
    ]);
  });
});

describe('findSelectedTake', () => {
  const takes = [
    { id: 't1', songId: 'song-a' },
    { id: 't2', songId: 'song-b' },
  ];

  it('answers the selected take, and none when nothing is selected', () => {
    expect(findSelectedTake(takes, 't2')).toBe(takes[1]);
    expect(findSelectedTake(takes, 't3')).toBeNull();
    expect(findSelectedTake(takes, null)).toBeNull();
  });
});

describe('toggleTakeSelection', () => {
  it('opens a tapped take and closes it on a second tap', () => {
    expect(toggleTakeSelection(null, 't1')).toBe('t1');
    expect(toggleTakeSelection('t2', 't1')).toBe('t1');
    expect(toggleTakeSelection('t1', 't1')).toBeNull();
  });
});

describe('isPreparedConcertPickerShown', () => {
  const now = new Date('2026-10-28T10:00:00.000Z');

  it('shows the picker on a practice to come, today included', () => {
    expect(
      isPreparedConcertPickerShown({
        sessionDate: '2026-10-28T19:00:00.000Z',
        preparedConcertId: null,
        now,
      }),
    ).toBe(true);
  });

  it('hides it on a past practice that prepared no concert, and keeps it when one was named', () => {
    const past = { sessionDate: '2026-10-20T19:00:00.000Z', now };
    expect(isPreparedConcertPickerShown({ ...past, preparedConcertId: null })).toBe(false);
    expect(isPreparedConcertPickerShown({ ...past, preparedConcertId: 'concert-1' })).toBe(true);
  });
});

describe('selectSessionPills', () => {
  it('offers nothing while the setlists load', () => {
    expect(
      selectSessionPills({
        view: 'setlist',
        isLoading: true,
        isPractice: false,
        sessionId: 's',
        firstSetlistId: null,
        isPracticeModeOffered: false,
      }),
    ).toEqual({
      practicePath: null,
      setlistPath: null,
      setlistVariant: 'primary',
      setlistLabelKey: 'home.openSetlist',
      isAddSetlistShown: false,
      chooseSongsVariant: null,
    });
  });

  it('offers Add songs while the session has no setlist', () => {
    expect(
      selectSessionPills({
        view: 'setlist',
        isLoading: false,
        isPractice: false,
        sessionId: 's',
        firstSetlistId: null,
        isPracticeModeOffered: false,
      }),
    ).toEqual({
      practicePath: null,
      setlistPath: null,
      setlistVariant: 'primary',
      setlistLabelKey: 'home.openSetlist',
      isAddSetlistShown: true,
      chooseSongsVariant: null,
    });
  });

  it('opens the setlist on any other day', () => {
    expect(
      selectSessionPills({
        view: 'setlist',
        isLoading: false,
        isPractice: false,
        sessionId: 's',
        firstSetlistId: 'set-1',
        isPracticeModeOffered: false,
      }),
    ).toEqual({
      practicePath: null,
      setlistPath: '/setlists/set-1',
      setlistVariant: 'primary',
      setlistLabelKey: 'home.openSetlist',
      isAddSetlistShown: false,
      chooseSongsVariant: null,
    });
  });

  it('starts the practice on its day, with the setlist beside it under a short label', () => {
    expect(
      selectSessionPills({
        view: 'setlist',
        isLoading: false,
        isPractice: false,
        sessionId: 's',
        firstSetlistId: 'set-1',
        isPracticeModeOffered: true,
      }),
    ).toEqual({
      practicePath: '/sessions/s/practice',
      setlistPath: '/setlists/set-1',
      setlistVariant: 'secondary',
      setlistLabelKey: 'sessions.setlist',
      isAddSetlistShown: false,
      chooseSongsVariant: null,
    });
  });
});

describe('selectSessionPills on a practice', () => {
  const practice = {
    isLoading: false,
    isPractice: true,
    sessionId: 's',
    firstSetlistId: 'set-1',
    view: 'songs',
  } as const;

  it('offers Choose songs as the one primary action, and never the setlist', () => {
    expect(selectSessionPills({ ...practice, isPracticeModeOffered: false })).toEqual({
      practicePath: null,
      setlistPath: null,
      setlistVariant: 'primary',
      setlistLabelKey: 'home.openSetlist',
      isAddSetlistShown: false,
      chooseSongsVariant: 'primary',
    });
  });

  it('starts the practice on its day, with Choose songs beside it', () => {
    expect(selectSessionPills({ ...practice, isPracticeModeOffered: true })).toEqual({
      practicePath: '/sessions/s/practice',
      setlistPath: null,
      setlistVariant: 'primary',
      setlistLabelKey: 'home.openSetlist',
      isAddSetlistShown: false,
      chooseSongsVariant: 'secondary',
    });
  });

  it('offers nothing while the songs load', () => {
    expect(
      selectSessionPills({ ...practice, isLoading: true, isPracticeModeOffered: true })
        .chooseSongsVariant,
    ).toBe(null);
  });

  it('offers Choose songs on the Songs tab only', () => {
    for (const isPracticeModeOffered of [false, true]) {
      for (const view of ['tasks', 'takes', 'details'] as const) {
        expect(
          selectSessionPills({ ...practice, view, isPracticeModeOffered }).chooseSongsVariant,
        ).toBe(null);
      }
    }
    expect(selectSessionPills({ ...practice, isPracticeModeOffered: true }).practicePath).toBe(
      '/sessions/s/practice',
    );
    expect(
      selectSessionPills({ ...practice, view: 'takes', isPracticeModeOffered: true }).practicePath,
    ).toBe('/sessions/s/practice');
  });
});

describe('buildPracticePath', () => {
  it('nests practice mode under its session', () => {
    expect(buildPracticePath('abc')).toBe('/sessions/abc/practice');
  });
});

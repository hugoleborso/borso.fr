import { describe, expect, it } from 'vitest';
import {
  describeTonality,
  listSongCandidates,
  projectSongForTool,
  summarizeSongs,
} from './song-tool.core';
import type { SongRow } from './songs.repository';

const NAMES = {
  members: [{ id: 'member-hugo', name: 'Hugo' }],
  instruments: [{ id: 'instrument-drums', name: 'Batterie' }],
};

function buildSong(overrides: Partial<SongRow>): SongRow {
  return {
    id: 'song-1',
    title: 'Slow Burn',
    artist: 'The Embers',
    status: 'concert_ready',
    origin: 'cover',
    links: [],
    chart: null,
    tonalityStart: 'Am',
    tonalityEnd: null,
    defaultLineup: { 'member-hugo': ['instrument-drums'] },
    baseEnergy: 3,
    deezerTrackId: null,
    deezerAlbumId: null,
    spotifyTrackId: null,
    album: null,
    durationSeconds: null,
    isrcs: [],
    tags: [],
    structureNotes: '',
    gimmickNotes: '',
    notes: '',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    ...overrides,
  };
}

const SLOW_BURN = buildSong({});
const RUNAWAY = buildSong({
  id: 'song-2',
  title: 'Runaway Sun',
  artist: 'Léa Novak',
  status: 'wip',
  tonalityStart: null,
});

// @FollowsBlueprint test-pure-unit
describe('describeTonality', () => {
  it('writes a start, a change of key, and a key that ends where it began', () => {
    expect(describeTonality('Am', null)).toBe('Am');
    expect(describeTonality('Am', 'C')).toBe('Am→C');
    expect(describeTonality('Am', 'Am')).toBe('Am');
    expect(describeTonality(null, 'C')).toBe('C');
    expect(describeTonality(null, null)).toBeNull();
  });
});

describe('listSongCandidates', () => {
  it('labels each song with its title and hints its artist', () => {
    expect(listSongCandidates([SLOW_BURN])).toEqual([
      { id: 'song-1', label: 'Slow Burn', hint: 'The Embers' },
    ]);
  });
});

describe('summarizeSongs', () => {
  it('answers every song by title, with what tells them apart', () => {
    expect(summarizeSongs([SLOW_BURN, RUNAWAY], {})).toEqual([
      { id: 'song-2', title: 'Runaway Sun', artist: 'Léa Novak', status: 'wip', tonality: null },
      {
        id: 'song-1',
        title: 'Slow Burn',
        artist: 'The Embers',
        status: 'concert_ready',
        tonality: 'Am',
      },
    ]);
  });

  it('keeps the songs whose title or artist holds the query, accents and case aside', () => {
    expect(summarizeSongs([SLOW_BURN, RUNAWAY], { query: 'lea' }).map((song) => song.id)).toEqual([
      'song-2',
    ]);
    expect(summarizeSongs([SLOW_BURN, RUNAWAY], { query: 'BURN' }).map((song) => song.id)).toEqual([
      'song-1',
    ]);
  });

  it('keeps the songs of the status asked for', () => {
    expect(summarizeSongs([SLOW_BURN, RUNAWAY], { status: 'wip' }).map((song) => song.id)).toEqual([
      'song-2',
    ]);
  });
});

describe('projectSongForTool', () => {
  it('names the lineup and gives the chart kind only, leaving out empty lists', () => {
    const song = buildSong({ chart: { kind: 'chordpro', text: '{title: Slow Burn}' } });
    expect(projectSongForTool(song, NAMES, false)).toEqual({
      id: 'song-1',
      title: 'Slow Burn',
      artist: 'The Embers',
      status: 'concert_ready',
      origin: 'cover',
      tonality: 'Am',
      energy: 3,
      durationSeconds: null,
      lineup: { Hugo: 'Batterie' },
      tags: undefined,
      structureNotes: '',
      gimmickNotes: '',
      notes: '',
      chart: 'chordpro',
    });
  });

  it('answers no chart kind for a song without a chart', () => {
    expect(projectSongForTool(SLOW_BURN, NAMES, false).chart).toBeNull();
  });

  it('adds the chart itself, the links and the streaming identifiers in detail', () => {
    const link = { url: 'https://example.com/a', provider: 'other' as const, comment: '' };
    const song = buildSong({
      chart: { kind: 'chordpro', text: '{title: Slow Burn}' },
      links: [link],
      tags: ['ballad'],
      isrcs: ['FRX000000001'],
      deezerTrackId: 'deezer-1',
    });
    expect(projectSongForTool(song, NAMES, true)).toMatchObject({
      tags: ['ballad'],
      chart: { kind: 'chordpro', text: '{title: Slow Burn}' },
      links: [link],
      deezerTrackId: 'deezer-1',
      isrcs: ['FRX000000001'],
    });
    expect(projectSongForTool(SLOW_BURN, NAMES, true)).toMatchObject({
      links: undefined,
      isrcs: undefined,
    });
  });
});

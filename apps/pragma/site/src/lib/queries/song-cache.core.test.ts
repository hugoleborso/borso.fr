import { describe, expect, it } from 'vitest';
import { buildOptimisticSong, mergeSongUpdate } from './song-cache.core';

type ExistingSong = Parameters<typeof mergeSongUpdate>[0];

const CREATED_AT = '2026-08-15T00:00:00.000Z';

const EXISTING_SONG = {
  id: 'song-1',
  createdAt: CREATED_AT,
  title: 'Last Call',
  artist: 'Volt',
  status: 'rehearsed',
  links: [{ url: 'https://example.test/a', provider: 'other', comment: 'live take' }],
  chart: null,
  tonalityStart: 'F',
  tonalityEnd: null,
  defaultLineup: { 'member-1': ['instrument-1'] },
  baseEnergy: 4,
  mbid: null,
  album: null,
  durationSeconds: null,
  isrcs: [],
  tags: [],
  structureNotes: '',
  gimmickNotes: '',
  notes: '',
} satisfies ExistingSong;

// @FollowsBlueprint test-pure-unit
describe('buildOptimisticSong', () => {
  it('fills every field the server would have defaulted', () => {
    const song = buildOptimisticSong('temporary-1', CREATED_AT, {
      title: 'Afterglow',
      status: 'idea',
    });

    expect(song).toMatchObject({
      id: 'temporary-1',
      createdAt: CREATED_AT,
      title: 'Afterglow',
      status: 'idea',
      artist: '',
      links: [],
      defaultLineup: {},
      baseEnergy: null,
      chart: null,
    });
  });

  it('keeps what the write said over the defaults', () => {
    const song = buildOptimisticSong('temporary-1', CREATED_AT, {
      title: 'Afterglow',
      status: 'idea',
      artist: 'Nova Reef',
      baseEnergy: 7,
    });

    expect(song.artist).toBe('Nova Reef');
    expect(song.baseEnergy).toBe(7);
  });

  it('gives a link without a comment the empty one a read would answer with', () => {
    const song = buildOptimisticSong('temporary-1', CREATED_AT, {
      title: 'Afterglow',
      status: 'idea',
      links: [
        { url: 'https://example.test/a', provider: 'other' },
        { url: 'https://example.test/b', provider: 'youtube', comment: 'clip' },
      ],
    });

    expect(song.links).toEqual([
      { url: 'https://example.test/a', provider: 'other', comment: '' },
      { url: 'https://example.test/b', provider: 'youtube', comment: 'clip' },
    ]);
  });

  it('answers a lineup as the list shape a read always uses', () => {
    const song = buildOptimisticSong('temporary-1', CREATED_AT, {
      title: 'Afterglow',
      status: 'idea',
      defaultLineup: { 'member-1': 'instrument-1', 'member-2': null },
    });

    expect(song.defaultLineup).toEqual({ 'member-1': ['instrument-1'], 'member-2': [] });
  });
});

// @FollowsBlueprint test-pure-unit
describe('mergeSongUpdate', () => {
  it('takes the patched fields and keeps the rest', () => {
    const merged = mergeSongUpdate(EXISTING_SONG, { artist: 'Volt Collective' });

    expect(merged.artist).toBe('Volt Collective');
    expect(merged.title).toBe('Last Call');
    expect(merged.links).toEqual(EXISTING_SONG.links);
    expect(merged.defaultLineup).toEqual(EXISTING_SONG.defaultLineup);
  });

  it('replaces the links when the patch carries them', () => {
    const merged = mergeSongUpdate(EXISTING_SONG, {
      links: [{ url: 'https://example.test/c', provider: 'spotify' }],
    });

    expect(merged.links).toEqual([
      { url: 'https://example.test/c', provider: 'spotify', comment: '' },
    ]);
  });

  it('replaces the lineup when the patch carries it, in the read shape', () => {
    const merged = mergeSongUpdate(EXISTING_SONG, {
      defaultLineup: { 'member-2': 'instrument-2' },
    });

    expect(merged.defaultLineup).toEqual({ 'member-2': ['instrument-2'] });
  });

  it('reads an empty patch as no change at all', () => {
    expect(mergeSongUpdate(EXISTING_SONG, {})).toEqual(EXISTING_SONG);
  });
});

import { describe, expect, it } from 'vitest';
import {
  applyExternalPickToDraft,
  BLANK_SONG_DRAFT,
  chartsFromDraft,
  detectProvider,
  payloadFromDraft,
  type Song,
  SONG_STATUS_LABEL_KEY,
  type SongDraftState,
  songFromApi,
  songSchema,
} from './song-draft.core';
import { SONG_STATUSES } from '@domain/song-status.core';
import { BLANK_CHART_CARD, type SongChartCardDraft } from './song-chart-cards.core';

const GUITAR_ID = 'instrument-guitar';

const API_SONG: Song = {
  id: '00000000-0000-4000-8000-000000000000',
  deezerAlbumId: null,
  spotifyTrackId: null,
  title: 'Slow Burn',
  artist: 'The Embers',
  status: 'rehearsed',
  origin: 'original',
  tonalityStart: 'Am',
  tonalityEnd: 'C',
  baseEnergy: 6,
  links: [{ url: 'https://open.spotify.com/x', provider: 'spotify', comment: '' }],
  charts: [{ kind: 'chordpro', text: '[C]Hello', instrumentIds: [], label: null }],
  deezerTrackId: 'deezerTrackId-1',
  album: 'Embers',
  durationSeconds: 210,
  isrcs: ['ISRC1'],
  tags: ['rock'],
  structureNotes: 'intro ×4',
  gimmickNotes: 'break avant le dernier refrain',
  notes: '',
  defaultLineup: { 'member-1': ['bass'] },
};

// @FollowsBlueprint test-pure-unit
describe('songSchema', () => {
  it('accepts a song from the API', () => {
    expect(songSchema.safeParse(API_SONG).success).toBe(true);
  });

  it('defaults the optional collections', () => {
    const song = songSchema.parse({
      id: API_SONG.id,
      title: 'X',
      artist: '',
      status: 'idea',
      tonalityStart: null,
      tonalityEnd: null,
      baseEnergy: null,
      charts: [],
    });
    expect(song).toMatchObject({
      links: [],
      isrcs: [],
      tags: [],
      deezerTrackId: null,
      album: null,
    });
  });
});

describe('SONG_STATUS_LABEL_KEY', () => {
  it('carries a translation key for every status', () => {
    expect(Object.keys(SONG_STATUS_LABEL_KEY)).toEqual([...SONG_STATUSES]);
  });
});

describe('songFromApi', () => {
  it('maps a ChordPro song into the draft', () => {
    expect(songFromApi(API_SONG)).toEqual({
      title: 'Slow Burn',
      artist: 'The Embers',
      origin: 'original',
      deezerAlbumId: null,
      spotifyTrackId: null,
      status: 'rehearsed',
      tonalityStart: 'Am',
      tonalityEnd: 'C',
      baseEnergy: 6,
      charts: [{ ...BLANK_CHART_CARD, kind: 'chordpro', chordproText: '[C]Hello' }],
      links: API_SONG.links,
      deezerTrackId: 'deezerTrackId-1',
      album: 'Embers',
      durationSeconds: 210,
      isrcs: ['ISRC1'],
      tags: ['rock'],
      structureNotes: 'intro ×4',
      gimmickNotes: 'break avant le dernier refrain',
      notes: '',
      defaultLineup: { 'member-1': ['bass'] },
    });
  });

  it('maps each chart into its own card, keeping its instruments and label', () => {
    const draft = songFromApi({
      ...API_SONG,
      charts: [
        { kind: 'pdf', s3Key: 'charts/a.pdf', instrumentIds: [GUITAR_ID], label: 'Solo' },
        { kind: 'image', s3Key: 'charts/a.png', instrumentIds: [], label: null },
      ],
    });
    expect(draft.charts).toEqual([
      {
        ...BLANK_CHART_CARD,
        kind: 'pdf',
        pdfS3Key: 'charts/a.pdf',
        instrumentIds: [GUITAR_ID],
        label: 'Solo',
      },
      { ...BLANK_CHART_CARD, kind: 'image', imageS3Key: 'charts/a.png' },
    ]);
  });

  it('turns every absent value into its blank form value', () => {
    const draft = songFromApi({
      ...API_SONG,
      tonalityStart: null,
      tonalityEnd: null,
      baseEnergy: null,
      charts: [],
      album: null,
    });
    expect(draft).toMatchObject({
      tonalityStart: '',
      tonalityEnd: '',
      baseEnergy: null,
      charts: [BLANK_CHART_CARD],
      album: '',
    });
  });
});

function draftWith(...cards: SongChartCardDraft[]): SongDraftState {
  return { ...BLANK_SONG_DRAFT, charts: cards };
}

const CHORDPRO_CARD: SongChartCardDraft = {
  ...BLANK_CHART_CARD,
  kind: 'chordpro',
  chordproText: '[C]',
};

describe('chartsFromDraft', () => {
  it('drops a card with no kind chosen', () => {
    expect(chartsFromDraft(BLANK_SONG_DRAFT)).toEqual([]);
  });

  it('builds a ChordPro chart with its instruments and trimmed label', () => {
    expect(
      chartsFromDraft(draftWith({ ...CHORDPRO_CARD, instrumentIds: [GUITAR_ID], label: ' Solo ' })),
    ).toEqual([{ kind: 'chordpro', text: '[C]', instrumentIds: [GUITAR_ID], label: 'Solo' }]);
  });

  it('saves pasted chords above lyrics as ChordPro, and a blank label as none', () => {
    expect(
      chartsFromDraft(draftWith({ ...CHORDPRO_CARD, chordproText: 'C\nHello', label: ' ' })),
    ).toEqual([{ kind: 'chordpro', text: '[C]Hello', instrumentIds: [], label: null }]);
  });

  it('builds a pdf chart and an image chart', () => {
    expect(
      chartsFromDraft(
        draftWith(
          { ...BLANK_CHART_CARD, kind: 'pdf', pdfS3Key: 'a.pdf' },
          { ...BLANK_CHART_CARD, kind: 'image', imageS3Key: 'a.png' },
        ),
      ),
    ).toEqual([
      { kind: 'pdf', s3Key: 'a.pdf', instrumentIds: [], label: null },
      { kind: 'image', s3Key: 'a.png', instrumentIds: [], label: null },
    ]);
  });

  it('drops a card whose text or file was emptied', () => {
    expect(
      chartsFromDraft(
        draftWith(
          { ...CHORDPRO_CARD, chordproText: '' },
          { ...BLANK_CHART_CARD, kind: 'pdf' },
          { ...BLANK_CHART_CARD, kind: 'image' },
        ),
      ),
    ).toEqual([]);
  });
});

describe('payloadFromDraft', () => {
  const filled: SongDraftState = {
    ...BLANK_SONG_DRAFT,
    title: '  Slow Burn  ',
    artist: '  The Embers ',
    status: 'wip',
    tonalityStart: ' Am ',
    tonalityEnd: ' C ',
    baseEnergy: 7,
    album: '  Embers ',
  };

  it('refuses a draft with a blank title', () => {
    expect(payloadFromDraft({ ...filled, title: '   ' })).toBeNull();
  });

  it('trims every text field and keeps the energy', () => {
    expect(payloadFromDraft(filled)).toEqual({
      title: 'Slow Burn',
      artist: 'The Embers',
      status: 'wip',
      origin: 'cover',
      tonalityStart: 'Am',
      tonalityEnd: 'C',
      baseEnergy: 7,
      charts: [],
      links: [],
      deezerTrackId: null,
      deezerAlbumId: null,
      spotifyTrackId: null,
      album: 'Embers',
      durationSeconds: null,
      isrcs: [],
      structureNotes: '',
      gimmickNotes: '',
      notes: '',
      tags: [],
      defaultLineup: {},
    });
  });

  it('reads whitespace-only optional fields as blank', () => {
    expect(
      payloadFromDraft({
        ...filled,
        tonalityStart: '   ',
        tonalityEnd: '   ',
      }),
    ).toMatchObject({ tonalityStart: null, tonalityEnd: null });
  });

  it('maps every blank optional field to null', () => {
    expect(payloadFromDraft({ ...BLANK_SONG_DRAFT, title: 'X' })).toMatchObject({
      tonalityStart: null,
      tonalityEnd: null,
      baseEnergy: null,
      album: null,
    });
  });
});

describe('detectProvider', () => {
  it('recognises Spotify', () => {
    expect(detectProvider('https://OPEN.SPOTIFY.com/track/1')).toBe('spotify');
  });

  it('recognises Deezer', () => {
    expect(detectProvider('https://www.deezer.com/track/1')).toBe('deezer');
  });

  it('recognises both YouTube hosts', () => {
    expect(detectProvider('https://www.youtube.com/watch?v=1')).toBe('youtube');
    expect(detectProvider('https://youtu.be/1')).toBe('youtube');
  });

  it('falls back to other', () => {
    expect(detectProvider('https://example.com/track')).toBe('other');
  });
});

describe('applyExternalPickToDraft', () => {
  it('overwrites the metadata fields and leaves the rest of the draft alone', () => {
    const draft: SongDraftState = {
      ...BLANK_SONG_DRAFT,
      status: 'rehearsed',
      tonalityStart: 'Am',
      tags: ['kept'],
      spotifyTrackId: 'stale-from-the-previous-track',
    };
    expect(
      applyExternalPickToDraft(draft, {
        deezerTrackId: 'track-2',
        deezerAlbumId: 'album-2',
        title: 'Lightning',
        artist: 'Volt',
        album: null,
        durationSeconds: 180,
        isrcs: ['ISRC2'],
      }),
    ).toEqual({
      ...draft,
      title: 'Lightning',
      artist: 'Volt',
      deezerTrackId: 'track-2',
      deezerAlbumId: 'album-2',
      spotifyTrackId: null,
      album: '',
      durationSeconds: 180,
      isrcs: ['ISRC2'],
      tags: ['kept'],
    });
  });
});

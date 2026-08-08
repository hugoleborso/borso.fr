import { describe, expect, it } from 'vitest';
import {
  applyExternalPickToDraft,
  BLANK_SONG_DRAFT,
  chartFromDraft,
  detectProvider,
  payloadFromDraft,
  type Song,
  SONG_STATUS_LABEL_KEY,
  type SongDraftState,
  songFromApi,
  songSchema,
  songStatuses,
} from './song-draft.core';

const API_SONG: Song = {
  id: '00000000-0000-4000-8000-000000000000',
  title: 'Slow Burn',
  artist: 'The Embers',
  status: 'rehearsed',
  tonalityStart: 'Am',
  tonalityEnd: 'C',
  baseEnergy: 6,
  links: [{ url: 'https://open.spotify.com/x', provider: 'spotify', comment: '' }],
  chart: { kind: 'chordpro', text: '[C]Hello' },
  mbid: 'mbid-1',
  album: 'Embers',
  durationSeconds: 210,
  isrcs: ['ISRC1'],
  tags: ['rock'],
};

describe('songSchema', () => {
  it('accepts a song from the API', () => {
    expect(songSchema.safeParse(API_SONG).success).toBe(true);
  });

  it('defaults the optional collections', () => {
    const parsed = songSchema.parse({
      id: API_SONG.id,
      title: 'X',
      artist: '',
      status: 'idea',
      tonalityStart: null,
      tonalityEnd: null,
      baseEnergy: null,
      chart: null,
    });
    expect(parsed).toMatchObject({ links: [], isrcs: [], tags: [], mbid: null, album: null });
  });
});

describe('SONG_STATUS_LABEL_KEY', () => {
  it('carries a translation key for every status', () => {
    expect(Object.keys(SONG_STATUS_LABEL_KEY)).toEqual([...songStatuses]);
  });
});

describe('songFromApi', () => {
  it('maps a ChordPro song into the draft', () => {
    expect(songFromApi(API_SONG)).toEqual({
      title: 'Slow Burn',
      artist: 'The Embers',
      status: 'rehearsed',
      tonalityStart: 'Am',
      tonalityEnd: 'C',
      baseEnergy: '6',
      chartKind: 'chordpro',
      chordproText: '[C]Hello',
      pdfS3Key: '',
      imageS3Key: '',
      links: API_SONG.links,
      mbid: 'mbid-1',
      album: 'Embers',
      durationSeconds: 210,
      isrcs: ['ISRC1'],
      tags: ['rock'],
    });
  });

  it('maps a pdf chart into the pdf key', () => {
    const draft = songFromApi({ ...API_SONG, chart: { kind: 'pdf', s3Key: 'charts/a.pdf' } });
    expect(draft).toMatchObject({ chartKind: 'pdf', pdfS3Key: 'charts/a.pdf', chordproText: '' });
  });

  it('maps an image chart into the image key', () => {
    const draft = songFromApi({ ...API_SONG, chart: { kind: 'image', s3Key: 'charts/a.png' } });
    expect(draft).toMatchObject({ chartKind: 'image', imageS3Key: 'charts/a.png' });
  });

  it('turns every absent value into its blank form value', () => {
    const draft = songFromApi({
      ...API_SONG,
      tonalityStart: null,
      tonalityEnd: null,
      baseEnergy: null,
      chart: null,
      album: null,
    });
    expect(draft).toMatchObject({
      tonalityStart: '',
      tonalityEnd: '',
      baseEnergy: '',
      chartKind: 'none',
      album: '',
    });
  });
});

describe('chartFromDraft', () => {
  it('is null when the draft carries no chart', () => {
    expect(chartFromDraft(BLANK_SONG_DRAFT)).toBeNull();
  });

  it('builds a ChordPro chart', () => {
    expect(
      chartFromDraft({ ...BLANK_SONG_DRAFT, chartKind: 'chordpro', chordproText: '[C]' }),
    ).toEqual({ kind: 'chordpro', text: '[C]' });
  });

  it('builds a pdf chart', () => {
    expect(chartFromDraft({ ...BLANK_SONG_DRAFT, chartKind: 'pdf', pdfS3Key: 'a.pdf' })).toEqual({
      kind: 'pdf',
      s3Key: 'a.pdf',
    });
  });

  it('builds an image chart', () => {
    expect(
      chartFromDraft({ ...BLANK_SONG_DRAFT, chartKind: 'image', imageS3Key: 'a.png' }),
    ).toEqual({ kind: 'image', s3Key: 'a.png' });
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
    baseEnergy: ' 7 ',
    album: '  Embers ',
  };

  it('refuses a draft with a blank title', () => {
    expect(payloadFromDraft({ ...filled, title: '   ' })).toBeNull();
  });

  it('trims every text field and parses the energy', () => {
    expect(payloadFromDraft(filled)).toEqual({
      title: 'Slow Burn',
      artist: 'The Embers',
      status: 'wip',
      tonalityStart: 'Am',
      tonalityEnd: 'C',
      baseEnergy: 7,
      chart: null,
      links: [],
      mbid: null,
      album: 'Embers',
      durationSeconds: null,
      isrcs: [],
      tags: [],
    });
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
    const draft: SongDraftState = { ...BLANK_SONG_DRAFT, status: 'rehearsed', tonalityStart: 'Am' };
    expect(
      applyExternalPickToDraft(draft, {
        mbid: 'mbid-2',
        title: 'Lightning',
        artist: 'Volt',
        album: null,
        durationSeconds: 180,
        isrcs: ['ISRC2'],
        tags: ['rock'],
      }),
    ).toEqual({
      ...draft,
      title: 'Lightning',
      artist: 'Volt',
      mbid: 'mbid-2',
      album: '',
      durationSeconds: 180,
      isrcs: ['ISRC2'],
      tags: ['rock'],
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  type AudienceSongHit,
  collapseTracksSharingAnIsrc,
  DEEZER_QUOTA_ERROR_CODE,
  mapDeezerTrack,
  mapDeezerTracks,
  readCachedAudienceHits,
  readDeezerErrorCode,
} from './deezer.core';

const WONDERWALL_TRACK_ID = 985745702;
const WONDERWALL_ISRC = 'GBAAW9500189';

function deezerTrack(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: WONDERWALL_TRACK_ID,
    title: 'Wonderwall',
    title_short: 'Wonderwall',
    isrc: WONDERWALL_ISRC,
    duration: 258,
    artist: { name: 'Oasis' },
    album: { title: "(What's The Story) Morning Glory?" },
    ...overrides,
  };
}

function hit(overrides: Partial<AudienceSongHit> = {}): AudienceSongHit {
  return {
    trackId: '1',
    title: 'Wonderwall',
    artist: 'Oasis',
    album: null,
    durationSeconds: null,
    isrc: WONDERWALL_ISRC,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('mapDeezerTracks', () => {
  it('reads the fields the room needs and drops the rest of the payload', () => {
    const [mapped] = mapDeezerTracks({ data: [deezerTrack()] });
    expect(mapped).toEqual({
      trackId: String(WONDERWALL_TRACK_ID),
      title: 'Wonderwall',
      artist: 'Oasis',
      album: "(What's The Story) Morning Glory?",
      durationSeconds: 258,
      isrc: WONDERWALL_ISRC,
    });
  });

  it('carries the track id as text, because the catalogue never stores a number as an identifier', () => {
    const [mapped] = mapDeezerTracks({ data: [deezerTrack({ id: 42 })] });
    expect(mapped?.trackId).toBe('42');
  });

  it('accepts a track id already sent as text', () => {
    const [mapped] = mapDeezerTracks({ data: [deezerTrack({ id: '42' })] });
    expect(mapped?.trackId).toBe('42');
  });

  it('prefers the short title, which is the one without the version suffix', () => {
    const [mapped] = mapDeezerTracks({
      data: [deezerTrack({ title: 'Wonderwall (Remastered)', title_short: 'Wonderwall' })],
    });
    expect(mapped?.title).toBe('Wonderwall');
  });

  it('falls back to the full title when the short one is absent or blank', () => {
    const [absent] = mapDeezerTracks({ data: [deezerTrack({ title_short: undefined })] });
    const [blank] = mapDeezerTracks({
      data: [deezerTrack({ title: 'Live At Knebworth', title_short: '   ' })],
    });
    expect(absent?.title).toBe('Wonderwall');
    expect(blank?.title).toBe('Live At Knebworth');
  });

  it('drops a track with no title, because the room cannot vote for a blank row', () => {
    expect(mapDeezerTracks({ data: [deezerTrack({ title: '', title_short: '' })] })).toEqual([]);
  });

  it('drops a track whose only title is whitespace, which reads as a blank row', () => {
    expect(
      mapDeezerTracks({ data: [deezerTrack({ title: '   ', title_short: undefined })] }),
    ).toEqual([]);
  });

  it('drops a track carrying neither title field at all', () => {
    expect(
      mapDeezerTracks({ data: [deezerTrack({ title: undefined, title_short: undefined })] }),
    ).toEqual([]);
  });

  it('drops a track with no artist, for the same reason', () => {
    expect(mapDeezerTracks({ data: [deezerTrack({ artist: { name: '  ' } })] })).toEqual([]);
    expect(mapDeezerTracks({ data: [deezerTrack({ artist: undefined })] })).toEqual([]);
    expect(mapDeezerTracks({ data: [deezerTrack({ artist: {} })] })).toEqual([]);
  });

  it('reads a missing or zero duration as unknown rather than as zero seconds', () => {
    const [absent] = mapDeezerTracks({ data: [deezerTrack({ duration: undefined })] });
    const [zero] = mapDeezerTracks({ data: [deezerTrack({ duration: 0 })] });
    expect(absent?.durationSeconds).toBe(null);
    expect(zero?.durationSeconds).toBe(null);
  });

  it('reads a missing album or isrc as unknown', () => {
    const [mapped] = mapDeezerTracks({
      data: [deezerTrack({ album: undefined, isrc: undefined })],
    });
    expect(mapped?.album).toBe(null);
    expect(mapped?.isrc).toBe(null);
  });

  it('reads a blank album title as unknown rather than as an empty name', () => {
    const [mapped] = mapDeezerTracks({ data: [deezerTrack({ album: { title: '   ' } })] });
    expect(mapped?.album).toBe(null);
  });

  it('answers nothing for a payload that is not a search response', () => {
    expect(mapDeezerTracks({ error: { message: 'Quota exceeded' } })).toEqual([]);
    expect(mapDeezerTracks(null)).toEqual([]);
    expect(mapDeezerTracks({ data: 'not an array' })).toEqual([]);
  });

  it('answers nothing for a response carrying no results', () => {
    expect(mapDeezerTracks({})).toEqual([]);
    expect(mapDeezerTracks({ data: [] })).toEqual([]);
  });
});

describe('collapseTracksSharingAnIsrc', () => {
  it('keeps one row per recording, because a reissue is a separate track upstream', () => {
    const collapsed = collapseTracksSharingAnIsrc([
      hit({ trackId: '985745702' }),
      hit({ trackId: '985985832' }),
    ]);
    expect(collapsed.map((entry) => entry.trackId)).toEqual(['985745702']);
  });

  it('keeps the first row, so the provider ranking survives the collapse', () => {
    const collapsed = collapseTracksSharingAnIsrc([
      hit({ trackId: 'ranked-first', album: 'Morning Glory' }),
      hit({ trackId: 'ranked-second', album: 'Greatest Hits' }),
    ]);
    expect(collapsed[0]?.album).toBe('Morning Glory');
  });

  it('leaves rows with different isrcs alone, because they are different recordings', () => {
    const collapsed = collapseTracksSharingAnIsrc([
      hit({ trackId: 'studio', isrc: 'GBAAW9500189' }),
      hit({ trackId: 'live', isrc: 'GBAAW0300456' }),
    ]);
    expect(collapsed).toHaveLength(2);
  });

  it('keeps every row that carries no isrc, because absence is not sameness', () => {
    const collapsed = collapseTracksSharingAnIsrc([
      hit({ trackId: 'a', isrc: null }),
      hit({ trackId: 'b', isrc: null }),
    ]);
    expect(collapsed.map((entry) => entry.trackId)).toEqual(['a', 'b']);
  });

  it('collapses nothing in an empty list', () => {
    expect(collapseTracksSharingAnIsrc([])).toEqual([]);
  });
});

describe('mapDeezerTrack', () => {
  it('reads one track, which is what the accepted suggestion is resolved from', () => {
    expect(mapDeezerTrack(deezerTrack())).toEqual({
      trackId: String(WONDERWALL_TRACK_ID),
      title: 'Wonderwall',
      artist: 'Oasis',
      album: "(What's The Story) Morning Glory?",
      durationSeconds: 258,
      isrc: WONDERWALL_ISRC,
    });
  });

  it('answers nothing for a track the room could not have voted for', () => {
    expect(mapDeezerTrack(deezerTrack({ artist: undefined }))).toBe(null);
  });

  it('answers nothing for a payload that is not a track', () => {
    expect(mapDeezerTrack({ error: { code: 800, message: 'no data' } })).toBe(null);
    expect(mapDeezerTrack(null)).toBe(null);
  });
});

describe('readDeezerErrorCode', () => {
  it('reads the refusal the provider stated inside a success', () => {
    expect(
      readDeezerErrorCode({ error: { type: 'Exception', code: DEEZER_QUOTA_ERROR_CODE } }),
    ).toBe(DEEZER_QUOTA_ERROR_CODE);
  });

  it('tells an unknown record apart from a refused quota, because they arrive the same way', () => {
    expect(readDeezerErrorCode({ error: { type: 'DataException', code: 800 } })).toBe(800);
  });

  it('answers nothing when the provider stated an error but no code', () => {
    expect(readDeezerErrorCode({ error: { message: 'no data' } })).toBe(null);
  });

  it('answers nothing for the payload of a call that succeeded', () => {
    expect(readDeezerErrorCode({ data: [] })).toBe(null);
    expect(readDeezerErrorCode(null)).toBe(null);
  });
});

describe('readCachedAudienceHits', () => {
  it('reads back a row this application wrote', () => {
    const hits = [hit()];
    expect(readCachedAudienceHits(JSON.stringify(hits))).toEqual(hits);
  });

  it('reads nothing from a row written in another shape, rather than half a row', () => {
    expect(readCachedAudienceHits(JSON.stringify([{ mbid: 'mb-1', title: 'Wonderwall' }]))).toEqual(
      [],
    );
  });
});

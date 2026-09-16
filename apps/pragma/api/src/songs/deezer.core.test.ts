/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import FIXTURE from './__fixtures__/deezer-sample.json';
import {
  type ExternalSearchCacheEntry,
  expiredSearchCacheKeys,
  type ExternalSongHit,
  mapDeezerTracks,
} from './deezer.core';

function firstHit(payload: unknown): ExternalSongHit | undefined {
  return mapDeezerTracks(payload)[0];
}

describe('mapDeezerTracks', () => {
  it('reads the captured search response into the domain shape', () => {
    const hits = mapDeezerTracks(FIXTURE);
    expect(hits.length).toBeGreaterThan(0);
    const hit = hits[0];
    expect(hit).toMatchObject({
      deezerTrackId: '67238735',
      title: 'Get Lucky',
      artist: 'Daft Punk',
      album: 'Random Access Memories',
      deezerAlbumId: '6575789',
      durationSeconds: 367,
      durationLabel: '6:07',
      titleVersion: '(feat. Pharrell Williams and Nile Rodgers)',
      isrcs: ['USQX91300108'],
      isExplicit: false,
    });
    expect(hit?.popularity).toBeGreaterThan(0);
  });

  it('returns nothing when the payload is not a search response at all', () => {
    expect(mapDeezerTracks({ data: 'not-a-list' })).toEqual([]);
    expect(mapDeezerTracks(null)).toEqual([]);
  });

  it('returns nothing when Deezer answers with an error object instead of data', () => {
    expect(mapDeezerTracks({ error: { type: 'Exception', message: 'invalid' } })).toEqual([]);
  });

  it('prefers the short title, which carries no version suffix', () => {
    const hit = firstHit({
      data: [{ id: 1, title: 'Valerie (Live)', title_short: 'Valerie', title_version: '(Live)' }],
    });
    expect(hit?.title).toBe('Valerie');
    expect(hit?.titleVersion).toBe('(Live)');
  });

  it('falls back to the full title when Deezer sends no short one', () => {
    expect(firstHit({ data: [{ id: 1, title: 'Valerie' }] })?.title).toBe('Valerie');
  });

  it('drops a track with no usable title rather than emitting a blank row', () => {
    expect(mapDeezerTracks({ data: [{ id: 1, title: '   ', title_short: '' }] })).toEqual([]);
  });

  it('empties every field Deezer omitted rather than guessing one', () => {
    const hit = firstHit({ data: [{ id: 7, title: 'Nameless' }] });
    expect(hit).toEqual({
      deezerTrackId: '7',
      title: 'Nameless',
      artist: '',
      album: null,
      deezerAlbumId: null,
      durationSeconds: null,
      durationLabel: null,
      titleVersion: null,
      isrcs: [],
      popularity: 0,
      isExplicit: false,
    });
  });

  it('treats a zero duration as no duration, because no track lasts nothing', () => {
    const hit = firstHit({ data: [{ id: 1, title: 'Silent', duration: 0 }] });
    expect(hit?.durationSeconds).toBeNull();
    expect(hit?.durationLabel).toBeNull();
  });

  it('pads the seconds of a duration label under ten', () => {
    expect(firstHit({ data: [{ id: 1, title: 'Short', duration: 125 }] })?.durationLabel).toBe(
      '2:05',
    );
  });

  it('carries the explicit marker through', () => {
    expect(firstHit({ data: [{ id: 1, title: 'Loud', explicit_lyrics: true }] })?.isExplicit).toBe(
      true,
    );
  });

  it('treats an empty ISRC as none, so the list stays honest', () => {
    expect(firstHit({ data: [{ id: 1, title: 'Unreleased', isrc: '' }] })?.isrcs).toEqual([]);
  });
});

function entry(expiresAt: number): ExternalSearchCacheEntry {
  return { value: [], expiresAt };
}

describe('expiredSearchCacheKeys', () => {
  it('names the keys whose lifetime has run out, and only those', () => {
    const cache = new Map([
      ['fresh', entry(10)],
      ['exactly-now', entry(5)],
      ['stale', entry(1)],
    ]);
    expect(expiredSearchCacheKeys(cache, 5)).toEqual(['exactly-now', 'stale']);
  });

  it('names nothing when every entry is still fresh', () => {
    expect(expiredSearchCacheKeys(new Map([['fresh', entry(10)]]), 0)).toEqual([]);
  });
});

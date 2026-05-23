/**
 * 100%-coverage gate for the MusicBrainz response mapper. The live API
 * is never hit — the test feeds the committed fixture (and a handful
 * of malformed shapes) into the pure mapper.
 */

import { describe, expect, it } from 'vitest';
import FIXTURE from './__fixtures__/musicbrainz-sample.json';
import { mapMusicBrainzRecordings } from './musicbrainz.core';

describe('mapMusicBrainzRecordings', () => {
  it('projects every recording onto the ExternalSongHit shape', () => {
    const hits = mapMusicBrainzRecordings(FIXTURE);
    expect(hits).toHaveLength(3);
    expect(hits[0]).toEqual({
      mbid: 'fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01',
      title: 'Get Lucky',
      artist: 'Daft Punk feat. Pharrell Williams',
      year: 2013,
    });
    expect(hits[1]).toEqual({
      mbid: '11111111-2222-3333-4444-555555555555',
      title: 'Happy',
      artist: 'Pharrell Williams',
      year: 2013,
    });
  });

  it('returns null for a recording missing first-release-date', () => {
    const hits = mapMusicBrainzRecordings(FIXTURE);
    expect(hits[2]?.year).toBe(null);
  });

  it('skips recordings that have no title', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'no-title', 'artist-credit': [] }],
    });
    expect(hits).toHaveLength(0);
  });

  it('returns an empty list when the payload shape is wrong', () => {
    expect(mapMusicBrainzRecordings({ unexpected: true })).toEqual([]);
    expect(mapMusicBrainzRecordings(null)).toEqual([]);
    expect(mapMusicBrainzRecordings('not-an-object')).toEqual([]);
  });

  it('returns an empty list when the recordings array is missing', () => {
    expect(mapMusicBrainzRecordings({})).toEqual([]);
  });

  it('falls back to artist.name when the top-level name is absent', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [
        {
          id: 'x',
          title: 'T',
          'artist-credit': [{ artist: { name: 'Inner Name' } }],
        },
      ],
    });
    expect(hits[0]?.artist).toBe('Inner Name');
  });

  it('returns an empty artist when artist-credit is missing or empty', () => {
    const fromMissing = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T' }],
    });
    expect(fromMissing[0]?.artist).toBe('');
    const fromEmpty = mapMusicBrainzRecordings({
      recordings: [{ id: 'y', title: 'U', 'artist-credit': [] }],
    });
    expect(fromEmpty[0]?.artist).toBe('');
  });

  it('returns null when first-release-date does not start with four digits', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T', 'first-release-date': 'unknown' }],
    });
    expect(hits[0]?.year).toBe(null);
  });
});

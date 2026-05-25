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
      album: 'Random Access Memories',
      releaseId: 'release-rad-001',
      durationSeconds: 369,
      durationLabel: '6:09',
      disambiguation: 'radio edit',
      tags: ['electronic', 'disco', 'funk', 'house', 'dance'],
      isrcs: ['USQX91300108', 'GBUM71302999', 'USQX91300109'],
      tonality: null,
      bpm: null,
    });
    expect(hits[1]).toEqual({
      mbid: '11111111-2222-3333-4444-555555555555',
      title: 'Happy',
      artist: 'Pharrell Williams',
      year: 2013,
      album: 'G I R L',
      releaseId: 'release-girl-001',
      durationSeconds: 232,
      durationLabel: '3:52',
      disambiguation: null,
      tags: [],
      isrcs: ['USQ4E1300686'],
      tonality: null,
      bpm: null,
    });
  });

  it('returns null for a recording missing first-release-date', () => {
    const hits = mapMusicBrainzRecordings(FIXTURE);
    expect(hits[2]?.year).toBe(null);
  });

  it('returns null duration when length is null or absent', () => {
    const hits = mapMusicBrainzRecordings(FIXTURE);
    expect(hits[2]?.durationSeconds).toBe(null);
    expect(hits[2]?.durationLabel).toBe(null);
  });

  it('returns null album / release when releases is missing or empty', () => {
    const hits = mapMusicBrainzRecordings(FIXTURE);
    expect(hits[2]?.album).toBe(null);
    expect(hits[2]?.releaseId).toBe(null);
  });

  it('uses null when the first release entry carries no title', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T', releases: [{ id: 'release-x' }] }],
    });
    expect(hits[0]?.album).toBe(null);
    expect(hits[0]?.releaseId).toBe('release-x');
  });

  it('pads single-digit seconds in the duration label', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T', length: 65_000 }],
    });
    expect(hits[0]?.durationLabel).toBe('1:05');
  });

  it('formats sub-minute durations as 0:SS', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T', length: 12_000 }],
    });
    expect(hits[0]?.durationLabel).toBe('0:12');
  });

  it('caps tags at five entries, sorted desc by count, with count below 1 dropped', () => {
    const hits = mapMusicBrainzRecordings(FIXTURE);
    expect(hits[0]?.tags).toEqual(['electronic', 'disco', 'funk', 'house', 'dance']);
  });

  it('returns an empty tag list when tags is absent', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T' }],
    });
    expect(hits[0]?.tags).toEqual([]);
  });

  it('treats a missing tag count as zero (drops it from the top list)', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [
        {
          id: 'x',
          title: 'T',
          tags: [
            { name: 'kept', count: 2 },
            { name: 'dropped' },
          ],
        },
      ],
    });
    expect(hits[0]?.tags).toEqual(['kept']);
  });

  it('caps isrcs at three entries, preserving order', () => {
    const hits = mapMusicBrainzRecordings(FIXTURE);
    expect(hits[0]?.isrcs).toEqual(['USQX91300108', 'GBUM71302999', 'USQX91300109']);
  });

  it('returns an empty isrc list when isrcs is absent', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T' }],
    });
    expect(hits[0]?.isrcs).toEqual([]);
  });

  it('returns null disambiguation for an empty string', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T', disambiguation: '' }],
    });
    expect(hits[0]?.disambiguation).toBe(null);
  });

  it('returns null disambiguation when the field is absent', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [{ id: 'x', title: 'T' }],
    });
    expect(hits[0]?.disambiguation).toBe(null);
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

  it('falls back to an empty artist when neither top-level name nor inner artist.name is present', () => {
    const hits = mapMusicBrainzRecordings({
      recordings: [
        {
          id: 'x',
          title: 'T',
          'artist-credit': [{ artist: {} }],
        },
      ],
    });
    expect(hits[0]?.artist).toBe('');
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

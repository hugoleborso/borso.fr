import { describe, expect, it } from 'vitest';
import { buildSongIdentity, findCatalogueMatch } from './song-identity.core';

const WONDERWALL_TRACK_ID = '985745702';

const CATALOGUE = [
  { id: 'song-1', deezerTrackId: WONDERWALL_TRACK_ID, title: 'Wonderwall', artist: 'Oasis' },
  { id: 'song-2', deezerTrackId: null, title: 'Éléphant', artist: 'Têtes Raides' },
];

// @FollowsBlueprint test-pure-unit
describe('buildSongIdentity', () => {
  it('folds case, accents and punctuation, because two hands wrote the two sides', () => {
    expect(buildSongIdentity('Éléphant!', 'Têtes Raides')).toBe(
      buildSongIdentity('elephant', 'tetes  raides'),
    );
  });

  it('folds down rather than up, so the key one side wrote is the key the other reads', () => {
    expect(buildSongIdentity('Wonderwall', 'Oasis')).toBe('wonderwall oasis');
  });

  it('keeps the artist in the identity, so two songs sharing a title stay apart', () => {
    expect(buildSongIdentity('Wonderwall', 'Oasis')).not.toBe(
      buildSongIdentity('Wonderwall', 'Ryan Adams'),
    );
  });

  it('keeps the title in the identity, so one artist can have two songs', () => {
    expect(buildSongIdentity('Wonderwall', 'Oasis')).not.toBe(
      buildSongIdentity('Live Forever', 'Oasis'),
    );
  });
});

describe('findCatalogueMatch', () => {
  it('matches on the track id when the candidate carries one', () => {
    const match = findCatalogueMatch(CATALOGUE, {
      deezerTrackId: WONDERWALL_TRACK_ID,
      title: 'Something Else Entirely',
      artist: 'Nobody',
    });
    expect(match?.id).toBe('song-1');
  });

  it('answers nothing for a different track id, whatever the names say', () => {
    const match = findCatalogueMatch(CATALOGUE, {
      deezerTrackId: 'a-cover-with-its-own-id',
      title: 'Wonderwall',
      artist: 'Oasis',
    });
    expect(match).toBe(null);
  });

  it('falls back to the folded names when the candidate carries no track id', () => {
    const match = findCatalogueMatch(CATALOGUE, {
      deezerTrackId: null,
      title: 'elephant',
      artist: 'Tetes Raides',
    });
    expect(match?.id).toBe('song-2');
  });

  it('answers nothing when the folded names match nothing either', () => {
    expect(
      findCatalogueMatch(CATALOGUE, {
        deezerTrackId: null,
        title: 'Iron Kite',
        artist: 'Nobody',
      }),
    ).toBe(null);
  });

  it('answers nothing in an empty catalogue', () => {
    expect(
      findCatalogueMatch([], { deezerTrackId: null, title: 'Wonderwall', artist: 'Oasis' }),
    ).toBe(null);
  });
});

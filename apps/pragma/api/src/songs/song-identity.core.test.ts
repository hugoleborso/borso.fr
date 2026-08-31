import { describe, expect, it } from 'vitest';
import { buildSongIdentity, findCatalogueMatch } from './song-identity.core';

const WONDERWALL_MBID = '580f4553-e29a-4d19-989c-1b097b76de48';

const CATALOGUE = [
  { id: 'song-1', mbid: WONDERWALL_MBID, title: 'Wonderwall', artist: 'Oasis' },
  { id: 'song-2', mbid: null, title: 'Éléphant', artist: 'Têtes Raides' },
];

// @FollowsBlueprint test-pure-unit
describe('buildSongIdentity', () => {
  it('folds case, accents and punctuation, because two providers agree on none of them', () => {
    expect(buildSongIdentity('Éléphant!', 'Têtes Raides')).toBe(
      buildSongIdentity('elephant', 'tetes  raides'),
    );
  });

  it('folds down rather than up, so the key one provider wrote is the key the other reads', () => {
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
  it('matches on the identifier when the candidate carries one', () => {
    const match = findCatalogueMatch(CATALOGUE, {
      mbid: WONDERWALL_MBID,
      title: 'Something Else Entirely',
      artist: 'Nobody',
    });
    expect(match?.id).toBe('song-1');
  });

  it('answers nothing for a different identifier, whatever the names say', () => {
    const match = findCatalogueMatch(CATALOGUE, {
      mbid: 'a-cover-with-its-own-identifier',
      title: 'Wonderwall',
      artist: 'Oasis',
    });
    expect(match).toBe(null);
  });

  it('falls back to the folded names when no identifier resolved', () => {
    const match = findCatalogueMatch(CATALOGUE, {
      mbid: null,
      title: 'elephant',
      artist: 'Tetes Raides',
    });
    expect(match?.id).toBe('song-2');
  });

  it('answers nothing when the folded names match nothing either', () => {
    expect(
      findCatalogueMatch(CATALOGUE, { mbid: null, title: 'Iron Kite', artist: 'Nobody' }),
    ).toBe(null);
  });

  it('answers nothing in an empty catalogue', () => {
    expect(findCatalogueMatch([], { mbid: null, title: 'Wonderwall', artist: 'Oasis' })).toBe(null);
  });
});

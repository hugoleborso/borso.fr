import { describe, expect, it } from 'vitest';
import FIXTURE from './__fixtures__/deezer-valerie.json';
import { type ExternalSongHit, mapDeezerTracks } from './deezer.core';
import {
  coverSearchText,
  hasCoverMarker,
  overlapWithQuery,
  popularityScore,
  rankExternalHits,
  scoreExternalHit,
  unaskedTitleWords,
  wordsOf,
} from './search-ranking.core';

function hit(overrides: Partial<ExternalSongHit> = {}): ExternalSongHit {
  return {
    deezerTrackId: 'track-a',
    title: 'Beggin',
    artist: 'Maneskin',
    album: null,
    deezerAlbumId: null,
    durationSeconds: null,
    durationLabel: null,
    titleVersion: null,
    isrcs: [],
    popularity: 0,
    isExplicit: false,
    ...overrides,
  };
}

const SCORE_FROM_TITLE_PENALTY_ALONE = -7;

// @FollowsBlueprint test-pure-unit
describe('wordsOf', () => {
  it('splits on punctuation and folds accents away', () => {
    expect(wordsOf("Beggin' - Måneskin (Drum Cover)")).toEqual([
      'beggin',
      'maneskin',
      'drum',
      'cover',
    ]);
  });

  it('returns no word for punctuation only', () => {
    expect(wordsOf('!!! ---')).toEqual([]);
  });
});

describe('overlapWithQuery', () => {
  it('counts the words the query also names', () => {
    expect(overlapWithQuery('Sultans of Swing', 'sultans of swing dire straits')).toBe(3);
  });

  it('counts a repeated word once', () => {
    expect(overlapWithQuery('Gimme Gimme Gimme', 'gimme')).toBe(1);
  });

  it('counts nothing when no word is shared', () => {
    expect(overlapWithQuery('Uprising', 'valerie')).toBe(0);
  });
});

describe('unaskedTitleWords', () => {
  it('counts the title words the query never asked for', () => {
    expect(
      unaskedTitleWords('Backstreet Uprising (Muse vs Backstreet Boys)', 'uprising muse'),
    ).toBe(3);
  });

  it('counts none when the query names every title word', () => {
    expect(unaskedTitleWords('Uprising', 'uprising muse')).toBe(0);
  });
});

describe('coverSearchText', () => {
  it('joins the title, the album and the title version in lower case', () => {
    expect(
      coverSearchText(hit({ title: 'Beggin', album: 'Il Ballo', titleVersion: 'Radio' })),
    ).toBe('beggin il ballo radio');
  });

  it('substitutes nothing for a null album and a null title version', () => {
    expect(coverSearchText(hit({ title: 'Beggin', album: null, titleVersion: null }))).toBe(
      'beggin  ',
    );
  });
});

describe('hasCoverMarker', () => {
  it('spots a marker in the title', () => {
    expect(hasCoverMarker(hit({ title: "Beggin' (Drum Cover)" }))).toBe(true);
  });

  it('spots a marker in the album', () => {
    expect(hasCoverMarker(hit({ album: 'Karaoke Hits Vol. 3' }))).toBe(true);
  });

  it('spots a marker in the title version', () => {
    expect(hasCoverMarker(hit({ titleVersion: 'live at Wembley' }))).toBe(true);
  });

  it('spots a mashup', () => {
    expect(hasCoverMarker(hit({ title: 'Backstreet Uprising (Muse vs. Backstreet Boys)' }))).toBe(
      true,
    );
  });

  it('leaves a plain studio recording unmarked', () => {
    expect(hasCoverMarker(hit({ title: 'Beggin', album: 'Il ballo della vita' }))).toBe(false);
  });
});

describe('scoreExternalHit', () => {
  it('penalises a title the query never asked for', () => {
    expect(scoreExternalHit(hit(), 'zzz')).toBe(SCORE_FROM_TITLE_PENALTY_ALONE);
  });

  it('rewards popularity, flattened so it cannot drown a word match', () => {
    expect(scoreExternalHit(hit({ popularity: 100_000 }), 'zzz')).toBe(
      SCORE_FROM_TITLE_PENALTY_ALONE + 20,
    );
    expect(scoreExternalHit(hit({ popularity: 1_000_000 }), 'zzz')).toBe(
      SCORE_FROM_TITLE_PENALTY_ALONE + 24,
    );
  });

  it('rewards carrying an album', () => {
    expect(scoreExternalHit(hit({ album: 'Il ballo della vita' }), 'zzz')).toBe(
      SCORE_FROM_TITLE_PENALTY_ALONE + 5,
    );
  });

  it('rewards a title word the query names', () => {
    expect(scoreExternalHit(hit({ title: 'Beggin' }), 'beggin')).toBe(10);
  });

  it('rewards an artist word the query names, more than a title word', () => {
    expect(scoreExternalHit(hit({ artist: 'Maneskin' }), 'maneskin')).toBe(
      SCORE_FROM_TITLE_PENALTY_ALONE + 14,
    );
  });

  it('penalises a recording that announces itself as a cover', () => {
    expect(scoreExternalHit(hit({ title: 'Beggin Karaoke' }), 'beggin')).toBe(10 - 7 - 40);
  });

  it('adds every part together', () => {
    const scored = scoreExternalHit(
      hit({
        title: 'Uprising',
        artist: 'Muse',
        popularity: 10_000,
        album: 'The Resistance',
      }),
      'uprising muse',
    );
    expect(scored).toBe(16 + 10 + 14 + 5);
  });
});

describe('popularityScore', () => {
  it('scores an unranked track at nothing', () => {
    expect(popularityScore(0)).toBe(0);
  });

  it('scores a negative rank at nothing rather than a penalty', () => {
    expect(popularityScore(-1)).toBe(0);
  });

  it('grows by a fixed step per order of magnitude', () => {
    expect(popularityScore(10)).toBe(4);
    expect(popularityScore(100)).toBe(8);
  });
});

describe('rankExternalHits', () => {
  it('puts the well released original above a drum cover', () => {
    const cover = hit({
      deezerTrackId: 'cover',
      title: 'Beggin - Maneskin (Drum Cover)',
      artist: 'El Estepario Siberiano',
    });
    const original = hit({
      deezerTrackId: 'original',
      title: 'Beggin',
      artist: 'Maneskin',
      album: 'Il ballo della vita',
      popularity: 900_000,
    });
    const ranked = rankExternalHits([cover, original], 'Beggin Maneskin');
    expect(ranked.map((entry) => entry.deezerTrackId)).toEqual(['original', 'cover']);
  });

  it('breaks a tie on the identifier so the order is stable', () => {
    const ranked = rankExternalHits(
      [hit({ deezerTrackId: 'b' }), hit({ deezerTrackId: 'a' })],
      'zzz',
    );
    expect(ranked.map((entry) => entry.deezerTrackId)).toEqual(['a', 'b']);
  });

  it('leaves the caller list untouched', () => {
    const input = [hit({ deezerTrackId: 'b' }), hit({ deezerTrackId: 'a' })];
    rankExternalHits(input, 'zzz');
    expect(input.map((entry) => entry.deezerTrackId)).toEqual(['b', 'a']);
  });

  it('returns an empty list unchanged', () => {
    expect(rankExternalHits([], 'zzz')).toEqual([]);
  });
});

describe('rankExternalHits, against a captured Deezer response', () => {
  const QUERY = 'Valerie Amy Winehouse';

  it('is handed a response that mixes the original with tributes and a television cast', () => {
    const artists = mapDeezerTracks(FIXTURE).map((entry) => entry.artist);
    expect(artists).toContain('Mark Ronson');
    expect(artists).toContain('Glee Cast');
  });

  it('keeps the studio original first, which is credited to Mark Ronson', () => {
    const ranked = rankExternalHits(mapDeezerTracks(FIXTURE), QUERY);
    expect(ranked[0]?.artist).toBe('Mark Ronson');
    expect(ranked[0]?.title).toBe('Valerie (feat. Amy Winehouse)');
  });

  it('keeps the television cover out of the first three, popular though it is', () => {
    const ranked = rankExternalHits(mapDeezerTracks(FIXTURE), QUERY);
    const gleePosition = ranked.findIndex((entry) => entry.artist === 'Glee Cast');
    expect(gleePosition).toBeGreaterThan(2);
  });

  it('demotes the live takes, which announce themselves in their title version', () => {
    const ranked = rankExternalHits(mapDeezerTracks(FIXTURE), QUERY);
    const firstLive = ranked.findIndex((entry) => entry.titleVersion?.includes('Live') === true);
    expect(firstLive).toBeGreaterThan(0);
  });
});

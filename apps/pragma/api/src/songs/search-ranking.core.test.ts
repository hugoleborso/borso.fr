import { describe, expect, it } from 'vitest';
import type { ExternalSongHit } from './musicbrainz.core';
import {
  coverSearchText,
  hasCoverMarker,
  overlapWithQuery,
  rankExternalHits,
  scoreExternalHit,
  unaskedTitleWords,
  wordsOf,
} from './search-ranking.core';

function hit(overrides: Partial<ExternalSongHit> = {}): ExternalSongHit {
  return {
    mbid: 'mbid-a',
    title: 'Beggin',
    artist: 'Maneskin',
    year: 2017,
    album: null,
    releaseId: null,
    durationSeconds: null,
    durationLabel: null,
    disambiguation: null,
    tags: [],
    isrcs: [],
    releaseCount: 0,
    isrcCount: 0,
    ...overrides,
  };
}

/** Nothing in the default hit matches, so only the unasked-title penalty applies. */
const BASELINE = -7;

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
  it('joins the title, the album and the disambiguation in lower case', () => {
    expect(
      coverSearchText(hit({ title: 'Beggin', album: 'Il Ballo', disambiguation: 'Radio' })),
    ).toBe('beggin il ballo radio');
  });

  it('substitutes nothing for a null album and a null disambiguation', () => {
    expect(coverSearchText(hit({ title: 'Beggin', album: null, disambiguation: null }))).toBe(
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

  it('spots a marker in the disambiguation', () => {
    expect(hasCoverMarker(hit({ disambiguation: 'live at Wembley' }))).toBe(true);
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
    expect(scoreExternalHit(hit(), 'zzz')).toBe(BASELINE);
  });

  it('rewards each release', () => {
    expect(scoreExternalHit(hit({ releaseCount: 2 }), 'zzz')).toBe(BASELINE + 6);
  });

  it('caps the release reward so a compilation flood cannot dominate', () => {
    expect(scoreExternalHit(hit({ releaseCount: 20 }), 'zzz')).toBe(BASELINE + 60);
    expect(scoreExternalHit(hit({ releaseCount: 999 }), 'zzz')).toBe(BASELINE + 60);
  });

  it('rewards each ISRC', () => {
    expect(scoreExternalHit(hit({ isrcCount: 3 }), 'zzz')).toBe(BASELINE + 12);
  });

  it('rewards each tag', () => {
    expect(scoreExternalHit(hit({ tags: ['rock', 'pop'] }), 'zzz')).toBe(BASELINE + 4);
  });

  it('rewards carrying an album', () => {
    expect(scoreExternalHit(hit({ album: 'Il ballo della vita' }), 'zzz')).toBe(BASELINE + 5);
  });

  it('rewards a title word the query names', () => {
    expect(scoreExternalHit(hit({ title: 'Beggin' }), 'beggin')).toBe(10);
  });

  it('rewards an artist word the query names, more than a title word', () => {
    expect(scoreExternalHit(hit({ artist: 'Maneskin' }), 'maneskin')).toBe(BASELINE + 14);
  });

  it('penalises a recording that announces itself as a cover', () => {
    expect(scoreExternalHit(hit({ title: 'Beggin Karaoke' }), 'beggin')).toBe(10 - 7 - 40);
  });

  it('adds every part together', () => {
    const scored = scoreExternalHit(
      hit({
        title: 'Uprising',
        artist: 'Muse',
        releaseCount: 2,
        isrcCount: 1,
        tags: ['rock'],
        album: 'The Resistance',
      }),
      'uprising muse',
    );
    expect(scored).toBe(6 + 4 + 2 + 10 + 14 + 5);
  });
});

describe('rankExternalHits', () => {
  it('puts the well released original above a drum cover', () => {
    const cover = hit({
      mbid: 'cover',
      title: 'Beggin - Maneskin (Drum Cover)',
      artist: 'El Estepario Siberiano',
    });
    const original = hit({
      mbid: 'original',
      title: 'Beggin',
      artist: 'Maneskin',
      album: 'Il ballo della vita',
      releaseCount: 22,
      isrcCount: 1,
      tags: ['rock'],
    });
    const ranked = rankExternalHits([cover, original], 'Beggin Maneskin');
    expect(ranked.map((entry) => entry.mbid)).toEqual(['original', 'cover']);
  });

  it('breaks a tie on the identifier so the order is stable', () => {
    const ranked = rankExternalHits([hit({ mbid: 'b' }), hit({ mbid: 'a' })], 'zzz');
    expect(ranked.map((entry) => entry.mbid)).toEqual(['a', 'b']);
  });

  it('leaves the caller list untouched', () => {
    const input = [hit({ mbid: 'b' }), hit({ mbid: 'a' })];
    rankExternalHits(input, 'zzz');
    expect(input.map((entry) => entry.mbid)).toEqual(['b', 'a']);
  });

  it('returns an empty list unchanged', () => {
    expect(rankExternalHits([], 'zzz')).toEqual([]);
  });
});

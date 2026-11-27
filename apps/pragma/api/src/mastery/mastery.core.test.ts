import { describe, expect, it } from 'vitest';
import {
  type DefaultMap,
  effective,
  indexDefaultScores,
  indexOverrideScores,
  type OverrideMap,
} from './mastery.core';

const DEFAULTS: DefaultMap = {
  hugo: { guitar: 8, piano: 5 },
  gui: { drums: 9 },
};

const OVERRIDES: OverrideMap = {
  songA: {
    hugo: { guitar: 6 },
  },
  songB: {
    hugo: { piano: 0 },
  },
};

// @FollowsBlueprint test-pure-unit
describe('mastery.core', () => {
  describe('effective', () => {
    it('returns the override when present', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, {
          memberId: 'hugo',
          instrumentId: 'guitar',
          songId: 'songA',
        }),
      ).toBe(6);
    });

    it('falls back to the default when no override exists', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, {
          memberId: 'hugo',
          instrumentId: 'guitar',
          songId: 'songB',
        }),
      ).toBe(8);
    });

    it('treats override=0 as a real value (not falsy)', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, {
          memberId: 'hugo',
          instrumentId: 'piano',
          songId: 'songB',
        }),
      ).toBe(0);
    });

    it('returns null when neither override nor default exist', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, {
          memberId: 'gui',
          instrumentId: 'guitar',
          songId: 'songA',
        }),
      ).toBeNull();
    });

    it('returns null when the song has no overrides at all', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, {
          memberId: 'unknown',
          instrumentId: 'guitar',
          songId: 'songZ',
        }),
      ).toBeNull();
    });
  });

  describe('indexDefaultScores', () => {
    it('indexes rows by member then instrument', () => {
      expect(
        indexDefaultScores([
          { memberId: 'hugo', instrumentId: 'guitar', score: 8 },
          { memberId: 'hugo', instrumentId: 'piano', score: 5 },
          { memberId: 'gui', instrumentId: 'drums', score: 9 },
        ]),
      ).toEqual(DEFAULTS);
    });
  });

  describe('indexOverrideScores', () => {
    it('indexes rows by song, member then instrument', () => {
      expect(
        indexOverrideScores([
          { songId: 'songA', memberId: 'hugo', instrumentId: 'guitar', score: 6 },
          { songId: 'songA', memberId: 'hugo', instrumentId: 'piano', score: 1 },
          { songId: 'songB', memberId: 'hugo', instrumentId: 'piano', score: 0 },
        ]),
      ).toEqual({ songA: { hugo: { guitar: 6, piano: 1 } }, songB: { hugo: { piano: 0 } } });
    });
  });
});

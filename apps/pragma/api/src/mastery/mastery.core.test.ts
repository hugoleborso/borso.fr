import { describe, expect, it } from 'vitest';
import {
  type DefaultMap,
  effective,
  indexDefaultScores,
  indexOverrideScores,
  isRedundantOverride,
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

  describe('isRedundantOverride', () => {
    it('returns false when no override exists for the triple', () => {
      expect(
        isRedundantOverride(DEFAULTS, OVERRIDES, {
          memberId: 'hugo',
          instrumentId: 'guitar',
          songId: 'songZ',
        }),
      ).toBe(false);
    });

    it('returns false when the song carries overrides for other members and no default exists', () => {
      expect(
        isRedundantOverride(DEFAULTS, OVERRIDES, {
          memberId: 'gui',
          instrumentId: 'guitar',
          songId: 'songA',
        }),
      ).toBe(false);
    });

    it('returns false when override and default differ', () => {
      expect(
        isRedundantOverride(DEFAULTS, OVERRIDES, {
          memberId: 'hugo',
          instrumentId: 'guitar',
          songId: 'songA',
        }),
      ).toBe(false);
    });

    it('returns false when there is an override but no matching default', () => {
      const localDefaults: DefaultMap = {};
      const localOverrides: OverrideMap = { songA: { hugo: { guitar: 4 } } };
      expect(
        isRedundantOverride(localDefaults, localOverrides, {
          memberId: 'hugo',
          instrumentId: 'guitar',
          songId: 'songA',
        }),
      ).toBe(false);
    });

    it('returns true when override and default carry the same score', () => {
      const localDefaults: DefaultMap = { hugo: { guitar: 5 } };
      const localOverrides: OverrideMap = { songA: { hugo: { guitar: 5 } } };
      expect(
        isRedundantOverride(localDefaults, localOverrides, {
          memberId: 'hugo',
          instrumentId: 'guitar',
          songId: 'songA',
        }),
      ).toBe(true);
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

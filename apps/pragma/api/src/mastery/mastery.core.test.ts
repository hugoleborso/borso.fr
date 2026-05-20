import { describe, expect, it } from 'vitest';
import {
  type DefaultMap,
  type OverrideMap,
  effective,
  isRedundantOverride,
  meanForSong,
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

describe('mastery.core', () => {
  describe('effective', () => {
    it('returns the override when present', () => {
      expect(effective(DEFAULTS, OVERRIDES, { memberId: 'hugo', instrumentId: 'guitar', songId: 'songA' })).toBe(6);
    });

    it('falls back to the default when no override exists', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, { memberId: 'hugo', instrumentId: 'guitar', songId: 'songB' }),
      ).toBe(8);
    });

    it('treats override=0 as a real value (not falsy)', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, { memberId: 'hugo', instrumentId: 'piano', songId: 'songB' }),
      ).toBe(0);
    });

    it('returns null when neither override nor default exist', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, { memberId: 'gui', instrumentId: 'guitar', songId: 'songA' }),
      ).toBeNull();
    });

    it('returns null when the song has no overrides at all', () => {
      expect(
        effective(DEFAULTS, OVERRIDES, { memberId: 'unknown', instrumentId: 'guitar', songId: 'songZ' }),
      ).toBeNull();
    });
  });

  describe('meanForSong', () => {
    it('returns null when no member has a defined score', () => {
      expect(meanForSong(DEFAULTS, OVERRIDES, 'songA', { unknown: 'guitar' })).toBeNull();
    });

    it('averages the effective scores over the lineup', () => {
      // hugo on guitar in songA -> override = 6. gui on drums -> default = 9.
      const mean = meanForSong(DEFAULTS, OVERRIDES, 'songA', { hugo: 'guitar', gui: 'drums' });
      expect(mean).toBe(7.5);
    });

    it('skips members whose instrument is null', () => {
      const mean = meanForSong(DEFAULTS, OVERRIDES, 'songA', { hugo: 'guitar', gui: null });
      expect(mean).toBe(6);
    });

    it('skips members with no default and no override', () => {
      const mean = meanForSong(DEFAULTS, OVERRIDES, 'songA', { hugo: 'guitar', unknown: 'piano' });
      expect(mean).toBe(6);
    });

    it('includes the 0-score override (falsy trap)', () => {
      // hugo on piano in songB -> override = 0. gui on drums -> default = 9. mean = 4.5.
      const mean = meanForSong(DEFAULTS, OVERRIDES, 'songB', { hugo: 'piano', gui: 'drums' });
      expect(mean).toBe(4.5);
    });

    it('returns null for an empty lineup', () => {
      expect(meanForSong(DEFAULTS, OVERRIDES, 'songA', {})).toBeNull();
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
});

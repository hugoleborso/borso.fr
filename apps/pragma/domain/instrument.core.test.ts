import { describe, expect, it } from 'vitest';
import {
  familyFromHarmonicFlag,
  INSTRUMENT_FAMILIES,
  isInstrumentFamily,
  resolveInstrumentFamily,
} from './instrument.core';

// @FollowsBlueprint test-pure-unit
describe('familyFromHarmonicFlag', () => {
  it('reads a harmonic flag as the harmonic family', () => {
    expect(familyFromHarmonicFlag(true)).toBe('harmonic');
  });

  it('cannot tell percussive from vocal, so everything else lands on other', () => {
    expect(familyFromHarmonicFlag(false)).toBe('other');
  });
});

describe('isInstrumentFamily', () => {
  it('accepts every family the vocabulary declares', () => {
    for (const family of INSTRUMENT_FAMILIES) expect(isInstrumentFamily(family)).toBe(true);
  });

  it('rejects a value that is not one of them', () => {
    expect(isInstrumentFamily('brass')).toBe(false);
  });
});

describe('resolveInstrumentFamily', () => {
  it('prefers the stored family', () => {
    expect(resolveInstrumentFamily('vocal', true)).toBe('vocal');
  });

  it('falls back to the boolean when the column was never written', () => {
    expect(resolveInstrumentFamily(null, true)).toBe('harmonic');
  });

  it('falls back to the boolean when the column holds something unknown', () => {
    expect(resolveInstrumentFamily('brass', false)).toBe('other');
  });
});

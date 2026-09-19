import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INSTRUMENT_POSITION,
  decidePrimaryInstrumentIds,
  defaultPositionForFamily,
  FALLBACK_INSTRUMENT_ICON,
  familyFromHarmonicFlag,
  INSTRUMENT_FAMILIES,
  INSTRUMENT_ICONS,
  isInstrumentFamily,
  isInstrumentIcon,
  resolveInstrumentFamily,
  resolveInstrumentIcon,
  resolveInstrumentPosition,
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

describe('isInstrumentIcon', () => {
  it('accepts every icon the vocabulary declares', () => {
    for (const icon of INSTRUMENT_ICONS) expect(isInstrumentIcon(icon)).toBe(true);
  });

  it('rejects a value that is not one of them', () => {
    expect(isInstrumentIcon('bouzouki')).toBe(false);
    expect(isInstrumentIcon(null)).toBe(false);
  });
});

describe('resolveInstrumentIcon', () => {
  it('prefers the stored icon', () => {
    expect(resolveInstrumentIcon('bass')).toBe('bass');
  });

  it('falls back to the generic glyph when the column was never written', () => {
    expect(resolveInstrumentIcon(null)).toBe(FALLBACK_INSTRUMENT_ICON);
  });

  it('falls back to the generic glyph when the column holds a name nobody ships', () => {
    expect(resolveInstrumentIcon('bouzouki')).toBe(FALLBACK_INSTRUMENT_ICON);
  });
});

describe('resolveInstrumentPosition', () => {
  it('prefers the stored position, including the first one', () => {
    expect(resolveInstrumentPosition(4)).toBe(4);
    expect(resolveInstrumentPosition(0)).toBe(0);
  });

  it('falls back to the head of the order when the column was never written', () => {
    expect(resolveInstrumentPosition(null)).toBe(DEFAULT_INSTRUMENT_POSITION);
  });
});

describe('defaultPositionForFamily', () => {
  it('ranks the families the way the column reads, vocal first and other last', () => {
    expect(INSTRUMENT_FAMILIES.map(defaultPositionForFamily)).toEqual([1, 2, 0, 3]);
  });

  it('puts a new instrument where its family sits rather than at the head', () => {
    expect(defaultPositionForFamily('vocal')).toBeLessThan(defaultPositionForFamily('percussive'));
  });
});

describe('decidePrimaryInstrumentIds', () => {
  it('keeps the primacy the surviving links already carried when the payload says nothing', () => {
    expect(decidePrimaryInstrumentIds(['guitar', 'bass'], undefined, ['bass'])).toEqual(['bass']);
  });

  it('takes the requested set when the payload carries one, replacing what was there', () => {
    expect(decidePrimaryInstrumentIds(['guitar', 'bass'], ['guitar'], ['bass'])).toEqual([
      'guitar',
    ]);
  });

  it('reads an empty requested set as the band clearing every primacy', () => {
    expect(decidePrimaryInstrumentIds(['guitar', 'bass'], [], ['bass'])).toEqual([]);
  });

  it('drops a primacy on an instrument the member no longer plays', () => {
    expect(decidePrimaryInstrumentIds(['guitar'], undefined, ['bass'])).toEqual([]);
  });

  it('keeps the order of the instrument list, so two primaries settle the same way twice', () => {
    expect(decidePrimaryInstrumentIds(['guitar', 'bass'], ['bass', 'guitar'], [])).toEqual([
      'guitar',
      'bass',
    ]);
  });
});

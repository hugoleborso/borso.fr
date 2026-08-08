import { describe, expect, it } from 'vitest';
import {
  ALL_KEY,
  findLine,
  findOpening,
  findVariation,
  listLines,
  listVariations,
} from './selectors.utils';
import type { Line, Opening, Variation } from './types';

const line: Line = {
  id: 'main-line',
  name: 'Main Line',
  eco: 'C50',
  movesSan: ['e4'],
  movesUci: ['e2e4'],
};

const variation: Variation = {
  id: 'main',
  name: 'Main',
  lines: [line],
};

const opening: Opening = {
  id: 'italian-game',
  name: 'Italian Game',
  ecoCodes: ['C50'],
  variations: [variation],
};

/**
 * A dataset entry whose own id collides with the {@link ALL_KEY} sentinel. The
 * sentinel means "every entry at this level", so it must never resolve to this
 * decoy — which is what makes the sentinel check in each finder load-bearing
 * rather than a shortcut around a lookup that would miss anyway.
 */
const decoyLineNamedAll: Line = {
  id: ALL_KEY,
  name: 'Decoy',
  eco: 'C99',
  movesSan: [],
  movesUci: [],
};

const decoyVariationNamedAll: Variation = {
  id: ALL_KEY,
  name: 'Decoy',
  lines: [decoyLineNamedAll],
};

const decoyOpeningNamedAll: Opening = {
  id: ALL_KEY,
  name: 'Decoy',
  ecoCodes: [],
  variations: [decoyVariationNamedAll],
};

describe('findOpening', () => {
  it('returns undefined when id is missing', () => {
    expect(findOpening([opening], null)).toBeUndefined();
    expect(findOpening([opening], undefined)).toBeUndefined();
  });

  it('returns undefined for the ALL sentinel', () => {
    expect(findOpening([opening], ALL_KEY)).toBeUndefined();
  });

  it('does not resolve the ALL sentinel to an opening whose own id is "all"', () => {
    expect(findOpening([decoyOpeningNamedAll, opening], ALL_KEY)).toBeUndefined();
  });

  it('finds the opening by id', () => {
    expect(findOpening([opening], 'italian-game')).toBe(opening);
  });

  it('returns undefined when id does not match', () => {
    expect(findOpening([opening], 'sicilian')).toBeUndefined();
  });
});

describe('findVariation', () => {
  it('returns undefined when id is missing', () => {
    expect(findVariation(opening, null)).toBeUndefined();
    expect(findVariation(opening, undefined)).toBeUndefined();
  });

  it('returns undefined for the ALL sentinel', () => {
    expect(findVariation(opening, ALL_KEY)).toBeUndefined();
  });

  it('does not resolve the ALL sentinel to a variation whose own id is "all"', () => {
    expect(findVariation(decoyOpeningNamedAll, ALL_KEY)).toBeUndefined();
  });

  it('finds the variation by id', () => {
    expect(findVariation(opening, 'main')).toBe(variation);
  });

  it('returns undefined when id does not match', () => {
    expect(findVariation(opening, 'classical')).toBeUndefined();
  });
});

describe('findLine', () => {
  it('returns undefined when id is missing', () => {
    expect(findLine(variation, null)).toBeUndefined();
    expect(findLine(variation, undefined)).toBeUndefined();
  });

  it('returns undefined for the ALL sentinel', () => {
    expect(findLine(variation, ALL_KEY)).toBeUndefined();
  });

  it('does not resolve the ALL sentinel to a line whose own id is "all"', () => {
    expect(findLine(decoyVariationNamedAll, ALL_KEY)).toBeUndefined();
  });

  it('finds the line by id', () => {
    expect(findLine(variation, 'main-line')).toBe(line);
  });

  it('returns undefined when id does not match', () => {
    expect(findLine(variation, 'side-line')).toBeUndefined();
  });
});

describe('listVariations / listLines', () => {
  it('returns an empty array when missing', () => {
    expect(listVariations(undefined)).toEqual([]);
    expect(listLines(undefined)).toEqual([]);
  });

  it('returns the contained collection', () => {
    expect(listVariations(opening)).toEqual([variation]);
    expect(listLines(variation)).toEqual([line]);
  });
});

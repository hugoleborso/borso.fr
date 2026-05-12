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

describe('findOpening', () => {
  it('returns undefined when id is missing', () => {
    expect(findOpening([opening], null)).toBeUndefined();
    expect(findOpening([opening], undefined)).toBeUndefined();
  });

  it('returns undefined for the ALL sentinel', () => {
    expect(findOpening([opening], ALL_KEY)).toBeUndefined();
  });

  it('finds the opening by id', () => {
    expect(findOpening([opening], 'italian-game')).toBe(opening);
  });

  it('returns undefined when id does not match', () => {
    expect(findOpening([opening], 'sicilian')).toBeUndefined();
  });
});

describe('findVariation', () => {
  it('returns undefined when opening or id is missing', () => {
    expect(findVariation(undefined, 'main')).toBeUndefined();
    expect(findVariation(opening, null)).toBeUndefined();
    expect(findVariation(opening, undefined)).toBeUndefined();
  });

  it('returns undefined for the ALL sentinel', () => {
    expect(findVariation(opening, ALL_KEY)).toBeUndefined();
  });

  it('finds the variation by id', () => {
    expect(findVariation(opening, 'main')).toBe(variation);
  });

  it('returns undefined when id does not match', () => {
    expect(findVariation(opening, 'classical')).toBeUndefined();
  });
});

describe('findLine', () => {
  it('returns undefined when variation or id is missing', () => {
    expect(findLine(undefined, 'main-line')).toBeUndefined();
    expect(findLine(variation, null)).toBeUndefined();
    expect(findLine(variation, undefined)).toBeUndefined();
  });

  it('returns undefined for the ALL sentinel', () => {
    expect(findLine(variation, ALL_KEY)).toBeUndefined();
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

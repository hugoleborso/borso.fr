import { describe, expect, it } from 'vitest';
import {
  isVariationCleared,
  leafReachedAt,
  linesMatchingPrefix,
  nextMovesAt,
} from './bookTree.utils';
import type { Variation } from './types';

const ITALIAN_MAIN: Variation = {
  id: 'main',
  name: 'Main',
  lines: [
    {
      id: 'classical',
      name: 'Classical',
      eco: 'C50',
      movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
    },
    {
      id: 'two-knights',
      name: 'Two Knights',
      eco: 'C55',
      movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
      movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
    },
    {
      id: 'evans',
      name: 'Evans Gambit',
      eco: 'C51',
      movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'],
      movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'b2b4'],
    },
  ],
};

const EMPTY_VARIATION: Variation = { id: 'empty', name: 'Empty', lines: [] };

describe('linesMatchingPrefix', () => {
  it('returns every line for the empty prefix', () => {
    expect(linesMatchingPrefix(ITALIAN_MAIN, [])).toEqual(ITALIAN_MAIN.lines);
  });

  it('keeps lines that share the prefix and drops the rest', () => {
    const matching = linesMatchingPrefix(ITALIAN_MAIN, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4']);
    expect(matching.map((line) => line.id)).toEqual(['classical', 'evans']);
  });

  it('returns an empty array when the prefix diverges', () => {
    expect(linesMatchingPrefix(ITALIAN_MAIN, ['a2a3'])).toEqual([]);
  });

  it('returns an empty array on an empty variation', () => {
    expect(linesMatchingPrefix(EMPTY_VARIATION, [])).toEqual([]);
  });
});

describe('nextMovesAt', () => {
  it('returns the union of distinct next moves across matching lines', () => {
    expect(new Set(nextMovesAt(ITALIAN_MAIN, ['e2e4', 'e7e5', 'g1f3', 'b8c6']))).toEqual(
      new Set(['f1c4', 'f1b5']),
    );
  });

  it('returns an empty array when every matching line has ended', () => {
    expect(nextMovesAt(ITALIAN_MAIN, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'])).toEqual([]);
  });

  it('returns an empty array when no line matches', () => {
    expect(nextMovesAt(ITALIAN_MAIN, ['a2a3'])).toEqual([]);
  });
});

describe('leafReachedAt', () => {
  it('returns the line whose UCI sequence equals the played moves', () => {
    expect(
      leafReachedAt(ITALIAN_MAIN, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'])?.id,
    ).toBe('two-knights');
  });

  it('returns null when no line ends at this position', () => {
    expect(leafReachedAt(ITALIAN_MAIN, ['e2e4', 'e7e5', 'g1f3'])).toBeNull();
  });

  it('returns null when the played sequence diverges from every line', () => {
    expect(leafReachedAt(ITALIAN_MAIN, ['a2a3'])).toBeNull();
  });
});

describe('isVariationCleared', () => {
  it('returns false for an empty variation', () => {
    expect(isVariationCleared(EMPTY_VARIATION, new Set())).toBe(false);
  });

  it('returns false when at least one leaf is unvisited', () => {
    expect(isVariationCleared(ITALIAN_MAIN, new Set(['classical', 'two-knights']))).toBe(false);
  });

  it('returns true when every leaf has been visited', () => {
    expect(
      isVariationCleared(ITALIAN_MAIN, new Set(['classical', 'two-knights', 'evans'])),
    ).toBe(true);
  });
});

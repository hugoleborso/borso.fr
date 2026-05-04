import { describe, expect, it } from 'vitest';
import { computeBookState, gatherCandidates } from './bookEngine.utils';
import { ALL_KEY, type Selection } from './selectors.utils';
import type { Opening } from './types';

const italianMain: Opening = {
  id: 'italian-game',
  name: 'Italian Game',
  ecoCodes: ['C50'],
  variations: [
    {
      id: 'main',
      name: 'Main',
      lines: [
        {
          id: 'classical',
          name: 'Classical',
          eco: 'C50',
          movesSan: ['e4', 'e5', 'Nf3'],
          movesUci: ['e2e4', 'e7e5', 'g1f3'],
        },
        {
          id: 'two-knights',
          name: 'Two Knights',
          eco: 'C55',
          movesSan: ['e4', 'e5', 'Bc4'],
          movesUci: ['e2e4', 'e7e5', 'f1c4'],
        },
      ],
    },
    {
      id: 'side',
      name: 'Side',
      lines: [
        {
          id: 'evans',
          name: 'Evans Gambit',
          eco: 'C51',
          movesSan: ['e4', 'e5', 'b4'],
          movesUci: ['e2e4', 'e7e5', 'b2b4'],
        },
      ],
    },
  ],
};

const sicilian: Opening = {
  id: 'sicilian',
  name: 'Sicilian Defense',
  ecoCodes: ['B20'],
  variations: [
    {
      id: 'main',
      name: 'Main',
      lines: [
        {
          id: 'open',
          name: 'Open',
          eco: 'B20',
          movesSan: ['e4', 'c5'],
          movesUci: ['e2e4', 'c7c5'],
        },
      ],
    },
  ],
};

const allSelection: Selection = {
  openingId: ALL_KEY,
  variationId: ALL_KEY,
  lineId: ALL_KEY,
};

describe('gatherCandidates', () => {
  it('returns every line under ALL/ALL/ALL', () => {
    const candidates = gatherCandidates([italianMain, sicilian], allSelection);
    expect(candidates).toHaveLength(4);
  });

  it('filters by selection ids', () => {
    const selection: Selection = {
      openingId: 'italian-game',
      variationId: 'main',
      lineId: 'classical',
    };
    const candidates = gatherCandidates([italianMain, sicilian], selection);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.line.id).toBe('classical');
  });

  it('honours the play scope opening / variation / line filters', () => {
    const candidates = gatherCandidates([italianMain, sicilian], allSelection, {
      openingIds: ['italian-game'],
      variationIds: ['main'],
      lineIds: ['classical'],
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.line.id).toBe('classical');
  });

  it('returns nothing when play scope excludes every opening', () => {
    const candidates = gatherCandidates([italianMain, sicilian], allSelection, {
      openingIds: ['nonexistent'],
      variationIds: [],
    });
    expect(candidates).toEqual([]);
  });

  it('returns nothing when play scope variations exclude every entry', () => {
    expect(
      gatherCandidates([italianMain], allSelection, {
        openingIds: [],
        variationIds: ['nonexistent'],
      }),
    ).toEqual([]);
  });

  it('returns nothing when play scope lineIds exclude every entry', () => {
    expect(
      gatherCandidates([italianMain], allSelection, {
        openingIds: [],
        variationIds: [],
        lineIds: ['nonexistent'],
      }),
    ).toEqual([]);
  });

  it('skips openings that do not match the selection openingId', () => {
    expect(
      gatherCandidates([italianMain, sicilian], {
        openingId: 'sicilian',
        variationId: ALL_KEY,
        lineId: ALL_KEY,
      }),
    ).toHaveLength(1);
  });

  it('skips variations that do not match the selection variationId', () => {
    expect(
      gatherCandidates([italianMain], {
        openingId: 'italian-game',
        variationId: 'side',
        lineId: ALL_KEY,
      }),
    ).toHaveLength(1);
  });

  it('skips lines that do not match the selection lineId', () => {
    expect(
      gatherCandidates([italianMain], {
        openingId: 'italian-game',
        variationId: 'main',
        lineId: 'two-knights',
      }),
    ).toHaveLength(1);
  });
});

describe('computeBookState', () => {
  it('reports out-of-book when no candidate matches', () => {
    const state = computeBookState([italianMain], allSelection, ['a2a3']);
    expect(state.inBook).toBe(false);
    expect(state.candidates).toEqual([]);
    expect(state.possibleNextMovesUci).toEqual([]);
    expect(state.uniqueOpening).toBeUndefined();
    expect(state.uniqueVariation).toBeUndefined();
    expect(state.uniqueLine).toBeUndefined();
    expect(state.atLineEnd).toBe(false);
  });

  it('reports possible next moves when multiple lines match the prefix', () => {
    const state = computeBookState([italianMain], allSelection, ['e2e4', 'e7e5']);
    expect(state.inBook).toBe(true);
    expect(new Set(state.possibleNextMovesUci)).toEqual(new Set(['g1f3', 'f1c4', 'b2b4']));
    expect(state.uniqueOpening?.id).toBe('italian-game');
    expect(state.uniqueVariation).toBeUndefined();
    expect(state.uniqueLine).toBeUndefined();
    expect(state.atLineEnd).toBe(false);
  });

  it('detects unique line and atLineEnd when the played sequence equals the line', () => {
    const state = computeBookState([italianMain], allSelection, ['e2e4', 'e7e5', 'g1f3']);
    expect(state.uniqueOpening?.id).toBe('italian-game');
    expect(state.uniqueVariation?.id).toBe('main');
    expect(state.uniqueLine?.id).toBe('classical');
    expect(state.atLineEnd).toBe(true);
    expect(state.possibleNextMovesUci).toEqual([]);
  });

  it('does not over-claim atLineEnd when at least one matching line still has moves', () => {
    const longLine: Opening = {
      id: 'long',
      name: 'Long',
      ecoCodes: ['Z00'],
      variations: [
        {
          id: 'v',
          name: 'V',
          lines: [
            {
              id: 'a',
              name: 'A',
              eco: 'Z00',
              movesSan: ['e4'],
              movesUci: ['e2e4'],
            },
            {
              id: 'b',
              name: 'B',
              eco: 'Z00',
              movesSan: ['e4', 'c5'],
              movesUci: ['e2e4', 'c7c5'],
            },
          ],
        },
      ],
    };
    const state = computeBookState([longLine], allSelection, ['e2e4']);
    expect(state.inBook).toBe(true);
    expect(state.atLineEnd).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { findLearnDrillTarget, isLearnDrillReady, NO_DRILL_TARGET } from './learnSession.core';
import { ALL_KEY, type Selection } from './selectors.utils';
import type { Opening } from './types';

const OPENINGS: Opening[] = [
  {
    id: 'italian',
    name: 'Italian Game',
    ecoCodes: ['C50'],
    variations: [
      {
        id: 'classical',
        name: 'Classical Variation',
        lines: [{ id: 'greco', name: "Greco's Attack", eco: 'C54', movesSan: [], movesUci: [] }],
      },
    ],
  },
];

const NOTHING_SELECTED: Selection = {
  openingId: ALL_KEY,
  variationId: ALL_KEY,
  lineId: ALL_KEY,
};

describe('findLearnDrillTarget', () => {
  it('returns the placeholder when no opening is selected', () => {
    expect(findLearnDrillTarget(OPENINGS, NOTHING_SELECTED)).toBe(NO_DRILL_TARGET);
  });

  it('returns the placeholder when the opening is selected but the variation is not', () => {
    expect(
      findLearnDrillTarget(OPENINGS, {
        openingId: 'italian',
        variationId: ALL_KEY,
        lineId: ALL_KEY,
      }),
    ).toBe(NO_DRILL_TARGET);
  });

  it('returns the placeholder when the opening does not exist, whatever the variation names', () => {
    expect(
      findLearnDrillTarget(OPENINGS, {
        openingId: 'sicilian',
        variationId: 'classical',
        lineId: ALL_KEY,
      }),
    ).toBe(NO_DRILL_TARGET);
  });

  it('returns the placeholder when the variation does not exist', () => {
    expect(
      findLearnDrillTarget(OPENINGS, {
        openingId: 'italian',
        variationId: 'unknown',
        lineId: ALL_KEY,
      }),
    ).toBe(NO_DRILL_TARGET);
  });

  it('returns the opening and the variation once both are selected', () => {
    const target = findLearnDrillTarget(OPENINGS, {
      openingId: 'italian',
      variationId: 'classical',
      lineId: ALL_KEY,
    });
    expect(target.opening.id).toBe('italian');
    expect(target.variation.id).toBe('classical');
  });
});

describe('isLearnDrillReady', () => {
  it('rejects the placeholder target', () => {
    expect(isLearnDrillReady(NO_DRILL_TARGET)).toBe(false);
  });

  it('accepts a target naming a real variation', () => {
    const target = findLearnDrillTarget(OPENINGS, {
      openingId: 'italian',
      variationId: 'classical',
      lineId: ALL_KEY,
    });
    expect(isLearnDrillReady(target)).toBe(true);
  });
});

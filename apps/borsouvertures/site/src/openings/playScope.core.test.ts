import { describe, expect, it } from 'vitest';
import type { PlayScope } from '@/state/persistedState.utils';
import {
  buildLineSelection,
  buildOpeningSelection,
  buildVariationSelection,
  clearLinesFromPlayScope,
  clearOpeningsFromPlayScope,
  clearVariationsFromPlayScope,
  EMPTY_PLAY_SCOPE,
  FULL_SELECTION,
  isLineActive,
  isOpeningActive,
  isVariationActive,
  toggleLineInPlayScope,
  toggleOpeningInPlayScope,
  toggleVariationInPlayScope,
} from './playScope.core';
import { ALL_KEY, type Selection } from './selectors.utils';

const SCOPE: PlayScope = {
  openingIds: ['italian'],
  variationIds: ['classical'],
  lineIds: ['greco'],
};

describe('clearOpeningsFromPlayScope', () => {
  it('empties every level, because the children of no opening mean nothing', () => {
    expect(clearOpeningsFromPlayScope(SCOPE)).toEqual(EMPTY_PLAY_SCOPE);
  });
});

describe('clearVariationsFromPlayScope', () => {
  it('empties the variations and the lines below them', () => {
    expect(clearVariationsFromPlayScope(SCOPE)).toEqual({
      openingIds: ['italian'],
      variationIds: [],
      lineIds: [],
    });
  });
});

describe('clearLinesFromPlayScope', () => {
  it('empties only the lines', () => {
    expect(clearLinesFromPlayScope(SCOPE)).toEqual({
      openingIds: ['italian'],
      variationIds: ['classical'],
      lineIds: [],
    });
  });
});

describe('toggleOpeningInPlayScope', () => {
  it('adds an opening that is not in the scope', () => {
    expect(toggleOpeningInPlayScope(SCOPE, 'ruy-lopez').openingIds).toEqual([
      'italian',
      'ruy-lopez',
    ]);
  });

  it('removes an opening that is already in the scope', () => {
    expect(toggleOpeningInPlayScope(SCOPE, 'italian').openingIds).toEqual([]);
  });

  it('removes only the toggled opening and keeps its siblings', () => {
    const scope: PlayScope = {
      openingIds: ['italian', 'ruy-lopez', 'sicilian'],
      variationIds: [],
      lineIds: [],
    };
    expect(toggleOpeningInPlayScope(scope, 'ruy-lopez').openingIds).toEqual([
      'italian',
      'sicilian',
    ]);
  });
});

describe('toggleVariationInPlayScope', () => {
  it('adds the variation and its opening', () => {
    const next = toggleVariationInPlayScope(EMPTY_PLAY_SCOPE, 'italian', 'classical');
    expect(next).toEqual({
      openingIds: ['italian'],
      variationIds: ['classical'],
      lineIds: [],
    });
  });

  it('does not add the opening twice', () => {
    const next = toggleVariationInPlayScope(SCOPE, 'italian', 'two-knights');
    expect(next.openingIds).toEqual(['italian']);
    expect(next.variationIds).toEqual(['classical', 'two-knights']);
  });

  it('removes a variation that is already in the scope', () => {
    expect(toggleVariationInPlayScope(SCOPE, 'italian', 'classical').variationIds).toEqual([]);
  });
});

describe('toggleLineInPlayScope', () => {
  it('adds the line and both of its parents', () => {
    expect(
      toggleLineInPlayScope({
        scope: EMPTY_PLAY_SCOPE,
        openingId: 'italian',
        variationId: 'classical',
        lineId: 'greco',
      }),
    ).toEqual({
      openingIds: ['italian'],
      variationIds: ['classical'],
      lineIds: ['greco'],
    });
  });

  it('keeps parents it already has and removes a line it already has', () => {
    expect(
      toggleLineInPlayScope({
        scope: SCOPE,
        openingId: 'italian',
        variationId: 'classical',
        lineId: 'greco',
      }),
    ).toEqual({
      openingIds: ['italian'],
      variationIds: ['classical'],
      lineIds: [],
    });
  });
});

describe('buildOpeningSelection', () => {
  it('selects the opening and leaves the levels below it open', () => {
    expect(buildOpeningSelection('italian')).toEqual({
      openingId: 'italian',
      variationId: ALL_KEY,
      lineId: ALL_KEY,
    });
  });
});

describe('buildVariationSelection', () => {
  it('selects the opening and the variation', () => {
    expect(buildVariationSelection('italian', 'classical')).toEqual({
      openingId: 'italian',
      variationId: 'classical',
      lineId: ALL_KEY,
    });
  });
});

describe('buildLineSelection', () => {
  it('keeps the current parents and selects the line', () => {
    const selection: Selection = {
      openingId: 'italian',
      variationId: 'classical',
      lineId: ALL_KEY,
    };
    expect(buildLineSelection(selection, 'greco')).toEqual({
      openingId: 'italian',
      variationId: 'classical',
      lineId: 'greco',
    });
  });
});

// @FollowsBlueprint test-pure-unit
describe('isOpeningActive', () => {
  it('reads the play scope in play mode', () => {
    expect(
      isOpeningActive({
        mode: 'play',
        openingId: 'italian',
        selection: FULL_SELECTION,
        scope: SCOPE,
      }),
    ).toBe(true);
    expect(
      isOpeningActive({
        mode: 'play',
        openingId: 'ruy-lopez',
        selection: FULL_SELECTION,
        scope: SCOPE,
      }),
    ).toBe(false);
  });

  it('reads the selection in learn mode', () => {
    const selection = buildOpeningSelection('italian');
    expect(
      isOpeningActive({ mode: 'learn', openingId: 'italian', selection, scope: EMPTY_PLAY_SCOPE }),
    ).toBe(true);
    expect(
      isOpeningActive({
        mode: 'learn',
        openingId: 'ruy-lopez',
        selection,
        scope: EMPTY_PLAY_SCOPE,
      }),
    ).toBe(false);
  });
});

describe('isVariationActive', () => {
  it('reads the play scope in play mode', () => {
    expect(
      isVariationActive({
        mode: 'play',
        variationId: 'classical',
        selection: FULL_SELECTION,
        scope: SCOPE,
      }),
    ).toBe(true);
    expect(
      isVariationActive({
        mode: 'play',
        variationId: 'two-knights',
        selection: FULL_SELECTION,
        scope: SCOPE,
      }),
    ).toBe(false);
  });

  it('reads the selection in learn mode', () => {
    const selection = buildVariationSelection('italian', 'classical');
    expect(
      isVariationActive({
        mode: 'learn',
        variationId: 'classical',
        selection,
        scope: EMPTY_PLAY_SCOPE,
      }),
    ).toBe(true);
    expect(
      isVariationActive({
        mode: 'learn',
        variationId: 'two-knights',
        selection,
        scope: EMPTY_PLAY_SCOPE,
      }),
    ).toBe(false);
  });
});

describe('isLineActive', () => {
  it('reads the play scope in play mode', () => {
    expect(
      isLineActive({ mode: 'play', lineId: 'greco', selection: FULL_SELECTION, scope: SCOPE }),
    ).toBe(true);
    expect(
      isLineActive({ mode: 'play', lineId: 'other', selection: FULL_SELECTION, scope: SCOPE }),
    ).toBe(false);
  });

  it('reads the selection in learn mode', () => {
    const selection = buildLineSelection(FULL_SELECTION, 'greco');
    expect(
      isLineActive({ mode: 'learn', lineId: 'greco', selection, scope: EMPTY_PLAY_SCOPE }),
    ).toBe(true);
    expect(
      isLineActive({ mode: 'learn', lineId: 'other', selection, scope: EMPTY_PLAY_SCOPE }),
    ).toBe(false);
  });
});

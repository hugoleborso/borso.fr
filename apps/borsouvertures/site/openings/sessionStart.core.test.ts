import { describe, expect, it } from 'vitest';
import type { PlayScope } from '@/state/persistedState.utils';
import { EMPTY_PLAY_SCOPE, FULL_SELECTION } from './playScope.core';
import { ALL_KEY, type Selection } from './selectors.utils';
import {
  buildSessionKey,
  isLearnSessionReady,
  isPlayScopeResetRequired,
  isPlaySessionReady,
  isSessionStartAllowed,
  selectTreeVisualization,
} from './sessionStart.core';

const NOTHING_SELECTED: Selection = FULL_SELECTION;
const NO_SELECTION: Selection = { openingId: null, variationId: null, lineId: null };

describe('isLearnSessionReady', () => {
  it('needs a variation to drill', () => {
    expect(isLearnSessionReady(NOTHING_SELECTED)).toBe(false);
    expect(isLearnSessionReady(NO_SELECTION)).toBe(false);
  });

  it('is ready once a variation is picked', () => {
    expect(
      isLearnSessionReady({ openingId: 'italian', variationId: 'classical', lineId: ALL_KEY }),
    ).toBe(true);
  });
});

describe('isPlaySessionReady', () => {
  it('is not ready when nothing narrows the book', () => {
    expect(isPlaySessionReady(NOTHING_SELECTED, EMPTY_PLAY_SCOPE)).toBe(false);
    expect(isPlaySessionReady(NO_SELECTION, EMPTY_PLAY_SCOPE)).toBe(false);
  });

  it('is ready when an opening is selected', () => {
    expect(
      isPlaySessionReady(
        { openingId: 'italian', variationId: ALL_KEY, lineId: ALL_KEY },
        EMPTY_PLAY_SCOPE,
      ),
    ).toBe(true);
  });

  it('is ready when a variation is selected', () => {
    expect(
      isPlaySessionReady(
        { openingId: ALL_KEY, variationId: 'classical', lineId: ALL_KEY },
        EMPTY_PLAY_SCOPE,
      ),
    ).toBe(true);
  });

  it('is ready when a line is selected', () => {
    expect(
      isPlaySessionReady(
        { openingId: ALL_KEY, variationId: ALL_KEY, lineId: 'greco' },
        EMPTY_PLAY_SCOPE,
      ),
    ).toBe(true);
  });

  it('is ready when the scope holds an opening', () => {
    const scope: PlayScope = { openingIds: ['italian'], variationIds: [], lineIds: [] };
    expect(isPlaySessionReady(NOTHING_SELECTED, scope)).toBe(true);
  });

  it('is ready when the scope holds a variation', () => {
    const scope: PlayScope = { openingIds: [], variationIds: ['classical'], lineIds: [] };
    expect(isPlaySessionReady(NOTHING_SELECTED, scope)).toBe(true);
  });

  it('is ready when the scope holds a line', () => {
    const scope: PlayScope = { openingIds: [], variationIds: [], lineIds: ['greco'] };
    expect(isPlaySessionReady(NOTHING_SELECTED, scope)).toBe(true);
  });
});

describe('isSessionStartAllowed', () => {
  it('applies the learn rule in learn mode', () => {
    expect(isSessionStartAllowed('learn', NOTHING_SELECTED, EMPTY_PLAY_SCOPE)).toBe(false);
    expect(
      isSessionStartAllowed(
        'learn',
        { openingId: 'italian', variationId: 'classical', lineId: ALL_KEY },
        EMPTY_PLAY_SCOPE,
      ),
    ).toBe(true);
  });

  it('applies the play rule in play mode', () => {
    expect(isSessionStartAllowed('play', NOTHING_SELECTED, EMPTY_PLAY_SCOPE)).toBe(false);
    expect(
      isSessionStartAllowed('play', NOTHING_SELECTED, {
        openingIds: ['italian'],
        variationIds: [],
        lineIds: [],
      }),
    ).toBe(true);
  });
});

describe('isPlayScopeResetRequired', () => {
  it('resets when leaving learn for play', () => {
    expect(isPlayScopeResetRequired('learn', 'play')).toBe(true);
  });

  it('does not reset when staying in play', () => {
    expect(isPlayScopeResetRequired('play', 'play')).toBe(false);
  });

  it('does not reset when moving to learn', () => {
    expect(isPlayScopeResetRequired('play', 'learn')).toBe(false);
    expect(isPlayScopeResetRequired('learn', 'learn')).toBe(false);
  });
});

describe('selectTreeVisualization', () => {
  it('honours an explicit choice on any viewport', () => {
    expect(selectTreeVisualization('arrows', true)).toBe('arrows');
    expect(selectTreeVisualization('buttons', false)).toBe('buttons');
  });

  it('defaults a compact viewport to tappable buttons', () => {
    expect(selectTreeVisualization(null, true)).toBe('buttons');
  });

  it('defaults a wide viewport to board arrows', () => {
    expect(selectTreeVisualization(null, false)).toBe('arrows');
  });
});

describe('buildSessionKey', () => {
  it('changes when the scope changes', () => {
    const first = buildSessionKey('play', 'white', NOTHING_SELECTED, EMPTY_PLAY_SCOPE);
    const second = buildSessionKey('play', 'white', NOTHING_SELECTED, {
      openingIds: ['italian'],
      variationIds: [],
      lineIds: [],
    });
    expect(first).not.toBe(second);
  });

  it('is stable for the same session', () => {
    expect(buildSessionKey('learn', 'black', NOTHING_SELECTED, EMPTY_PLAY_SCOPE)).toBe(
      buildSessionKey('learn', 'black', NOTHING_SELECTED, EMPTY_PLAY_SCOPE),
    );
  });

  it('spells out every part of the session', () => {
    expect(
      buildSessionKey(
        'play',
        'white',
        { openingId: 'italian', variationId: 'classical', lineId: 'greco' },
        { openingIds: ['a', 'b'], variationIds: ['c'], lineIds: ['d'] },
      ),
    ).toBe('play|white|italian|classical|greco|a,b|c|d');
  });
});

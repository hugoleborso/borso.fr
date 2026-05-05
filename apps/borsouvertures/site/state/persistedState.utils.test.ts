import { describe, expect, it } from 'vitest';
import {
  parsePersistedState,
  type PersistedState,
  stringifyPersistedState,
} from './persistedState.utils';

const VALID_STATE: PersistedState = {
  mode: 'play',
  side: 'black',
  boardStyle: 'nord',
  selection: { openingId: 'italian-game', variationId: 'main', lineId: null },
  view: 'session',
  playAutoOpponent: false,
  playScope: {
    openingIds: ['italian-game'],
    variationIds: ['main'],
    lineIds: ['classical'],
  },
  treeVisualizationMode: 'buttons',
};

describe('parsePersistedState', () => {
  it('returns null for a missing localStorage entry', () => {
    expect(parsePersistedState(null)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parsePersistedState('{not json')).toBeNull();
  });

  it('returns null for a non-object root', () => {
    expect(parsePersistedState(JSON.stringify(['array']))).toBeNull();
    expect(parsePersistedState(JSON.stringify('string'))).toBeNull();
    expect(parsePersistedState(JSON.stringify(null))).toBeNull();
  });

  it('round-trips a valid state', () => {
    const raw = stringifyPersistedState(VALID_STATE);
    expect(parsePersistedState(raw)).toEqual(VALID_STATE);
  });

  it('rejects an unknown mode value', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, mode: 'bogus' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects an unknown side value', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, side: 'middle' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a non-string boardStyle', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, boardStyle: 42 };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a string boardStyle that is not a known theme id', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, boardStyle: 'classique' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects an unknown view value', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, view: 'splash' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a non-boolean playAutoOpponent', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, playAutoOpponent: 'yes' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a non-object selection', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, selection: 'all' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a selection with a numeric id field', () => {
    const corrupted: Record<string, unknown> = {
      ...VALID_STATE,
      selection: { openingId: 1, variationId: null, lineId: null },
    };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('accepts a selection with null id fields', () => {
    const state: PersistedState = {
      ...VALID_STATE,
      selection: { openingId: null, variationId: null, lineId: null },
    };
    expect(parsePersistedState(stringifyPersistedState(state))).toEqual(state);
  });

  it('rejects a non-object playScope', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, playScope: 'all' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a playScope with a non-array openingIds', () => {
    const corrupted: Record<string, unknown> = {
      ...VALID_STATE,
      playScope: { openingIds: 'italian-game', variationIds: [], lineIds: [] },
    };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a playScope array containing non-string entries', () => {
    const corrupted: Record<string, unknown> = {
      ...VALID_STATE,
      playScope: { openingIds: [42], variationIds: [], lineIds: [] },
    };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a playScope missing one of the array fields', () => {
    const corrupted: Record<string, unknown> = {
      ...VALID_STATE,
      playScope: { openingIds: ['italian-game'], variationIds: ['main'] },
    };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('accepts a null treeVisualizationMode (auto by viewport)', () => {
    const state: PersistedState = { ...VALID_STATE, treeVisualizationMode: null };
    expect(parsePersistedState(stringifyPersistedState(state))).toEqual(state);
  });

  it('accepts the explicit arrows value for treeVisualizationMode', () => {
    const state: PersistedState = { ...VALID_STATE, treeVisualizationMode: 'arrows' };
    expect(parsePersistedState(stringifyPersistedState(state))).toEqual(state);
  });

  it('rejects an unknown treeVisualizationMode string', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, treeVisualizationMode: 'pies' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a non-string-non-null treeVisualizationMode', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, treeVisualizationMode: 42 };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });
});

describe('stringifyPersistedState', () => {
  it('produces JSON that parses back to the same value', () => {
    expect(JSON.parse(stringifyPersistedState(VALID_STATE))).toEqual(VALID_STATE);
  });
});

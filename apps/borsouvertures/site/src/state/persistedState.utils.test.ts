import { describe, expect, it } from 'vitest';
import {
  isNewCardsPerDay,
  listNewCardsPerDayChoices,
  NEW_CARDS_PER_DAY_DEFAULT,
  type PersistedState,
  parsePersistedState,
  stringifyPersistedState,
  toNewCardsPerDay,
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
  newCardsPerDay: 10,
  opponentStrength: 'skill-3',
};

const OTHER_VALID_STATE: PersistedState = {
  mode: 'learn',
  side: 'white',
  boardStyle: 'lichess',
  selection: { openingId: null, variationId: null, lineId: null },
  view: 'select',
  playAutoOpponent: true,
  playScope: { openingIds: [], variationIds: [], lineIds: [] },
  treeVisualizationMode: null,
  newCardsPerDay: 0,
  opponentStrength: 'elo-1900',
};

// @FollowsBlueprint test-pure-unit
describe('parsePersistedState', () => {
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

  it('round-trips the other value of every enum field', () => {
    const raw = stringifyPersistedState(OTHER_VALID_STATE);
    expect(parsePersistedState(raw)).toEqual(OTHER_VALID_STATE);
  });

  it('gives a record stored before the opponent strength existed the 2000 step', () => {
    const { opponentStrength: _opponentStrength, ...storedBefore } = VALID_STATE;
    expect(parsePersistedState(JSON.stringify(storedBefore))).toEqual({
      ...VALID_STATE,
      opponentStrength: 'elo-2000',
    });
  });

  it('rejects an opponent strength that is not a step', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, opponentStrength: 'elo-2100' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
    expect(
      parsePersistedState(JSON.stringify({ ...VALID_STATE, opponentStrength: null })),
    ).toBeNull();
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

  it('rejects a null selection', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, selection: null };
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

  it('rejects a null playScope', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, playScope: null };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
  });

  it('rejects a playScope whose variationIds alone is not an array', () => {
    const corrupted: Record<string, unknown> = {
      ...VALID_STATE,
      playScope: { openingIds: [], variationIds: 'main', lineIds: [] },
    };
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

describe('the new cards per day setting', () => {
  it('defaults to 10 and allows 0 to 30 whole cards', () => {
    expect(NEW_CARDS_PER_DAY_DEFAULT).toBe(10);
    expect(isNewCardsPerDay(0)).toBe(true);
    expect(isNewCardsPerDay(30)).toBe(true);
    expect(isNewCardsPerDay(31)).toBe(false);
    expect(isNewCardsPerDay(-1)).toBe(false);
    expect(isNewCardsPerDay(2.5)).toBe(false);
    expect(isNewCardsPerDay('10')).toBe(false);
  });

  it('offers every count from 0 to 30', () => {
    const choices = listNewCardsPerDayChoices();
    expect(choices).toHaveLength(31);
    expect(choices[0]).toBe(0);
    expect(choices[10]).toBe(10);
    expect(choices.at(-1)).toBe(30);
  });

  it('reads the count a select hands back, and keeps the current one on anything else', () => {
    expect(toNewCardsPerDay('0', 10)).toBe(0);
    expect(toNewCardsPerDay('30', 10)).toBe(30);
    expect(toNewCardsPerDay('31', 10)).toBe(10);
    expect(toNewCardsPerDay('', 10)).toBe(10);
    expect(toNewCardsPerDay('  ', 10)).toBe(10);
    expect(toNewCardsPerDay('many', 7)).toBe(7);
  });

  it('discards a stored record that lacks the field or holds a count out of range', () => {
    const { newCardsPerDay: _newCardsPerDay, ...withoutField } = VALID_STATE;
    expect(parsePersistedState(JSON.stringify(withoutField))).toBeNull();
    expect(parsePersistedState(JSON.stringify({ ...VALID_STATE, newCardsPerDay: 31 }))).toBeNull();
    expect(parsePersistedState(JSON.stringify({ ...VALID_STATE, newCardsPerDay: 30 }))).toEqual({
      ...VALID_STATE,
      newCardsPerDay: 30,
    });
  });
});

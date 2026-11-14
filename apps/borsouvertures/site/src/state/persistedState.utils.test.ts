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
  side: 'black',
  boardStyle: 'nord',
  newCardsPerDay: 10,
  opponentStrength: 'skill-3',
  isEvaluationBarShown: false,
  isMoveSoundOn: true,
};

const OTHER_VALID_STATE: PersistedState = {
  side: 'white',
  boardStyle: 'lichess',
  newCardsPerDay: 0,
  opponentStrength: 'elo-1900',
  isEvaluationBarShown: true,
  isMoveSoundOn: false,
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

  it('shows the evaluation bar and keeps the move sound off for a record stored before either existed', () => {
    const {
      isEvaluationBarShown: _isEvaluationBarShown,
      isMoveSoundOn: _isMoveSoundOn,
      ...storedBefore
    } = VALID_STATE;
    expect(parsePersistedState(JSON.stringify(storedBefore))).toEqual({
      ...VALID_STATE,
      isEvaluationBarShown: true,
      isMoveSoundOn: false,
    });
  });

  it('falls back to the default of a setting stored as something else than a flag', () => {
    const corrupted = { ...VALID_STATE, isEvaluationBarShown: 'no', isMoveSoundOn: 1 };
    expect(parsePersistedState(JSON.stringify(corrupted))).toEqual({
      ...VALID_STATE,
      isEvaluationBarShown: true,
      isMoveSoundOn: false,
    });
  });

  it('rejects an opponent strength that is not a step', () => {
    const corrupted: Record<string, unknown> = { ...VALID_STATE, opponentStrength: 'elo-2100' };
    expect(parsePersistedState(JSON.stringify(corrupted))).toBeNull();
    expect(
      parsePersistedState(JSON.stringify({ ...VALID_STATE, opponentStrength: null })),
    ).toBeNull();
  });

  it('keeps the side, the board and the settings of a record that still holds the old Explore fields', () => {
    const storedBefore = {
      ...VALID_STATE,
      mode: 'play',
      view: 'session',
      selection: { openingId: 'italian-game', variationId: 'main', lineId: null },
      playScope: { openingIds: [], variationIds: [], lineIds: [] },
      playAutoOpponent: false,
      treeVisualizationMode: 'buttons',
    };
    expect(parsePersistedState(JSON.stringify(storedBefore))).toEqual(VALID_STATE);
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

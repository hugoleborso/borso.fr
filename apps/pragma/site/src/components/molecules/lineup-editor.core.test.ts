import { describe, expect, it } from 'vitest';
import {
  formValuesToLineup,
  type LineupEditorMember,
  lineupToFormValues,
  toggleInstrumentHeld,
  toLineupPayload,
} from './lineup-editor.core';

const MEMBERS: readonly LineupEditorMember[] = [
  { id: 'ada', name: 'Ada', color: '#111111' },
  { id: 'bob', name: 'Bob', color: '#222222' },
];

// @FollowsBlueprint test-pure-unit
describe('lineupToFormValues', () => {
  it('fills a value for every member', () => {
    expect(lineupToFormValues({ ada: ['guitar'] }, MEMBERS)).toEqual({ ada: ['guitar'], bob: [] });
  });

  it('keeps every instrument a member holds at once', () => {
    expect(lineupToFormValues({ ada: ['drums', 'vocals'] }, MEMBERS).ada).toEqual([
      'drums',
      'vocals',
    ]);
  });

  it('copies the lists rather than sharing them with the lineup', () => {
    const lineup = { ada: ['guitar'] };
    expect(lineupToFormValues(lineup, MEMBERS).ada).not.toBe(lineup.ada);
  });

  it('reads an empty list as not playing', () => {
    expect(lineupToFormValues({ ada: [], bob: [] }, MEMBERS)).toEqual({ ada: [], bob: [] });
  });
});

describe('formValuesToLineup', () => {
  it('keeps every member, so one sitting out is written as sitting out', () => {
    expect(formValuesToLineup({ ada: ['guitar'], bob: [] })).toEqual({ ada: ['guitar'], bob: [] });
  });

  it('collapses a selection where nobody plays to null', () => {
    expect(formValuesToLineup({ ada: [], bob: [] })).toBeNull();
  });
});

describe('toggleInstrumentHeld', () => {
  it('adds an instrument the member does not hold', () => {
    expect(toggleInstrumentHeld(['drums'], 'vocals')).toEqual(['drums', 'vocals']);
  });

  it('drops an instrument the member holds', () => {
    expect(toggleInstrumentHeld(['drums', 'vocals'], 'drums')).toEqual(['vocals']);
  });
});

describe('toLineupPayload', () => {
  it('answers a mutable copy the request body can take', () => {
    const lineup = { ada: ['guitar'] };
    const payload = toLineupPayload(lineup);
    expect(payload).toEqual({ ada: ['guitar'] });
    expect(payload.ada).not.toBe(lineup.ada);
  });

  it('answers an empty record for no lineup at all', () => {
    expect(toLineupPayload(null)).toEqual({});
  });
});

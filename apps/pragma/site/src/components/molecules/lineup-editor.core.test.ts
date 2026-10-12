import { describe, expect, it } from 'vitest';
import {
  formValuesToLineup,
  type LineupEditorMember,
  lineupToFormValues,
  selectLineupSaveTarget,
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
    const body = toLineupPayload(lineup);
    expect(body).toEqual({ ada: ['guitar'] });
    expect(body.ada).not.toBe(lineup.ada);
  });

  it('answers an empty record for no lineup at all', () => {
    expect(toLineupPayload(null)).toEqual({});
  });
});

describe('selectLineupSaveTarget', () => {
  const STAFFED_DEFAULT = { ada: ['guitar'], bob: [] };
  const EDITED = { ada: ['bass'], bob: [] };

  it('writes a lineup into the song default when the song has none yet', () => {
    expect(selectLineupSaveTarget({}, EDITED, false)).toBe('song-default');
    expect(selectLineupSaveTarget({ ada: [], bob: [] }, EDITED, false)).toBe('song-default');
  });

  it('keeps an edit on the entry when the song already has a default', () => {
    expect(selectLineupSaveTarget(STAFFED_DEFAULT, EDITED, false)).toBe('entry-override');
  });

  it('clears the entry override on a reset or when nobody plays', () => {
    expect(selectLineupSaveTarget(STAFFED_DEFAULT, EDITED, true)).toBe('entry-cleared');
    expect(selectLineupSaveTarget({}, EDITED, true)).toBe('entry-cleared');
    expect(selectLineupSaveTarget(STAFFED_DEFAULT, null, false)).toBe('entry-cleared');
    expect(selectLineupSaveTarget({}, null, false)).toBe('entry-cleared');
  });
});

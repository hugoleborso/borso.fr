import { describe, expect, it } from 'vitest';
import {
  SETLIST_ENTRY_TONES,
  isOverridingSongLineup,
  selectSetlistEntryTone,
  selectSetlistEntryToneAppearance,
} from './setlist-entry-tone.core';

const NO_OVERRIDE = null;
const AN_OVERRIDE_OF_NOTHING = {};
const NOBODY = {};
const NOBODY_HOLDING_ANYTHING = { 'member-1': [], 'member-2': [] };
const A_FULL_LINEUP = { 'member-1': ['instrument-1'], 'member-2': ['instrument-2'] };

describe('selectSetlistEntryTone', () => {
  it('reads plain when the lineup is staffed and inherited from the song', () => {
    expect(selectSetlistEntryTone(A_FULL_LINEUP, NO_OVERRIDE)).toBe('plain');
  });

  it('reads overridden when the entry moves an instrument to another member', () => {
    expect(selectSetlistEntryTone(A_FULL_LINEUP, { 'member-1': ['instrument-2'] })).toBe(
      'overridden',
    );
  });

  it('reads plain when the override is an empty object, which changes nothing', () => {
    expect(selectSetlistEntryTone(A_FULL_LINEUP, AN_OVERRIDE_OF_NOTHING)).toBe('plain');
  });

  it('reads plain when the override repeats the song default member for member', () => {
    expect(selectSetlistEntryTone(A_FULL_LINEUP, { ...A_FULL_LINEUP })).toBe('plain');
  });

  it('reads unstaffed when no member is in the lineup at all', () => {
    expect(selectSetlistEntryTone(NOBODY, NO_OVERRIDE)).toBe('unstaffed');
  });

  it('reads unstaffed when every member is present but holds nothing', () => {
    expect(selectSetlistEntryTone(NOBODY_HOLDING_ANYTHING, NO_OVERRIDE)).toBe('unstaffed');
  });

  it('prefers unstaffed over overridden, because an override that empties the lineup is still empty', () => {
    expect(selectSetlistEntryTone(A_FULL_LINEUP, { 'member-1': [], 'member-2': [] })).toBe(
      'unstaffed',
    );
  });
});

describe('isOverridingSongLineup', () => {
  it('says no when the entry carries no override', () => {
    expect(isOverridingSongLineup(A_FULL_LINEUP, NO_OVERRIDE)).toBe(false);
  });

  it('says no when the override is an empty object', () => {
    expect(isOverridingSongLineup(A_FULL_LINEUP, AN_OVERRIDE_OF_NOTHING)).toBe(false);
  });

  it('says no when the override gives a member the very instruments the song gives them', () => {
    expect(isOverridingSongLineup(A_FULL_LINEUP, { 'member-1': ['instrument-1'] })).toBe(false);
  });

  it('says no when the override lists the same instruments in another order', () => {
    expect(
      isOverridingSongLineup(
        { 'member-1': ['instrument-1', 'instrument-2'] },
        { 'member-1': ['instrument-2', 'instrument-1'] },
      ),
    ).toBe(false);
  });

  it('says no when the override names a member the song lineup ignores and gives them nothing', () => {
    expect(isOverridingSongLineup({ 'member-1': ['instrument-1'] }, { 'member-2': [] })).toBe(
      false,
    );
  });

  it('says yes when the override swaps one instrument for another', () => {
    expect(isOverridingSongLineup(A_FULL_LINEUP, { 'member-1': ['instrument-9'] })).toBe(true);
  });

  it('says yes when the override adds an instrument to what the song gives a member', () => {
    expect(
      isOverridingSongLineup(A_FULL_LINEUP, { 'member-1': ['instrument-1', 'instrument-3'] }),
    ).toBe(true);
  });

  it('says yes when the override takes every instrument away from a member', () => {
    expect(isOverridingSongLineup(A_FULL_LINEUP, { 'member-1': [] })).toBe(true);
  });

  it('says yes when the override staffs a member the song lineup ignores', () => {
    expect(isOverridingSongLineup(NOBODY, { 'member-1': ['instrument-1'] })).toBe(true);
  });
});

describe('selectSetlistEntryToneAppearance', () => {
  it('gives every tone a surface and a border', () => {
    for (const tone of SETLIST_ENTRY_TONES) {
      const appearance = selectSetlistEntryToneAppearance(tone);
      expect(appearance.surfaceClassName.length).toBeGreaterThan(0);
      expect(appearance.borderClassName.length).toBeGreaterThan(0);
    }
  });

  it('marks an override with the warning colour and an empty lineup with the sunk surface', () => {
    expect(selectSetlistEntryToneAppearance('overridden')).toEqual({
      surfaceClassName: 'bg-warn-soft',
      borderClassName: 'border-warn',
    });
    expect(selectSetlistEntryToneAppearance('unstaffed').surfaceClassName).toBe('bg-bg-sunk');
  });
});

import { describe, expect, it } from 'vitest';
import {
  SETLIST_ENTRY_TONES,
  selectSetlistEntryTone,
  selectSetlistEntryToneAppearance,
} from './setlist-entry-tone.core';

const NOBODY = {};
const NOBODY_HOLDING_ANYTHING = { 'member-1': [], 'member-2': [] };
const A_FULL_LINEUP = { 'member-1': ['instrument-1'], 'member-2': ['instrument-2'] };

describe('selectSetlistEntryTone', () => {
  it('reads plain when the lineup is staffed and inherited from the song', () => {
    expect(selectSetlistEntryTone(A_FULL_LINEUP, false)).toBe('plain');
  });

  it('reads overridden when the entry carries its own lineup', () => {
    expect(selectSetlistEntryTone(A_FULL_LINEUP, true)).toBe('overridden');
  });

  it('reads unstaffed when no member is in the lineup at all', () => {
    expect(selectSetlistEntryTone(NOBODY, false)).toBe('unstaffed');
  });

  it('reads unstaffed when every member is present but holds nothing', () => {
    expect(selectSetlistEntryTone(NOBODY_HOLDING_ANYTHING, false)).toBe('unstaffed');
  });

  it('prefers unstaffed over overridden, because an override that empties the lineup is still empty', () => {
    expect(selectSetlistEntryTone(NOBODY_HOLDING_ANYTHING, true)).toBe('unstaffed');
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

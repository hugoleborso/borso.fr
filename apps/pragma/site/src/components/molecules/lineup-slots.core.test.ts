import { describe, expect, it } from 'vitest';
import {
  buildLineupColumn,
  INSTRUMENT_ICON_GLYPH,
  LINEUP_SLOT_WIDTH_PX,
  type LineupColumnView,
  naturalColumnWidth,
  OVERFLOW_COUNTER_WIDTH_PX,
  sliceColumnToWidth,
  type SlotInstrument,
  slotsFittingWidth,
} from './lineup-slots.core';

const ANA = { id: 'ana', color: '#ff0000' };
const BEN = { id: 'ben', color: '#00ff00' };
const CAM = { id: 'cam', color: '#0000ff' };

function instrument(overrides: Partial<SlotInstrument> & { id: string }): SlotInstrument {
  return { name: overrides.id, icon: 'music', position: 0, ...overrides };
}

const VOICE = instrument({ id: 'voice', name: 'Voice', icon: 'mic-vocal', position: 0 });
const GUITAR = instrument({ id: 'guitar', name: 'Guitar', icon: 'guitar', position: 1 });
const BASS = instrument({ id: 'bass', name: 'Bass', icon: 'bass', position: 2 });
const DRUMS = instrument({ id: 'drums', name: 'Drums', icon: 'drum', position: 3 });

// @FollowsBlueprint test-pure-unit
describe('buildLineupColumn', () => {
  it('draws one slot per instrument held, ordered by the stored position, never by name', () => {
    const view = buildLineupColumn({
      instruments: [DRUMS, VOICE, BASS, GUITAR],
      lineup: { [ANA.id]: ['drums', 'voice'], [BEN.id]: ['bass'], [CAM.id]: ['guitar'] },
      members: [ANA, BEN, CAM],
    });
    expect(view.slots.map((slot) => slot.instrumentName)).toEqual([
      'Voice',
      'Guitar',
      'Bass',
      'Drums',
    ]);
  });

  it('breaks a tie on the name, so two instruments at one position still settle', () => {
    const view = buildLineupColumn({
      instruments: [
        instrument({ id: 'zither', name: 'Zither', position: 0 }),
        instrument({ id: 'alto', name: 'Alto', position: 0 }),
      ],
      lineup: { [ANA.id]: ['zither', 'alto'] },
      members: [ANA],
    });
    expect(view.slots.map((slot) => slot.instrumentName)).toEqual(['Alto', 'Zither']);
  });

  it('leaves out every instrument nobody holds on this song', () => {
    const view = buildLineupColumn({
      instruments: [VOICE, GUITAR, BASS, DRUMS],
      lineup: { [BEN.id]: ['guitar'], [ANA.id]: [] },
      members: [ANA, BEN],
    });
    expect(view.slots.map((slot) => slot.instrumentName)).toEqual(['Guitar']);
  });

  it('draws a slot per holder when two members share one instrument, in member order', () => {
    const view = buildLineupColumn({
      instruments: [VOICE, GUITAR],
      lineup: { [BEN.id]: ['voice'], [ANA.id]: ['voice', 'guitar'] },
      members: [ANA, BEN],
    });
    expect(view.slots.map((slot) => [slot.instrumentName, slot.holderColor])).toEqual([
      ['Voice', ANA.color],
      ['Voice', BEN.color],
      ['Guitar', ANA.color],
    ]);
    expect(new Set(view.slots.map((slot) => slot.slotKey)).size).toBe(3);
  });

  it('draws nothing when the song has no lineup at all', () => {
    const view = buildLineupColumn({ instruments: [VOICE, GUITAR], lineup: {}, members: [ANA] });
    expect(view.slots).toEqual([]);
  });

  it('ignores a lineup entry for a member the band no longer has', () => {
    const view = buildLineupColumn({
      instruments: [VOICE],
      lineup: { gone: ['voice'] },
      members: [ANA],
    });
    expect(view.slots).toEqual([]);
  });

  it('draws the glyph the instrument chose', () => {
    const view = buildLineupColumn({
      instruments: [VOICE],
      lineup: { [ANA.id]: ['voice'] },
      members: [ANA],
    });
    expect(view.slots[0]?.glyph).toBe(INSTRUMENT_ICON_GLYPH['mic-vocal']);
  });
});

function columnOf(...names: readonly string[]): LineupColumnView {
  return {
    slots: names.map((name) => ({
      slotKey: name,
      instrumentName: name,
      glyph: INSTRUMENT_ICON_GLYPH.music,
      holderColor: ANA.color,
    })),
  };
}

const FOUR_SLOTS_EXACTLY_PX = 4 * LINEUP_SLOT_WIDTH_PX;

describe('slotsFittingWidth', () => {
  it('holds nothing back before the column has been measured', () => {
    expect(slotsFittingWidth(4, null)).toBe(4);
  });

  it('shows nothing but the counter when the column was measured at nothing', () => {
    expect(slotsFittingWidth(4, 0)).toBe(0);
  });

  it('keeps every slot when they fit to the pixel', () => {
    expect(slotsFittingWidth(4, FOUR_SLOTS_EXACTLY_PX)).toBe(4);
  });

  it('gives up two slots for the counter as soon as one pixel is missing', () => {
    expect(slotsFittingWidth(4, FOUR_SLOTS_EXACTLY_PX - 1)).toBe(2);
  });

  it('never returns a negative count when the room is narrower than the counter', () => {
    expect(slotsFittingWidth(1, OVERFLOW_COUNTER_WIDTH_PX - LINEUP_SLOT_WIDTH_PX - 1)).toBe(0);
  });
});

describe('sliceColumnToWidth', () => {
  it('shows the whole column and no counter while the width is unknown', () => {
    const view = sliceColumnToWidth(columnOf('Voice', 'Guitar'), null);
    expect(view.slots).toHaveLength(2);
    expect(view.hasOverflow).toBe(false);
    expect(view.overflowCount).toBe(0);
  });

  it('counts the slots the width dropped and names them for the tooltip', () => {
    const view = sliceColumnToWidth(
      columnOf('Voice', 'Guitar', 'Bass', 'Drums'),
      FOUR_SLOTS_EXACTLY_PX - 1,
    );
    expect(view.slots.map((slot) => slot.instrumentName)).toEqual(['Voice', 'Guitar']);
    expect(view.overflowCount).toBe(2);
    expect(view.overflowInstrumentNames).toEqual(['Bass', 'Drums']);
    expect(view.hasOverflow).toBe(true);
  });

  it('shows the whole lineup when there is room for it', () => {
    const view = sliceColumnToWidth(
      columnOf('Voice', 'Voice', 'Guitar', 'Bass'),
      FOUR_SLOTS_EXACTLY_PX,
    );
    expect(view.slots).toHaveLength(4);
    expect(view.hasOverflow).toBe(false);
  });
});

describe('naturalColumnWidth', () => {
  it('asks for one slot width per slot', () => {
    expect(naturalColumnWidth(columnOf('Voice', 'Guitar'))).toBe(2 * LINEUP_SLOT_WIDTH_PX);
  });
});

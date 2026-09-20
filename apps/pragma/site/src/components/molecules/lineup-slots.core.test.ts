import { describe, expect, it } from 'vitest';
import {
  buildLineupColumn,
  EMPTY_LINEUP_SLOT_COLOR,
  INSTRUMENT_ICON_GLYPH,
  LINEUP_SLOT_WIDTH_PX,
  OVERFLOW_COUNTER_WIDTH_PX,
  resolveSlotBudget,
  selectColumnInstruments,
  sliceColumnToWidth,
  type SlotInstrument,
  slotsFittingWidth,
  naturalColumnWidth,
  slotTintColor,
} from './lineup-slots.core';

const ANA = { id: 'ana', color: '#ff0000' };
const BEN = { id: 'ben', color: '#00ff00' };
const CAM = { id: 'cam', color: '#0000ff' };

function instrument(overrides: Partial<SlotInstrument> & { id: string }): SlotInstrument {
  return {
    name: overrides.id,
    icon: 'music',
    position: 0,
    players: [{ memberId: ANA.id, isPrimary: true }],
    ...overrides,
  };
}

const VOICE = instrument({ id: 'voice', name: 'Voice', icon: 'mic-vocal', position: 0 });
const GUITAR = instrument({ id: 'guitar', name: 'Guitar', icon: 'guitar', position: 1 });
const BASS = instrument({ id: 'bass', name: 'Bass', icon: 'bass', position: 2 });
const DRUMS = instrument({ id: 'drums', name: 'Drums', icon: 'drum', position: 3 });

// @FollowsBlueprint test-pure-unit
describe('buildLineupColumn', () => {
  it('orders the column by the stored position, never by name', () => {
    const view = buildLineupColumn({
      instruments: [DRUMS, VOICE, BASS, GUITAR],
      lineup: {},
      members: [ANA, BEN, CAM],
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual([
      'voice',
      'guitar',
      'bass',
      'drums',
    ]);
  });

  it('breaks a tie on the name, so two instruments at one position still settle', () => {
    const view = buildLineupColumn({
      instruments: [
        instrument({ id: 'zither', name: 'Zither', position: 0 }),
        instrument({ id: 'alto', name: 'Alto', position: 0 }),
      ],
      lineup: {},
      members: [ANA],
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['alto', 'zither']);
  });

  it('leaves out an instrument nobody plays as their main one', () => {
    const triangle = instrument({
      id: 'triangle',
      name: 'Triangle',
      position: 9,
      players: [{ memberId: ANA.id, isPrimary: false }],
    });
    const view = buildLineupColumn({
      instruments: [VOICE, triangle],
      lineup: {},
      members: [ANA],
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['voice']);
  });

  it('keeps an instrument one member calls their main one and another does not', () => {
    const shared = instrument({
      id: 'shared',
      name: 'Shared',
      position: 5,
      players: [
        { memberId: ANA.id, isPrimary: false },
        { memberId: BEN.id, isPrimary: true },
      ],
    });
    const view = buildLineupColumn({
      instruments: [shared],
      lineup: {},
      members: [ANA, BEN],
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['shared']);
  });

  it('caps the column at the member count plus two and counts what it dropped', () => {
    const extras = [4, 5, 6].map((position) =>
      instrument({ id: `extra-${position}`, name: `Extra ${position}`, position }),
    );
    const view = buildLineupColumn({
      instruments: [VOICE, GUITAR, BASS, DRUMS, ...extras],
      lineup: {},
      members: [ANA, BEN, CAM],
    });
    expect(view.slots).toHaveLength(5);
    expect(view.cappedInstrumentNames).toEqual(['Extra 5', 'Extra 6']);
  });

  it('tints a slot with the colour of the member holding it on this song', () => {
    const view = buildLineupColumn({
      instruments: [VOICE, GUITAR],
      lineup: { [BEN.id]: ['guitar'] },
      members: [ANA, BEN],
    });
    expect(view.slots.map((slot) => slot.holderColor)).toEqual([null, BEN.color]);
  });

  it('tints both slots when one member holds two instruments on one song', () => {
    const view = buildLineupColumn({
      instruments: [VOICE, GUITAR],
      lineup: { [BEN.id]: ['voice', 'guitar'] },
      members: [ANA, BEN],
    });
    expect(view.slots.map((slot) => slot.holderColor)).toEqual([BEN.color, BEN.color]);
  });

  it('settles two members on one instrument on the first in the member order', () => {
    const view = buildLineupColumn({
      instruments: [GUITAR],
      lineup: { [ANA.id]: ['guitar'], [BEN.id]: ['guitar'] },
      members: [ANA, BEN],
    });
    expect(view.slots[0]?.holderColor).toBe(ANA.color);
  });

  it('leaves every slot untinted when the song has no lineup at all', () => {
    const view = buildLineupColumn({
      instruments: [VOICE, GUITAR],
      lineup: {},
      members: [ANA, BEN],
    });
    expect(view.slots.every((slot) => slot.holderColor === null)).toBe(true);
  });

  it('keeps a slot for an instrument whose icon was never chosen', () => {
    const bouzouki = instrument({ id: 'bouzouki', name: 'Bouzouki', icon: 'music', position: 7 });
    const view = buildLineupColumn({
      instruments: [bouzouki],
      lineup: {},
      members: [ANA],
    });
    expect(view.slots[0]?.glyph).toBe(INSTRUMENT_ICON_GLYPH.music);
  });
});

function played(id: string, position: number, name: string): SlotInstrument {
  return instrument({ id, name, position, players: [{ memberId: ANA.id, isPrimary: false }] });
}

describe('the fallback when the band declares no main instrument', () => {
  it('falls back to every instrument in position order when no primacy exists anywhere', () => {
    const view = buildLineupColumn({
      instruments: [played('drums', 3, 'Drums'), played('voice', 0, 'Voice')],
      lineup: {},
      members: [ANA, BEN],
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['voice', 'drums']);
  });

  it('drops the fallback as soon as one instrument anywhere belongs to somebody as their main one', () => {
    const view = buildLineupColumn({
      instruments: [played('drums', 3, 'Drums'), VOICE],
      lineup: {},
      members: [ANA, BEN],
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['voice']);
    expect(view.cappedInstrumentNames).toEqual([]);
  });

  it('never falls back when every instrument is already a main one', () => {
    const view = buildLineupColumn({
      instruments: [VOICE, GUITAR, BASS],
      lineup: {},
      members: [ANA, BEN],
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['voice', 'guitar', 'bass']);
  });

  it('still honours the cap while falling back, and counts what it dropped', () => {
    const view = buildLineupColumn({
      instruments: [
        played('voice', 0, 'Voice'),
        played('guitar', 1, 'Guitar'),
        played('bass', 2, 'Bass'),
        played('drums', 3, 'Drums'),
      ],
      lineup: {},
      members: [ANA],
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['voice', 'guitar', 'bass']);
    expect(view.cappedInstrumentNames).toEqual(['Drums']);
  });

  it('tints a fallback slot with the colour of the member holding it on this song', () => {
    const view = buildLineupColumn({
      instruments: [played('guitar', 1, 'Guitar')],
      lineup: { [BEN.id]: ['guitar'] },
      members: [ANA, BEN],
    });
    expect(view.slots[0]?.holderColor).toBe(BEN.color);
  });
});

describe('selectColumnInstruments', () => {
  it('hands back the same list when nothing is a main instrument', () => {
    const all = [
      instrument({ id: 'one', players: [{ memberId: ANA.id, isPrimary: false }] }),
      instrument({ id: 'two', players: [] }),
    ];
    expect(selectColumnInstruments(all)).toEqual(all);
  });

  it('keeps only the main ones as soon as there is one', () => {
    const main = instrument({ id: 'main' });
    const spare = instrument({ id: 'spare', players: [{ memberId: ANA.id, isPrimary: false }] });
    expect(selectColumnInstruments([main, spare])).toEqual([main]);
  });
});

describe('resolveSlotBudget', () => {
  it('leaves two slots beyond the member count, so a second main instrument still lands', () => {
    expect(resolveSlotBudget(3)).toBe(5);
  });

  it('still gives a band of one a column it can grow into', () => {
    expect(resolveSlotBudget(1)).toBe(3);
  });
});

function columnOf(...names: readonly string[]) {
  return {
    slots: names.map((name) => ({
      instrumentId: name,
      instrumentName: name,
      glyph: INSTRUMENT_ICON_GLYPH.music,
      holderColor: null,
    })),
    cappedInstrumentNames: [],
  };
}

const FOUR_SLOTS_EXACTLY_PX = 4 * LINEUP_SLOT_WIDTH_PX;

describe('slotsFittingWidth', () => {
  it('holds nothing back before the column has been measured', () => {
    expect(slotsFittingWidth(4, null, false)).toBe(4);
  });

  it('shows nothing but the counter when the column was measured at nothing', () => {
    expect(slotsFittingWidth(4, 0, false)).toBe(0);
  });

  it('keeps every slot when they fit to the pixel', () => {
    expect(slotsFittingWidth(4, FOUR_SLOTS_EXACTLY_PX, false)).toBe(4);
  });

  it('gives up two slots for the counter as soon as one pixel is missing', () => {
    expect(slotsFittingWidth(4, FOUR_SLOTS_EXACTLY_PX - 1, false)).toBe(2);
  });

  it('reserves the counter up front when the member cap already owes one', () => {
    expect(slotsFittingWidth(4, FOUR_SLOTS_EXACTLY_PX, true)).toBe(2);
  });

  it('keeps every slot when the counter fits beside them', () => {
    expect(slotsFittingWidth(4, FOUR_SLOTS_EXACTLY_PX + OVERFLOW_COUNTER_WIDTH_PX, true)).toBe(4);
  });

  it('never returns a negative count when the room is narrower than the counter', () => {
    expect(slotsFittingWidth(1, 10, false)).toBe(0);
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

  it('counts what the member cap dropped even when every remaining slot fits', () => {
    const view = sliceColumnToWidth(
      { ...columnOf('Voice'), cappedInstrumentNames: ['Triangle'] },
      FOUR_SLOTS_EXACTLY_PX,
    );
    expect(view.slots).toHaveLength(1);
    expect(view.overflowInstrumentNames).toEqual(['Triangle']);
    expect(view.overflowCount).toBe(1);
    expect(view.hasOverflow).toBe(true);
  });

  it('fills the whole width when no counter is owed', () => {
    const view = sliceColumnToWidth(
      columnOf('Voice', 'Guitar', 'Bass', 'Drums'),
      FOUR_SLOTS_EXACTLY_PX,
    );
    expect(view.slots).toHaveLength(4);
    expect(view.hasOverflow).toBe(false);
  });

  it('gives back room for the counter the member cap already owes, before measuring', () => {
    const view = sliceColumnToWidth(
      { ...columnOf('Voice', 'Guitar', 'Bass', 'Drums'), cappedInstrumentNames: ['Triangle'] },
      FOUR_SLOTS_EXACTLY_PX,
    );
    expect(view.slots.map((slot) => slot.instrumentName)).toEqual(['Voice', 'Guitar']);
    expect(view.overflowInstrumentNames).toEqual(['Bass', 'Drums', 'Triangle']);
  });

  it('reads the width-dropped slots before the capped ones, as the eye meets them', () => {
    const view = sliceColumnToWidth(
      { ...columnOf('Voice', 'Guitar', 'Bass'), cappedInstrumentNames: ['Triangle'] },
      LINEUP_SLOT_WIDTH_PX + OVERFLOW_COUNTER_WIDTH_PX,
    );
    expect(view.overflowInstrumentNames).toEqual(['Guitar', 'Bass', 'Triangle']);
  });
});

describe('naturalColumnWidth', () => {
  it('asks for one slot width per slot when nothing was capped', () => {
    expect(naturalColumnWidth(columnOf('Voice', 'Guitar'))).toBe(2 * LINEUP_SLOT_WIDTH_PX);
  });

  it('asks for the counter too when the member cap already dropped a name', () => {
    expect(naturalColumnWidth({ ...columnOf('Voice'), cappedInstrumentNames: ['Triangle'] })).toBe(
      LINEUP_SLOT_WIDTH_PX + OVERFLOW_COUNTER_WIDTH_PX,
    );
  });
});

describe('slotTintColor', () => {
  it('takes the colour of the member holding the slot', () => {
    expect(slotTintColor('#ff0000')).toBe('#ff0000');
  });

  it('falls back to the empty tint when nobody holds it on this song', () => {
    expect(slotTintColor(null)).toBe(EMPTY_LINEUP_SLOT_COLOR);
  });
});

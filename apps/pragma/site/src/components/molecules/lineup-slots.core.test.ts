import { describe, expect, it } from 'vitest';
import {
  buildLineupSlots,
  EMPTY_LINEUP_SLOT_COLOR,
  INSTRUMENT_ICON_GLYPH,
  resolveSlotBudget,
  type SlotInstrument,
  slotTintColor,
} from './lineup-slots.core';

const ANA = { id: 'ana', color: '#ff0000' };
const BEN = { id: 'ben', color: '#00ff00' };
const CAM = { id: 'cam', color: '#0000ff' };
const ROOMY_BUDGET = 8;

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
describe('buildLineupSlots', () => {
  it('orders the column by the stored position, never by name', () => {
    const view = buildLineupSlots({
      instruments: [DRUMS, VOICE, BASS, GUITAR],
      lineup: {},
      members: [ANA, BEN, CAM],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual([
      'voice',
      'guitar',
      'bass',
      'drums',
    ]);
  });

  it('breaks a tie on the name, so two instruments at one position still settle', () => {
    const view = buildLineupSlots({
      instruments: [
        instrument({ id: 'zither', name: 'Zither', position: 0 }),
        instrument({ id: 'alto', name: 'Alto', position: 0 }),
      ],
      lineup: {},
      members: [ANA],
      maximumVisibleSlots: ROOMY_BUDGET,
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
    const view = buildLineupSlots({
      instruments: [VOICE, triangle],
      lineup: {},
      members: [ANA],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['voice']);
  });

  it('caps the column at the member count plus two and counts what it dropped', () => {
    const extras = [4, 5, 6].map((position) =>
      instrument({ id: `extra-${position}`, name: `Extra ${position}`, position }),
    );
    const view = buildLineupSlots({
      instruments: [VOICE, GUITAR, BASS, DRUMS, ...extras],
      lineup: {},
      members: [ANA, BEN, CAM],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.slots).toHaveLength(5);
    expect(view.overflowCount).toBe(2);
    expect(view.overflowInstrumentNames).toEqual(['Extra 5', 'Extra 6']);
  });

  it('yields to the narrow budget when the breakpoint is tighter than the member cap', () => {
    const view = buildLineupSlots({
      instruments: [VOICE, GUITAR, BASS, DRUMS],
      lineup: {},
      members: [ANA, BEN, CAM],
      maximumVisibleSlots: 3,
    });
    expect(view.slots.map((slot) => slot.instrumentId)).toEqual(['voice', 'guitar', 'bass']);
    expect(view.overflowCount).toBe(1);
    expect(view.overflowInstrumentNames).toEqual(['Drums']);
  });

  it('tints a slot with the colour of the member holding it on this song', () => {
    const view = buildLineupSlots({
      instruments: [VOICE, GUITAR],
      lineup: { [BEN.id]: ['guitar'] },
      members: [ANA, BEN],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.slots.map((slot) => slot.holderColor)).toEqual([null, BEN.color]);
  });

  it('tints both slots when one member holds two instruments on one song', () => {
    const view = buildLineupSlots({
      instruments: [VOICE, GUITAR],
      lineup: { [BEN.id]: ['voice', 'guitar'] },
      members: [ANA, BEN],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.slots.map((slot) => slot.holderColor)).toEqual([BEN.color, BEN.color]);
  });

  it('settles two members on one instrument on the first in the member order', () => {
    const view = buildLineupSlots({
      instruments: [GUITAR],
      lineup: { [ANA.id]: ['guitar'], [BEN.id]: ['guitar'] },
      members: [ANA, BEN],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.slots[0]?.holderColor).toBe(ANA.color);
  });

  it('leaves every slot untinted when the song has no lineup at all', () => {
    const view = buildLineupSlots({
      instruments: [VOICE, GUITAR],
      lineup: {},
      members: [ANA, BEN],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.slots.every((slot) => slot.holderColor === null)).toBe(true);
  });

  it('keeps a slot for an instrument whose icon was never chosen', () => {
    const bouzouki = instrument({ id: 'bouzouki', name: 'Bouzouki', icon: 'music', position: 7 });
    const view = buildLineupSlots({
      instruments: [bouzouki],
      lineup: {},
      members: [ANA],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.slots[0]?.glyph).toBe(INSTRUMENT_ICON_GLYPH.music);
  });
});

describe('resolveSlotBudget', () => {
  it('takes the member cap when the breakpoint is roomier', () => {
    expect(resolveSlotBudget(3, ROOMY_BUDGET)).toBe(5);
  });

  it('takes the breakpoint budget when it is tighter', () => {
    expect(resolveSlotBudget(6, 4)).toBe(4);
  });
});

describe('the overflow counter', () => {
  it('stays hidden when every instrument fits', () => {
    const view = buildLineupSlots({
      instruments: [VOICE],
      lineup: {},
      members: [ANA],
      maximumVisibleSlots: ROOMY_BUDGET,
    });
    expect(view.hasOverflow).toBe(false);
  });

  it('shows as soon as one instrument was dropped', () => {
    const view = buildLineupSlots({
      instruments: [VOICE, GUITAR],
      lineup: {},
      members: [ANA],
      maximumVisibleSlots: 1,
    });
    expect(view.hasOverflow).toBe(true);
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

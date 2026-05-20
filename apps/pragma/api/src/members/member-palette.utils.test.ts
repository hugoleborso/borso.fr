import { describe, expect, it } from 'vitest';
import { MEMBER_PALETTE, pickNextPaletteHex, pickPaletteHex } from './member-palette.utils';

describe('pickPaletteHex', () => {
  it('returns the slot hex for indices 0..4', () => {
    expect(pickPaletteHex(0)).toBe(MEMBER_PALETTE[0].hex);
    expect(pickPaletteHex(1)).toBe(MEMBER_PALETTE[1].hex);
    expect(pickPaletteHex(2)).toBe(MEMBER_PALETTE[2].hex);
    expect(pickPaletteHex(3)).toBe(MEMBER_PALETTE[3].hex);
    expect(pickPaletteHex(4)).toBe(MEMBER_PALETTE[4].hex);
  });

  it('wraps via modulo (5 -> 0)', () => {
    expect(pickPaletteHex(5)).toBe(MEMBER_PALETTE[0].hex);
    expect(pickPaletteHex(10)).toBe(MEMBER_PALETTE[0].hex);
  });

  it('handles negative indices safely (-1 -> last slot)', () => {
    expect(pickPaletteHex(-1)).toBe(MEMBER_PALETTE[4].hex);
    expect(pickPaletteHex(-5)).toBe(MEMBER_PALETTE[0].hex);
  });
});

describe('pickNextPaletteHex', () => {
  it('picks the first slot for an empty member list', () => {
    expect(pickNextPaletteHex(0)).toBe(MEMBER_PALETTE[0].hex);
  });

  it('picks the second slot when one member already exists', () => {
    expect(pickNextPaletteHex(1)).toBe(MEMBER_PALETTE[1].hex);
  });

  it('wraps once five members are seated', () => {
    expect(pickNextPaletteHex(5)).toBe(MEMBER_PALETTE[0].hex);
  });
});

describe('MEMBER_PALETTE', () => {
  it('has exactly the five design-bundle hues', () => {
    expect(MEMBER_PALETTE.map((slot) => slot.name)).toEqual([
      'coral',
      'teal',
      'mustard',
      'plum',
      'sage',
    ]);
  });

  it('each hex matches the #rrggbb pattern', () => {
    for (const slot of MEMBER_PALETTE) {
      expect(slot.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

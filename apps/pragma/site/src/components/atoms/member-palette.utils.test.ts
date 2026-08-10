import { describe, expect, it } from 'vitest';
import {
  MEMBER_PALETTE,
  memberInitial,
  paletteColorFromHex,
  paletteKeyFromHex,
  parseHexTriplet,
} from './member-palette.utils';

// @FollowsBlueprint test-pure-unit
describe('parseHexTriplet', () => {
  it('reads the three channel bytes of a six-digit hex', () => {
    expect(parseHexTriplet('#c4583a')).toEqual([0xc4, 0x58, 0x3a]);
  });

  it('ignores surrounding whitespace', () => {
    expect(parseHexTriplet('  #c4583a  ')).toEqual([0xc4, 0x58, 0x3a]);
  });

  it('answers null on anything that is not a six-digit hex', () => {
    expect(parseHexTriplet('not-a-hex')).toBeNull();
    expect(parseHexTriplet('#abc')).toBeNull();
    expect(parseHexTriplet('')).toBeNull();
  });
});

describe('paletteKeyFromHex', () => {
  it('returns the exact key when the hex matches a canonical hue', () => {
    expect(paletteKeyFromHex('#c4583a')).toBe('coral');
    expect(paletteKeyFromHex('#3d8a8a')).toBe('teal');
    expect(paletteKeyFromHex('#c4912b')).toBe('mustard');
    expect(paletteKeyFromHex('#8a4870')).toBe('plum');
    expect(paletteKeyFromHex('#6e8a48')).toBe('sage');
  });

  it('snaps an off-palette hex to the closest hue', () => {
    expect(paletteKeyFromHex('#d96f5a')).toBe('coral');
    expect(paletteKeyFromHex('#3f8e8a')).toBe('teal');
    expect(paletteKeyFromHex('#7a8f5a')).toBe('sage');
  });

  it('ignores whitespace around the hex', () => {
    expect(paletteKeyFromHex('  #6e8a48  ')).toBe('sage');
  });

  it('keeps the first of two equidistant hues', () => {
    expect(paletteKeyFromHex('#a75055')).toBe('coral');
  });

  it('accepts uppercase hex', () => {
    expect(paletteKeyFromHex('#C4583A')).toBe('coral');
  });

  it('falls back to coral on malformed hex', () => {
    expect(paletteKeyFromHex('not-a-hex')).toBe('coral');
    expect(paletteKeyFromHex('#abc')).toBe('coral');
    expect(paletteKeyFromHex('')).toBe('coral');
  });
});

describe('paletteColorFromHex', () => {
  it('returns the CSS var for the resolved key', () => {
    expect(paletteColorFromHex('#c4583a')).toBe(MEMBER_PALETTE.coral);
    expect(paletteColorFromHex('not-a-hex')).toBe(MEMBER_PALETTE.coral);
  });
});

describe('memberInitial', () => {
  it('returns the first character uppercased', () => {
    expect(memberInitial('Hugo')).toBe('H');
    expect(memberInitial('gui')).toBe('G');
  });

  it('trims surrounding whitespace', () => {
    expect(memberInitial('  Arnaud')).toBe('A');
  });

  it('returns an empty string for an empty name', () => {
    expect(memberInitial('')).toBe('');
    expect(memberInitial('   ')).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import { ANIMATION_MODE_LIST } from './animation.core';
import {
  CUSTOM_COLOR_SLOTS,
  formatBalancePercentage,
  formatWorkNumber,
  PALETTE_KEY_LIST,
  selectAnimationLabelKey,
  selectPaletteLabelKey,
  selectRailClassName,
  selectRailToggleLabelKey,
  selectSwatchRowKind,
} from './mondrian-labels.core';
import { CUSTOM_DEFAULTS } from './palettes.utils';

// @FollowsBlueprint test-pure-unit
describe('selectPaletteLabelKey', () => {
  it.each(PALETTE_KEY_LIST)('names a catalogue key for "%s"', (paletteKey) => {
    expect(selectPaletteLabelKey(paletteKey)).toBe(`mondrian.palette.${paletteKey}`);
  });
});

describe('selectAnimationLabelKey', () => {
  it.each(ANIMATION_MODE_LIST)('names a catalogue key for "%s"', (mode) => {
    expect(selectAnimationLabelKey(mode)).toBe(`mondrian.animation.${mode}`);
  });
});

describe('selectRailToggleLabelKey', () => {
  it('offers to close an open rail', () => {
    expect(selectRailToggleLabelKey(true)).toBe('mondrian.rail.close');
  });

  it('offers to open a closed rail', () => {
    expect(selectRailToggleLabelKey(false)).toBe('mondrian.rail.open');
  });
});

describe('selectRailClassName', () => {
  it('marks an open rail', () => {
    expect(selectRailClassName(true)).toBe('rail open');
  });

  it('leaves a closed rail unmarked', () => {
    expect(selectRailClassName(false)).toBe('rail');
  });
});

describe('CUSTOM_COLOR_SLOTS', () => {
  it('covers every colour the custom palette is built from', () => {
    expect(CUSTOM_COLOR_SLOTS.map((descriptor) => descriptor.slot)).toEqual(
      Object.keys(CUSTOM_DEFAULTS),
    );
  });
});

describe('selectSwatchRowKind', () => {
  it('lets the reader edit the custom palette', () => {
    expect(selectSwatchRowKind('custom')).toBe('editable');
  });

  it.each(['classic', 'muted', 'nocturne', 'garden'] as const)(
    'shows "%s" as read only',
    (paletteKey) => {
      expect(selectSwatchRowKind(paletteKey)).toBe('read-only');
    },
  );
});

describe('formatWorkNumber', () => {
  it('pads a short number to four digits', () => {
    expect(formatWorkNumber(42)).toBe('№ 0042');
  });

  it('wraps a seed larger than the catalogue', () => {
    expect(formatWorkNumber(10_000)).toBe('№ 0001');
  });
});

describe('formatBalancePercentage', () => {
  it('reads a ratio as a whole percentage', () => {
    expect(formatBalancePercentage(0.5)).toBe(50);
  });

  it('rounds to the nearest whole percentage', () => {
    expect(formatBalancePercentage(0.567)).toBe(57);
  });
});

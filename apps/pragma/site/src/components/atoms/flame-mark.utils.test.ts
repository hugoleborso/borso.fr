import { describe, expect, it } from 'vitest';
import {
  BLAZE_SPARKS,
  BONFIRE_FLICKER_CLASS,
  BONFIRE_PLACEMENTS,
  FLAME_GLOW_CLASS,
  FLAME_LAYER_PATHS,
  FLAME_LAYERS,
  FLAME_MARK_PIXELS,
} from './flame-mark.utils';

// @FollowsBlueprint test-pure-unit
describe('FLAME_LAYERS', () => {
  it('stacks deep, mid and core blues once today counts', () => {
    expect(FLAME_LAYERS.counted).toEqual([
      { layer: 'outer', className: 'fill-flame-deep' },
      { layer: 'middle', className: 'fill-flame-mid' },
      { layer: 'core', className: 'fill-flame-core' },
    ]);
  });

  it('outlines a soft flame in accent with a faint core while today is open', () => {
    expect(FLAME_LAYERS.open).toEqual([
      { layer: 'outer', className: 'fill-accent-soft stroke-accent' },
      { layer: 'core', className: 'fill-accent opacity-55' },
    ]);
  });

  it('draws only an ink-faint outline for a flame at zero', () => {
    expect(FLAME_LAYERS.out).toEqual([{ layer: 'outer', className: 'fill-none stroke-ink-faint' }]);
  });

  it('draws each layer from its own path, the core inside the middle inside the outer', () => {
    expect(Object.keys(FLAME_LAYER_PATHS)).toEqual(['outer', 'middle', 'core']);
    expect(FLAME_LAYER_PATHS.outer.startsWith('M12 1.8')).toBe(true);
    expect(FLAME_LAYER_PATHS.middle.startsWith('M12 7.6')).toBe(true);
    expect(FLAME_LAYER_PATHS.core.startsWith('M12 12.6')).toBe(true);
  });
});

describe('BLAZE_SPARKS', () => {
  it('throws three sparks once today counts, one while open, none at zero', () => {
    expect(BLAZE_SPARKS.counted).toEqual([
      { cx: 19.4, cy: 4.6, r: 1.15, className: 'fill-flame-mid' },
      { cx: 4.6, cy: 6.4, r: 0.8, className: 'fill-flame-mid opacity-75' },
      { cx: 17, cy: 1.6, r: 0.6, className: 'fill-flame-mid opacity-60' },
    ]);
    expect(BLAZE_SPARKS.open).toEqual([{ cx: 19.4, cy: 4.6, r: 1.15, className: 'fill-accent' }]);
    expect(BLAZE_SPARKS.out).toEqual([]);
  });
});

describe('BONFIRE_PLACEMENTS', () => {
  it('tilts a small flame left, a smaller one right, and stands the tallest in the middle', () => {
    expect(BONFIRE_PLACEMENTS).toEqual([
      'translate(-1.6 8.4) rotate(-12 12 22) scale(.62)',
      'translate(10.6 9.6) rotate(12 12 22) scale(.56)',
      'translate(1 .6) scale(.92)',
    ]);
  });
});

describe('the glow and the flicker', () => {
  it('glows only once today counts', () => {
    expect(FLAME_GLOW_CLASS).toEqual({
      counted: 'drop-shadow-[0_0_3px_var(--color-flame-glow)]',
      open: '',
      out: '',
    });
  });

  it('flickers the bonfire from its base only once today counts, and never under reduced motion', () => {
    expect(BONFIRE_FLICKER_CLASS).toEqual({
      counted: 'origin-bottom motion-safe:animate-flame-flicker',
      open: '',
      out: '',
    });
  });
});

describe('FLAME_MARK_PIXELS', () => {
  it('sizes a member row, a chip and the sheet hero', () => {
    expect(FLAME_MARK_PIXELS).toEqual({ sm: 20, md: 24, lg: 40 });
  });
});

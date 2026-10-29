export type FlameTone = 'counted' | 'open' | 'out';

export type FlameLayer = 'outer' | 'middle' | 'core';

export type FlameMarkSize = 'sm' | 'md' | 'lg';

export interface FlameLayerPaint {
  readonly layer: FlameLayer;
  readonly className: string;
}

export interface FlameSpark {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly className: string;
}

export const FLAME_MARK_PIXELS: Readonly<Record<FlameMarkSize, number>> = {
  sm: 20,
  md: 24,
  lg: 40,
};

export const FLAME_LAYER_PATHS: Readonly<Record<FlameLayer, string>> = {
  outer:
    'M12 1.8c.8 3.4 3.4 5.4 5 7.7 1.2 1.7 1.8 3.4 1.8 5.3A6.8 6.8 0 0 1 12 21.8a6.8 6.8 0 0 1-6.8-6.9c0-2.6 1.2-4.6 2.9-6.1.1 1.8.9 3 2.1 3.6-.4-3.2.4-6.4 1.8-10.6z',
  middle:
    'M12 7.6c.6 2.4 2.3 3.8 3.3 5.4.7 1.1 1 2.2 1 3.4a4.3 4.3 0 0 1-8.6 0c0-1.7.8-3 1.9-4 .1 1 .5 1.8 1.2 2.2-.2-2.2.3-4.4 1.2-7z',
  core: 'M12 12.6c.4 1.4 1.3 2.3 1.9 3.2.4.6.6 1.2.6 1.9a2.5 2.5 0 0 1-5 0c0-1 .5-1.8 1.1-2.4.1.6.3 1 .7 1.2-.1-1.3.2-2.6.7-3.9z',
};

// @FollowsBlueprint utils-pure-module
export const FLAME_LAYERS: Readonly<Record<FlameTone, readonly FlameLayerPaint[]>> = {
  counted: [
    { layer: 'outer', className: 'fill-flame-deep' },
    { layer: 'middle', className: 'fill-flame-mid' },
    { layer: 'core', className: 'fill-flame-core' },
  ],
  open: [
    { layer: 'outer', className: 'fill-accent-soft stroke-accent' },
    { layer: 'core', className: 'fill-accent opacity-55' },
  ],
  out: [{ layer: 'outer', className: 'fill-none stroke-ink-faint' }],
};

export const BLAZE_SPARKS: Readonly<Record<FlameTone, readonly FlameSpark[]>> = {
  counted: [
    { cx: 19.4, cy: 4.6, r: 1.15, className: 'fill-flame-mid' },
    { cx: 4.6, cy: 6.4, r: 0.8, className: 'fill-flame-mid opacity-75' },
    { cx: 17, cy: 1.6, r: 0.6, className: 'fill-flame-mid opacity-60' },
  ],
  open: [{ cx: 19.4, cy: 4.6, r: 1.15, className: 'fill-accent' }],
  out: [],
};

export const BONFIRE_PLACEMENTS: readonly string[] = [
  'translate(-1.6 8.4) rotate(-12 12 22) scale(.62)',
  'translate(10.6 9.6) rotate(12 12 22) scale(.56)',
  'translate(1 .6) scale(.92)',
];

export const FLAME_GLOW_CLASS: Readonly<Record<FlameTone, string>> = {
  counted: 'drop-shadow-[0_0_3px_var(--color-flame-glow)]',
  open: '',
  out: '',
};

export const BONFIRE_FLICKER_CLASS: Readonly<Record<FlameTone, string>> = {
  counted: 'origin-bottom motion-safe:animate-flame-flicker',
  open: '',
  out: '',
};

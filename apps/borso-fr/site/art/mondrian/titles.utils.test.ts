import { describe, expect, it } from 'vitest';
import { PALETTES } from './palettes.utils';
import { colorize, generateLayout } from './painting.utils';
import { buildTitle, dominantColorName, pickFromNonEmptyList } from './titles.utils';

const TITLE_PATTERN = /^A (\w+) (\w+) in (\w+)$/;

function rectsForSeed(seed: number, palette = PALETTES.classic) {
  const layout = generateLayout({ seed, complexity: 22 });
  return colorize(layout, { seed, palette, balance: 0.5 });
}

describe('pickFromNonEmptyList', () => {
  const flowers = ['rose', 'daisy', 'iris', 'tulip'] as const;

  it('returns the element at the index implied by nextRandom', () => {
    expect(pickFromNonEmptyList(flowers, () => 0)).toBe('rose');
    expect(pickFromNonEmptyList(flowers, () => 0.99)).toBe('tulip');
  });

  it('handles a single-element list (covers the cursor === 0 branch on the first iteration)', () => {
    expect(pickFromNonEmptyList(['only'] as const, () => 0)).toBe('only');
    expect(pickFromNonEmptyList(['only'] as const, () => 0.5)).toBe('only');
  });

  it('iterates past earlier elements before matching the target index', () => {
    expect(pickFromNonEmptyList(flowers, () => 0.5)).toBe('iris');
  });
});

describe('buildTitle', () => {
  it('matches the canonical "A {adjective} {noun} in {colour}" shape', () => {
    const seed = 0xdeadbeef;
    const title = buildTitle(seed, rectsForSeed(seed), PALETTES.classic);
    expect(title).toMatch(TITLE_PATTERN);
  });

  it('is deterministic for a fixed seed + palette + rects', () => {
    const seed = 0x12345678;
    const rects = rectsForSeed(seed);
    expect(buildTitle(seed, rects, PALETTES.classic)).toBe(
      buildTitle(seed, rects, PALETTES.classic),
    );
  });

  it('changes when the seed changes', () => {
    const titleA = buildTitle(1, rectsForSeed(1), PALETTES.classic);
    const titleB = buildTitle(2, rectsForSeed(2), PALETTES.classic);
    expect(titleA).not.toBe(titleB);
  });

  it('uses a colour name from the active palette', () => {
    const seed = 0xc0ffee;
    const title = buildTitle(seed, rectsForSeed(seed, PALETTES.muted), PALETTES.muted);
    const lowerNames = PALETTES.muted.fills.map((fill) => fill.name.toLowerCase());
    const colourMatch = title.match(TITLE_PATTERN);
    expect(colourMatch).not.toBeNull();
    expect(lowerNames).toContain(colourMatch?.[3]);
  });
});

describe('dominantColorName', () => {
  it('returns the largest non-neutral fill', () => {
    const palette = {
      label: 'Mini',
      bg: '#ffffff',
      line: '#000000',
      fills: [
        { name: 'Cobalt', hex: '#1e4fb6' },
        { name: 'Vermillion', hex: '#d8332a' },
      ],
    };
    const smallCobaltRect = {
      x: 0, y: 0, width: 0.1, height: 0.1, depth: 0, id: 0,
      fill: '#1e4fb6', fillName: 'Cobalt',
    };
    const largeVermillionRect = {
      x: 0.1, y: 0, width: 0.9, height: 1, depth: 0, id: 1,
      fill: '#d8332a', fillName: 'Vermillion',
    };
    expect(dominantColorName([smallCobaltRect, largeVermillionRect], palette)).toBe('Vermillion');
  });

  it('skips the neutral background even when it is the largest fill', () => {
    const palette = {
      label: 'Tiny',
      bg: '#fafafa',
      line: '#000000',
      fills: [
        { name: 'Vermillion', hex: '#d8332a' },
        { name: 'Ivory', hex: '#fafafa' },
      ],
    };
    const largeIvoryRect = {
      x: 0, y: 0, width: 0.99, height: 1, depth: 0, id: 0,
      fill: '#fafafa', fillName: 'Ivory',
    };
    const smallVermillionRect = {
      x: 0.99, y: 0, width: 0.01, height: 1, depth: 0, id: 1,
      fill: '#d8332a', fillName: 'Vermillion',
    };
    expect(dominantColorName([largeIvoryRect, smallVermillionRect], palette)).toBe('Vermillion');
  });

  it('skips the line colour even when it is dominant', () => {
    const palette = {
      label: 'Lined',
      bg: '#ffffff',
      line: '#101010',
      fills: [
        { name: 'Onyx', hex: '#101010' },
        { name: 'Saffron', hex: '#f5c518' },
      ],
    };
    const largeOnyxRect = {
      x: 0, y: 0, width: 0.9, height: 1, depth: 0, id: 0,
      fill: '#101010', fillName: 'Onyx',
    };
    const smallSaffronRect = {
      x: 0.9, y: 0, width: 0.1, height: 1, depth: 0, id: 1,
      fill: '#f5c518', fillName: 'Saffron',
    };
    expect(dominantColorName([largeOnyxRect, smallSaffronRect], palette)).toBe('Saffron');
  });

  it('aggregates multiple rects with the same fill', () => {
    const palette = {
      label: 'Stacked',
      bg: '#ffffff',
      line: '#000000',
      fills: [
        { name: 'Cobalt', hex: '#1e4fb6' },
        { name: 'Vermillion', hex: '#d8332a' },
      ],
    };
    const cobaltA = {
      x: 0, y: 0, width: 0.4, height: 0.5, depth: 0, id: 0,
      fill: '#1e4fb6', fillName: 'Cobalt',
    };
    const cobaltB = {
      x: 0.4, y: 0, width: 0.4, height: 0.5, depth: 0, id: 1,
      fill: '#1e4fb6', fillName: 'Cobalt',
    };
    const vermillion = {
      x: 0, y: 0.5, width: 0.6, height: 0.5, depth: 0, id: 2,
      fill: '#d8332a', fillName: 'Vermillion',
    };
    expect(dominantColorName([cobaltA, cobaltB, vermillion], palette)).toBe('Cobalt');
  });

  it('falls back to the first palette fill when no non-neutral rects exist', () => {
    const monochromePalette = {
      label: 'Mono',
      bg: '#aaaaaa',
      line: '#aaaaaa',
      fills: [{ name: 'Smoke', hex: '#aaaaaa' }],
    };
    const layout = generateLayout({ seed: 1, complexity: 12 });
    const rects = colorize(layout, { seed: 1, palette: monochromePalette, balance: 0.5 });
    expect(dominantColorName(rects, monochromePalette)).toBe('Smoke');
  });

  it('falls back to "colour" when the palette has no fills at all', () => {
    const emptyPalette = { label: 'Empty', bg: '#000000', line: '#ffffff', fills: [] };
    expect(dominantColorName([], emptyPalette)).toBe('colour');
  });
});

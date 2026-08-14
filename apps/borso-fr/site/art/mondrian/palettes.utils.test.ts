import { describe, expect, it } from 'vitest';
import {
  buildCustomPalette,
  CUSTOM_DEFAULTS,
  type CustomColors,
  isPaletteKey,
  listDistinctFills,
  type Palette,
  PALETTES,
  type PaletteKey,
  selectPalette,
} from './palettes.utils';

// @FollowsBlueprint test-pure-unit
describe('PALETTES', () => {
  it('is keyed by every PaletteKey except "custom"', () => {
    const paletteKeys: Exclude<PaletteKey, 'custom'>[] = ['classic', 'muted', 'nocturne', 'garden'];
    for (const paletteKey of paletteKeys) {
      expect(PALETTES[paletteKey]).toBeDefined();
      expect(PALETTES[paletteKey].fills.length).toBeGreaterThan(0);
    }
  });

  it('uses lowercase hex strings for every fill', () => {
    const presetKeys: Exclude<PaletteKey, 'custom'>[] = ['classic', 'muted', 'nocturne', 'garden'];
    for (const paletteKey of presetKeys) {
      for (const fill of PALETTES[paletteKey].fills) {
        expect(fill.hex).toMatch(/^#[0-9a-f]{6}$/);
        expect(fill.nameKey.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('buildCustomPalette', () => {
  it('builds a palette mirroring the provided custom colours', () => {
    const customColors: CustomColors = {
      customColor1: '#aa0000',
      customColor2: '#00aa00',
      customColor3: '#0000aa',
      customPaper: '#fafafa',
      customInk: '#111111',
    };
    const palette = buildCustomPalette(customColors);
    expect(palette.bg).toBe('#fafafa');
    expect(palette.line).toBe('#111111');
    expect(palette.fills.map((fill) => fill.hex)).toStrictEqual([
      '#aa0000',
      '#00aa00',
      '#0000aa',
      '#fafafa',
      '#fafafa',
      '#111111',
    ]);
    expect(palette.fills.map((fill) => fill.nameKey)).toStrictEqual([
      'mondrian.custom-colour.colour-one',
      'mondrian.custom-colour.colour-two',
      'mondrian.custom-colour.colour-three',
      'mondrian.custom-colour.paper',
      'mondrian.custom-colour.paper',
      'mondrian.custom-colour.ink',
    ]);
  });

  it('builds a palette from CUSTOM_DEFAULTS without throwing', () => {
    const palette = buildCustomPalette(CUSTOM_DEFAULTS);
    expect(palette.fills).toHaveLength(6);
  });
});

describe('isPaletteKey', () => {
  it.each(['classic', 'muted', 'nocturne', 'garden', 'custom'])('accepts "%s"', (paletteKey) => {
    expect(isPaletteKey(paletteKey)).toBe(true);
  });

  it.each(['', 'CLASSIC', 'rainbow', 'fluorescent', '?'])('rejects "%s"', (candidate) => {
    expect(isPaletteKey(candidate)).toBe(false);
  });
});

describe('selectPalette', () => {
  it('builds the custom palette from the reader colours', () => {
    expect(selectPalette('custom', CUSTOM_DEFAULTS).bg).toBe(CUSTOM_DEFAULTS.customPaper);
  });

  it.each(['classic', 'muted', 'nocturne', 'garden'] as const)(
    'returns the "%s" preset unchanged',
    (paletteKey) => {
      expect(selectPalette(paletteKey, CUSTOM_DEFAULTS)).toBe(PALETTES[paletteKey]);
    },
  );
});

describe('listDistinctFills', () => {
  it('drops the repeated fill a preset uses to weight a colour', () => {
    const fills = listDistinctFills(PALETTES.classic);
    expect(fills.map((fill) => fill.hex)).toStrictEqual([
      '#d8332a',
      '#1e4fb6',
      '#f5c518',
      '#fafafa',
      '#1a1714',
    ]);
  });

  it('keeps every fill when they are already distinct', () => {
    const palette: Palette = {
      bg: '#000000',
      line: '#ffffff',
      fills: [
        { nameKey: 'mondrian.colour.moss', hex: '#111111' },
        { nameKey: 'mondrian.colour.plum', hex: '#222222' },
      ],
    };
    expect(listDistinctFills(palette)).toHaveLength(2);
  });
});

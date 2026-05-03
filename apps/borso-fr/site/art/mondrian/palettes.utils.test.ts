import { describe, expect, it } from 'vitest';
import {
  buildCustomPalette,
  CUSTOM_DEFAULTS,
  isPaletteKey,
  PALETTES,
  type CustomColors,
  type PaletteKey,
} from './palettes.utils';

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
        expect(fill.name.length).toBeGreaterThan(0);
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
    expect(palette.label).toBe('Custom');
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
    expect(palette.fills.map((fill) => fill.name)).toStrictEqual([
      'Color 1',
      'Color 2',
      'Color 3',
      'Paper',
      'Paper',
      'Ink',
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

import type { TranslationKey } from '../../i18n/i18n.utils';

export interface PaletteFill {
  nameKey: TranslationKey;
  hex: string;
}

export interface Palette {
  bg: string;
  line: string;
  fills: PaletteFill[];
}

export type PaletteKey = 'classic' | 'muted' | 'nocturne' | 'garden' | 'custom';

const PALETTE_KEYS: ReadonlySet<unknown> = new Set([
  'classic',
  'muted',
  'nocturne',
  'garden',
  'custom',
]);

export const PALETTES: Record<Exclude<PaletteKey, 'custom'>, Palette> = {
  classic: {
    bg: '#fafafa',
    line: '#1a1714',
    fills: [
      { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
      { nameKey: 'mondrian.colour.cobalt', hex: '#1e4fb6' },
      { nameKey: 'mondrian.colour.saffron', hex: '#f5c518' },
      { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
      { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
      { nameKey: 'mondrian.colour.onyx', hex: '#1a1714' },
    ],
  },
  muted: {
    bg: '#efe6d4',
    line: '#2c2620',
    fills: [
      { nameKey: 'mondrian.colour.terracotta', hex: '#b85b46' },
      { nameKey: 'mondrian.colour.slate', hex: '#4a6b80' },
      { nameKey: 'mondrian.colour.ochre', hex: '#d8a23a' },
      { nameKey: 'mondrian.colour.bone', hex: '#efe6d4' },
      { nameKey: 'mondrian.colour.bone', hex: '#efe6d4' },
      { nameKey: 'mondrian.colour.espresso', hex: '#2c2620' },
    ],
  },
  nocturne: {
    bg: '#1a1714',
    line: '#f0e8d6',
    fills: [
      { nameKey: 'mondrian.colour.ember', hex: '#e85a3c' },
      { nameKey: 'mondrian.colour.indigo', hex: '#3a5fc8' },
      { nameKey: 'mondrian.colour.citrine', hex: '#e8c84a' },
      { nameKey: 'mondrian.colour.pearl', hex: '#e8e0cc' },
      { nameKey: 'mondrian.colour.ink', hex: '#1a1714' },
      { nameKey: 'mondrian.colour.ink', hex: '#1a1714' },
    ],
  },
  garden: {
    bg: '#f4ede0',
    line: '#1c2a22',
    fills: [
      { nameKey: 'mondrian.colour.moss', hex: '#5a7548' },
      { nameKey: 'mondrian.colour.plum', hex: '#7c3a5e' },
      { nameKey: 'mondrian.colour.goldenrod', hex: '#d4a02e' },
      { nameKey: 'mondrian.colour.linen', hex: '#f4ede0' },
      { nameKey: 'mondrian.colour.linen', hex: '#f4ede0' },
      { nameKey: 'mondrian.colour.charcoal', hex: '#1c2a22' },
    ],
  },
};

export interface CustomColors {
  customColor1: string;
  customColor2: string;
  customColor3: string;
  customPaper: string;
  customInk: string;
}

export const CUSTOM_DEFAULTS: CustomColors = {
  customColor1: '#e94e3b',
  customColor2: '#2d6cdf',
  customColor3: '#f6c945',
  customPaper: '#fafafa',
  customInk: '#1a1714',
};

export function buildCustomPalette(customColors: CustomColors): Palette {
  return {
    bg: customColors.customPaper,
    line: customColors.customInk,
    fills: [
      { nameKey: 'mondrian.custom-colour.colour-one', hex: customColors.customColor1 },
      { nameKey: 'mondrian.custom-colour.colour-two', hex: customColors.customColor2 },
      { nameKey: 'mondrian.custom-colour.colour-three', hex: customColors.customColor3 },
      { nameKey: 'mondrian.custom-colour.paper', hex: customColors.customPaper },
      { nameKey: 'mondrian.custom-colour.paper', hex: customColors.customPaper },
      { nameKey: 'mondrian.custom-colour.ink', hex: customColors.customInk },
    ],
  };
}

export function isPaletteKey(value: unknown): value is PaletteKey {
  return PALETTE_KEYS.has(value);
}

// @FollowsBlueprint utils-pure-module
export function selectPalette(paletteKey: PaletteKey, customColors: CustomColors): Palette {
  if (paletteKey === 'custom') return buildCustomPalette(customColors);
  return PALETTES[paletteKey];
}

export function listDistinctFills(palette: Palette): readonly PaletteFill[] {
  return palette.fills.filter(
    (fill, index, allFills) => allFills.findIndex((other) => other.hex === fill.hex) === index,
  );
}

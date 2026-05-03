type PaletteFill = { name: string; hex: string };

export type Palette = {
  label: string;
  bg: string;
  line: string;
  fills: PaletteFill[];
};

export type PaletteKey = 'classic' | 'muted' | 'nocturne' | 'garden' | 'custom';

const PALETTE_KEYS: ReadonlySet<string> = new Set([
  'classic',
  'muted',
  'nocturne',
  'garden',
  'custom',
]);

export const PALETTES: Record<Exclude<PaletteKey, 'custom'>, Palette> = {
  classic: {
    label: 'Classique',
    bg: '#fafafa',
    line: '#1a1714',
    fills: [
      { name: 'Vermillion', hex: '#d8332a' },
      { name: 'Cobalt', hex: '#1e4fb6' },
      { name: 'Saffron', hex: '#f5c518' },
      { name: 'Ivory', hex: '#fafafa' },
      { name: 'Ivory', hex: '#fafafa' },
      { name: 'Onyx', hex: '#1a1714' },
    ],
  },
  muted: {
    label: 'Muted',
    bg: '#efe6d4',
    line: '#2c2620',
    fills: [
      { name: 'Terracotta', hex: '#b85b46' },
      { name: 'Slate', hex: '#4a6b80' },
      { name: 'Ochre', hex: '#d8a23a' },
      { name: 'Bone', hex: '#efe6d4' },
      { name: 'Bone', hex: '#efe6d4' },
      { name: 'Espresso', hex: '#2c2620' },
    ],
  },
  nocturne: {
    label: 'Nocturne',
    bg: '#1a1714',
    line: '#f0e8d6',
    fills: [
      { name: 'Ember', hex: '#e85a3c' },
      { name: 'Indigo', hex: '#3a5fc8' },
      { name: 'Citrine', hex: '#e8c84a' },
      { name: 'Pearl', hex: '#e8e0cc' },
      { name: 'Ink', hex: '#1a1714' },
      { name: 'Ink', hex: '#1a1714' },
    ],
  },
  garden: {
    label: 'Garden',
    bg: '#f4ede0',
    line: '#1c2a22',
    fills: [
      { name: 'Moss', hex: '#5a7548' },
      { name: 'Plum', hex: '#7c3a5e' },
      { name: 'Goldenrod', hex: '#d4a02e' },
      { name: 'Linen', hex: '#f4ede0' },
      { name: 'Linen', hex: '#f4ede0' },
      { name: 'Charcoal', hex: '#1c2a22' },
    ],
  },
};

export type CustomColors = {
  customColor1: string;
  customColor2: string;
  customColor3: string;
  customPaper: string;
  customInk: string;
};

export const CUSTOM_DEFAULTS: CustomColors = {
  customColor1: '#e94e3b',
  customColor2: '#2d6cdf',
  customColor3: '#f6c945',
  customPaper: '#fafafa',
  customInk: '#1a1714',
};

export function buildCustomPalette(c: CustomColors): Palette {
  return {
    label: 'Custom',
    bg: c.customPaper,
    line: c.customInk,
    fills: [
      { name: 'Color 1', hex: c.customColor1 },
      { name: 'Color 2', hex: c.customColor2 },
      { name: 'Color 3', hex: c.customColor3 },
      { name: 'Paper', hex: c.customPaper },
      { name: 'Paper', hex: c.customPaper },
      { name: 'Ink', hex: c.customInk },
    ],
  };
}

export function isPaletteKey(value: string): value is PaletteKey {
  return PALETTE_KEYS.has(value);
}

type PaperTheme = { paper: string; paperDeep: string; ink: string; inkSoft: string; ruleAlpha: string };

const PAPER_THEMES: Record<Exclude<PaletteKey, 'custom'>, PaperTheme> = {
  classic: {
    paper: '#f4ede0',
    paperDeep: '#ebe2d1',
    ink: '#1a1714',
    inkSoft: '#2c2620',
    ruleAlpha: '26,23,20',
  },
  muted: {
    paper: '#efe6d4',
    paperDeep: '#e3d8c1',
    ink: '#2c2620',
    inkSoft: '#4a3f33',
    ruleAlpha: '44,38,32',
  },
  nocturne: {
    paper: '#1f1c18',
    paperDeep: '#15130f',
    ink: '#f0e8d6',
    inkSoft: '#cdc4b0',
    ruleAlpha: '240,232,214',
  },
  garden: {
    paper: '#f4ede0',
    paperDeep: '#e8dec8',
    ink: '#1c2a22',
    inkSoft: '#3a4a3f',
    ruleAlpha: '28,42,34',
  },
};

export function applyPaperTheme(key: PaletteKey): void {
  const theme = key === 'custom' ? PAPER_THEMES.classic : PAPER_THEMES[key];
  const root = document.documentElement.style;
  root.setProperty('--paper', theme.paper);
  root.setProperty('--paper-deep', theme.paperDeep);
  root.setProperty('--ink', theme.ink);
  root.setProperty('--ink-soft', theme.inkSoft);
  root.setProperty('--rule', `rgba(${theme.ruleAlpha},0.18)`);
  root.setProperty('--rule-strong', `rgba(${theme.ruleAlpha},0.42)`);
}

import type { PaletteKey } from './palettes.utils';

type PaperTheme = {
  paper: string;
  paperDeep: string;
  ink: string;
  inkSoft: string;
  ruleAlpha: string;
};

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

import type { TranslationKey } from '../../i18n/i18n.utils';
import type { AnimationMode } from './animation.core';
import type { CustomColors, PaletteKey } from './palettes.utils';

const PALETTE_LABEL_KEY: Readonly<Record<PaletteKey, TranslationKey>> = {
  classic: 'mondrian.palette.classic',
  muted: 'mondrian.palette.muted',
  nocturne: 'mondrian.palette.nocturne',
  garden: 'mondrian.palette.garden',
  custom: 'mondrian.palette.custom',
};

export const PALETTE_KEY_LIST: readonly PaletteKey[] = [
  'classic',
  'muted',
  'nocturne',
  'garden',
  'custom',
];

export function selectPaletteLabelKey(paletteKey: PaletteKey): TranslationKey {
  return PALETTE_LABEL_KEY[paletteKey];
}

const ANIMATION_LABEL_KEY: Readonly<Record<AnimationMode, TranslationKey>> = {
  still: 'mondrian.animation.still',
  drift: 'mondrian.animation.drift',
  breathe: 'mondrian.animation.breathe',
  cascade: 'mondrian.animation.cascade',
};

export function selectAnimationLabelKey(mode: AnimationMode): TranslationKey {
  return ANIMATION_LABEL_KEY[mode];
}

const RAIL_LABEL_KEY: Readonly<Record<`${boolean}`, TranslationKey>> = {
  true: 'mondrian.rail.close',
  false: 'mondrian.rail.open',
};

export function selectRailToggleLabelKey(isRailOpen: boolean): TranslationKey {
  return RAIL_LABEL_KEY[`${isRailOpen}`];
}

const RAIL_CLASS_NAME: Readonly<Record<`${boolean}`, string>> = {
  true: 'rail open',
  false: 'rail',
};

export function selectRailClassName(isRailOpen: boolean): string {
  return RAIL_CLASS_NAME[`${isRailOpen}`];
}

export type CustomColorSlot = keyof CustomColors;

export interface CustomColorSlotDescriptor {
  slot: CustomColorSlot;
  nameKey: TranslationKey;
}

export const CUSTOM_COLOR_SLOTS: readonly CustomColorSlotDescriptor[] = [
  { slot: 'customColor1', nameKey: 'mondrian.custom-colour.colour-one' },
  { slot: 'customColor2', nameKey: 'mondrian.custom-colour.colour-two' },
  { slot: 'customColor3', nameKey: 'mondrian.custom-colour.colour-three' },
  { slot: 'customPaper', nameKey: 'mondrian.custom-colour.paper' },
  { slot: 'customInk', nameKey: 'mondrian.custom-colour.ink' },
];

const CUSTOM_PALETTE_KEY: PaletteKey = 'custom';

export type SwatchRowKind = 'editable' | 'read-only';

export function selectSwatchRowKind(paletteKey: PaletteKey): SwatchRowKind {
  if (paletteKey === CUSTOM_PALETTE_KEY) return 'editable';
  return 'read-only';
}

const WORK_NUMBER_MODULUS = 9999;
const WORK_NUMBER_DIGITS = 4;

export function formatWorkNumber(seed: number): string {
  return `№ ${(seed % WORK_NUMBER_MODULUS).toString().padStart(WORK_NUMBER_DIGITS, '0')}`;
}

const PERCENTAGE_SCALE = 100;

export function formatBalancePercentage(balance: number): number {
  return Math.round(balance * PERCENTAGE_SCALE);
}

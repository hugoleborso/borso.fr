import { isPaletteKey, type PaletteKey } from './palettes.utils';

type UrlState = { seed: number; paletteKey: PaletteKey };

const SEED_HEX_LENGTH = 8;
const SEED_RADIX = 16;
const MAX_SEED = 0xffffffff;
const SEED_HEX_PATTERN = /^[0-9a-fA-F]{1,8}$/;

export function freshSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED + 1));
}

export function seedToHex(seed: number): string {
  return (seed >>> 0).toString(SEED_RADIX).padStart(SEED_HEX_LENGTH, '0').toUpperCase();
}

function parseSeedHex(input: string | null): number | null {
  if (input === null || input === '') return null;
  if (!SEED_HEX_PATTERN.test(input)) return null;
  return Number.parseInt(input, SEED_RADIX) >>> 0;
}

export function readUrlState(search: string, defaults: { paletteKey: PaletteKey }): UrlState {
  const params = new URLSearchParams(search);
  const parsedSeed = parseSeedHex(params.get('seed'));
  const paletteParam = params.get('palette');
  const paletteKey = paletteParam !== null && isPaletteKey(paletteParam) ? paletteParam : defaults.paletteKey;
  return {
    seed: parsedSeed ?? freshSeed(),
    paletteKey,
  };
}

export function buildSearch(state: UrlState): string {
  const params = new URLSearchParams();
  params.set('seed', seedToHex(state.seed));
  params.set('palette', state.paletteKey);
  return `?${params.toString()}`;
}

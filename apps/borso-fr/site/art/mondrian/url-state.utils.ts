import { isPaletteKey, type PaletteKey } from './palettes.utils';

export interface UrlState {
  seed: number;
  paletteKey: PaletteKey;
}

const SEED_HEX_LENGTH = 8;
const SEED_RADIX = 16;
const MAX_SEED = 0xffffffff;
const SEED_HEX_PATTERN = /^[0-9a-fA-F]+$/;

/**
 * Randomness is an argument, so the seed picker stays pure and stays under the
 * coverage and mutation gates. Callers pass `Math.random()`.
 */
export function freshSeed(randomUnitInterval: number): number {
  return Math.floor(randomUnitInterval * (MAX_SEED + 1));
}

export function seedToHex(seed: number): string {
  return (seed >>> 0).toString(SEED_RADIX).padStart(SEED_HEX_LENGTH, '0').toUpperCase();
}

/** A seed is a 32-bit number, so its hexadecimal form is at most eight digits. */
export function isSeedHex(candidate: string): boolean {
  return candidate.length <= SEED_HEX_LENGTH && SEED_HEX_PATTERN.test(candidate);
}

function parseSeedHex(input: string | null): number | null {
  if (input === null || !isSeedHex(input)) return null;
  return Number.parseInt(input, SEED_RADIX) >>> 0;
}

export function readUrlState(
  search: string,
  defaults: { paletteKey: PaletteKey; fallbackSeed: number },
): UrlState {
  const params = new URLSearchParams(search);
  const paletteParam = params.get('palette');
  return {
    seed: parseSeedHex(params.get('seed')) ?? defaults.fallbackSeed,
    paletteKey: isPaletteKey(paletteParam) ? paletteParam : defaults.paletteKey,
  };
}

export function buildSearch(state: UrlState): string {
  const params = new URLSearchParams();
  params.set('seed', seedToHex(state.seed));
  params.set('palette', state.paletteKey);
  return `?${params.toString()}`;
}

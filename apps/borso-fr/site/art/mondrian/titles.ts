import { mulberry32, type ColoredRect } from './painting';
import type { Palette } from './palettes';

const ADJECTIVES = [
  'quiet',
  'restless',
  'bright',
  'hushed',
  'slow',
  'sudden',
  'careful',
  'generous',
  'brief',
  'patient',
];

const NOUNS = ['study', 'song', 'gesture', 'conversation', 'breath', 'argument'];

const TITLE_SEED_MIX = 0x85ebca6b;
const FALLBACK_ADJECTIVE = 'quiet';
const FALLBACK_NOUN = 'study';
const FALLBACK_COLOR_NAME = 'colour';

function pickByRandom<Item>(nextRandom: () => number, list: readonly Item[], fallback: Item): Item {
  if (list.length === 0) return fallback;
  return list[Math.floor(nextRandom() * list.length)] ?? fallback;
}

export function buildTitle(seed: number, rects: ColoredRect[], palette: Palette): string {
  const nextRandom = mulberry32(seed ^ TITLE_SEED_MIX);
  const adjective = pickByRandom(nextRandom, ADJECTIVES, FALLBACK_ADJECTIVE);
  const noun = pickByRandom(nextRandom, NOUNS, FALLBACK_NOUN);
  const colorName = dominantColorName(rects, palette);
  return `A ${adjective} ${noun} in ${colorName.toLowerCase()}`;
}

type ColorTotal = { totalArea: number; name: string };

function dominantColorName(rects: ColoredRect[], palette: Palette): string {
  const neutralHex = palette.bg.toLowerCase();
  const lineHex = palette.line.toLowerCase();
  const totalsByColor = new Map<string, ColorTotal>();

  for (const rect of rects) {
    const fillHex = rect.fill.toLowerCase();
    if (fillHex === neutralHex || fillHex === lineHex) continue;
    const previous = totalsByColor.get(fillHex);
    const area = rect.width * rect.height;
    if (previous) {
      previous.totalArea += area;
    } else {
      totalsByColor.set(fillHex, { totalArea: area, name: rect.fillName });
    }
  }

  let dominantName = palette.fills[0]?.name ?? FALLBACK_COLOR_NAME;
  let dominantArea = -1;
  for (const entry of totalsByColor.values()) {
    if (entry.totalArea > dominantArea) {
      dominantArea = entry.totalArea;
      dominantName = entry.name;
    }
  }
  return dominantName;
}

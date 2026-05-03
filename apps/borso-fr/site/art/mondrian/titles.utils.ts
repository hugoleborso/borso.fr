import type { Palette } from './palettes.utils';
import { mulberry32, type ColoredRect } from './painting.utils';

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
] as const;

const NOUNS = ['study', 'song', 'gesture', 'conversation', 'breath', 'argument'] as const;

const TITLE_SEED_MIX = 0x85ebca6b;
const FALLBACK_COLOR_NAME = 'colour';

type NonEmptyArray<Element> = readonly [Element, ...Element[]];

export function pickFromNonEmptyList<Element>(
  list: NonEmptyArray<Element>,
  nextRandom: () => number,
): Element {
  const targetIndex = Math.floor(nextRandom() * list.length);
  let pickedElement: Element = list[0];
  let cursor = 0;
  for (const element of list) {
    if (cursor === targetIndex) {
      pickedElement = element;
      break;
    }
    cursor++;
  }
  return pickedElement;
}

export function buildTitle(seed: number, rects: ColoredRect[], palette: Palette): string {
  const nextRandom = mulberry32(seed ^ TITLE_SEED_MIX);
  const adjective = pickFromNonEmptyList(ADJECTIVES, nextRandom);
  const noun = pickFromNonEmptyList(NOUNS, nextRandom);
  const dominantColor = dominantColorName(rects, palette);
  return `A ${adjective} ${noun} in ${dominantColor.toLowerCase()}`;
}

type ColorTotal = { totalArea: number; colorName: string };

export function dominantColorName(rects: ColoredRect[], palette: Palette): string {
  const neutralHex = palette.bg.toLowerCase();
  const lineHex = palette.line.toLowerCase();
  const totalsByColor = new Map<string, ColorTotal>();

  for (const rect of rects) {
    const fillHex = rect.fill.toLowerCase();
    if (fillHex === neutralHex || fillHex === lineHex) continue;
    const existingTotal = totalsByColor.get(fillHex);
    const rectArea = rect.width * rect.height;
    if (existingTotal) {
      existingTotal.totalArea += rectArea;
    } else {
      totalsByColor.set(fillHex, { totalArea: rectArea, colorName: rect.fillName });
    }
  }

  const firstFill = palette.fills[0];
  let dominantName = firstFill !== undefined ? firstFill.name : FALLBACK_COLOR_NAME;
  let dominantArea = -1;
  for (const colorTotal of totalsByColor.values()) {
    if (colorTotal.totalArea > dominantArea) {
      dominantArea = colorTotal.totalArea;
      dominantName = colorTotal.colorName;
    }
  }
  return dominantName;
}

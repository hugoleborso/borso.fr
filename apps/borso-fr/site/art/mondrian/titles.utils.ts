import type { TranslationKey } from '../../i18n/i18n.utils';
import { type ColoredRect, mulberry32 } from './painting.utils';
import type { Palette } from './palettes.utils';

/** Resolves a catalogue key, interpolating the placeholders its value carries. */
export type TitleTranslator = (
  key: TranslationKey,
  interpolations?: Readonly<Record<string, string>>,
) => string;

type GrammaticalGender = 'masculine' | 'feminine';

/**
 * One key per gender, so the only way to reach an adjective form is through the
 * gender of the noun that governs it. "Une étude généreux" cannot be built.
 */
type TitleAdjective = Readonly<Record<GrammaticalGender, TranslationKey>>;

interface TitleNoun {
  gender: GrammaticalGender;
  phraseKey: TranslationKey;
}

type NonEmptyArray<Element> = readonly [Element, ...Element[]];

export const TITLE_ADJECTIVES: NonEmptyArray<TitleAdjective> = [
  {
    masculine: 'mondrian.artwork-title.adjective.quiet.masculine',
    feminine: 'mondrian.artwork-title.adjective.quiet.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.restless.masculine',
    feminine: 'mondrian.artwork-title.adjective.restless.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.bright.masculine',
    feminine: 'mondrian.artwork-title.adjective.bright.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.hushed.masculine',
    feminine: 'mondrian.artwork-title.adjective.hushed.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.slow.masculine',
    feminine: 'mondrian.artwork-title.adjective.slow.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.sudden.masculine',
    feminine: 'mondrian.artwork-title.adjective.sudden.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.careful.masculine',
    feminine: 'mondrian.artwork-title.adjective.careful.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.generous.masculine',
    feminine: 'mondrian.artwork-title.adjective.generous.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.brief.masculine',
    feminine: 'mondrian.artwork-title.adjective.brief.feminine',
  },
  {
    masculine: 'mondrian.artwork-title.adjective.patient.masculine',
    feminine: 'mondrian.artwork-title.adjective.patient.feminine',
  },
];

export const TITLE_NOUNS: NonEmptyArray<TitleNoun> = [
  { gender: 'feminine', phraseKey: 'mondrian.artwork-title.subject.study' },
  { gender: 'masculine', phraseKey: 'mondrian.artwork-title.subject.song' },
  { gender: 'masculine', phraseKey: 'mondrian.artwork-title.subject.gesture' },
  { gender: 'feminine', phraseKey: 'mondrian.artwork-title.subject.conversation' },
  { gender: 'masculine', phraseKey: 'mondrian.artwork-title.subject.breath' },
  { gender: 'feminine', phraseKey: 'mondrian.artwork-title.subject.argument' },
];

const TITLE_SEED_MIX = 0x85ebca6b;
const SENTENCE_KEY: TranslationKey = 'mondrian.artwork-title.sentence';
const FALLBACK_COLOR_NAME_KEY: TranslationKey = 'mondrian.colour.unnamed';

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

/** The noun phrase, with the adjective already put in the gender the noun asks for. */
export function composeSubject(
  adjective: TitleAdjective,
  noun: TitleNoun,
  translate: TitleTranslator,
): string {
  return translate(noun.phraseKey, { adjective: translate(adjective[noun.gender]) });
}

// @FollowsBlueprint utils-seeded-generator
export function buildTitle(
  seed: number,
  rects: ColoredRect[],
  palette: Palette,
  translate: TitleTranslator,
): string {
  const nextRandom = mulberry32(seed ^ TITLE_SEED_MIX);
  const adjective = pickFromNonEmptyList(TITLE_ADJECTIVES, nextRandom);
  const noun = pickFromNonEmptyList(TITLE_NOUNS, nextRandom);
  return translate(SENTENCE_KEY, {
    subject: composeSubject(adjective, noun, translate),
    colour: translate(dominantColorNameKey(rects, palette)).toLowerCase(),
  });
}

interface ColorTotal {
  totalArea: number;
  colorNameKey: TranslationKey;
}

export function dominantColorNameKey(rects: ColoredRect[], palette: Palette): TranslationKey {
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
      totalsByColor.set(fillHex, { totalArea: rectArea, colorNameKey: rect.fillNameKey });
    }
  }

  const firstFill = palette.fills[0];
  let dominantNameKey = firstFill === undefined ? FALLBACK_COLOR_NAME_KEY : firstFill.nameKey;
  let dominantArea = -1;
  for (const colorTotal of totalsByColor.values()) {
    if (colorTotal.totalArea > dominantArea) {
      dominantArea = colorTotal.totalArea;
      dominantNameKey = colorTotal.colorNameKey;
    }
  }
  return dominantNameKey;
}

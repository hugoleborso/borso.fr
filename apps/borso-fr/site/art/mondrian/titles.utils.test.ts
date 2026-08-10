import { beforeAll, describe, expect, it } from 'vitest';
import { i18next } from '../../i18n/i18n';
import { type ColoredRect, colorize, generateLayout } from './painting.utils';
import { type Palette, PALETTES } from './palettes.utils';
import {
  buildTitle,
  composeSubject,
  dominantColorNameKey,
  pickFromNonEmptyList,
  TITLE_ADJECTIVES,
  TITLE_NOUNS,
  type TitleTranslator,
} from './titles.utils';

const translate: TitleTranslator = (key, interpolations) => i18next.t(key, interpolations);

function rectsForSeed(seed: number, palette = PALETTES.classic) {
  const layout = generateLayout({ seed, complexity: 22 });
  return colorize(layout, { seed, palette, balance: 0.5 });
}

/**
 * The whole product of the two tables, in the order a reader can check against
 * the catalogue. A feminine noun carrying a masculine adjective form reads as
 * an error here long before it reads as one on the page.
 */
const EVERY_SUBJECT_IN_ORDER: readonly string[] = [
  'Une étude tranquille',
  'Une étude inquiète',
  'Une étude lumineuse',
  'Une étude feutrée',
  'Une étude lente',
  'Une étude soudaine',
  'Une étude attentive',
  'Une étude généreuse',
  'Une étude brève',
  'Une étude patiente',
  'Un chant tranquille',
  'Un chant inquiet',
  'Un chant lumineux',
  'Un chant feutré',
  'Un chant lent',
  'Un chant soudain',
  'Un chant attentif',
  'Un chant généreux',
  'Un chant bref',
  'Un chant patient',
  'Un geste tranquille',
  'Un geste inquiet',
  'Un geste lumineux',
  'Un geste feutré',
  'Un geste lent',
  'Un geste soudain',
  'Un geste attentif',
  'Un geste généreux',
  'Un geste bref',
  'Un geste patient',
  'Une conversation tranquille',
  'Une conversation inquiète',
  'Une conversation lumineuse',
  'Une conversation feutrée',
  'Une conversation lente',
  'Une conversation soudaine',
  'Une conversation attentive',
  'Une conversation généreuse',
  'Une conversation brève',
  'Une conversation patiente',
  'Un souffle tranquille',
  'Un souffle inquiet',
  'Un souffle lumineux',
  'Un souffle feutré',
  'Un souffle lent',
  'Un souffle soudain',
  'Un souffle attentif',
  'Un souffle généreux',
  'Un souffle bref',
  'Un souffle patient',
  'Une dispute tranquille',
  'Une dispute inquiète',
  'Une dispute lumineuse',
  'Une dispute feutrée',
  'Une dispute lente',
  'Une dispute soudaine',
  'Une dispute attentive',
  'Une dispute généreuse',
  'Une dispute brève',
  'Une dispute patiente',
];

beforeAll(async () => {
  await i18next.changeLanguage('fr');
});

describe('pickFromNonEmptyList', () => {
  const flowers = ['rose', 'daisy', 'iris', 'tulip'] as const;

  it('returns the element at the index implied by nextRandom', () => {
    expect(pickFromNonEmptyList(flowers, () => 0)).toBe('rose');
    expect(pickFromNonEmptyList(flowers, () => 0.99)).toBe('tulip');
  });

  it('handles a single-element list (covers the cursor === 0 branch on the first iteration)', () => {
    expect(pickFromNonEmptyList(['only'] as const, () => 0)).toBe('only');
    expect(pickFromNonEmptyList(['only'] as const, () => 0.5)).toBe('only');
  });

  it('iterates past earlier elements before matching the target index', () => {
    expect(pickFromNonEmptyList(flowers, () => 0.5)).toBe('iris');
  });
});

describe('composeSubject', () => {
  it('agrees every adjective with the gender of every noun', () => {
    const subjects = TITLE_NOUNS.flatMap((noun) =>
      TITLE_ADJECTIVES.map((adjective) => composeSubject(adjective, noun, translate)),
    );
    expect(subjects).toStrictEqual(EVERY_SUBJECT_IN_ORDER);
  });
});

describe('buildTitle', () => {
  it('names the composition in French, in the colour covering the most canvas', () => {
    const seed = 0xdeadbeef;
    expect(buildTitle(seed, rectsForSeed(seed), PALETTES.classic, translate)).toBe(
      'Un souffle soudain en cobalt',
    );
  });

  it('takes the colour word from the palette in use', () => {
    const seed = 0xc0ffee;
    const rects = rectsForSeed(seed, PALETTES.muted);
    expect(buildTitle(seed, rects, PALETTES.muted, translate)).toBe('Un geste tranquille en ocre');
  });

  it('is deterministic for a fixed seed + palette + rects', () => {
    const seed = 0x12345678;
    const rects = rectsForSeed(seed);
    expect(buildTitle(seed, rects, PALETTES.classic, translate)).toBe(
      buildTitle(seed, rects, PALETTES.classic, translate),
    );
  });

  it('changes when the seed changes', () => {
    const titleA = buildTitle(1, rectsForSeed(1), PALETTES.classic, translate);
    const titleB = buildTitle(2, rectsForSeed(2), PALETTES.classic, translate);
    expect(titleA).not.toBe(titleB);
  });
});

describe('dominantColorNameKey', () => {
  it('returns the largest non-neutral fill', () => {
    const palette: Palette = {
      bg: '#ffffff',
      line: '#000000',
      fills: [
        { nameKey: 'mondrian.colour.cobalt', hex: '#1e4fb6' },
        { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
      ],
    };
    const smallCobaltRect: ColoredRect = {
      x: 0,
      y: 0,
      width: 0.1,
      height: 0.1,
      depth: 0,
      id: 0,
      fill: '#1e4fb6',
      fillNameKey: 'mondrian.colour.cobalt',
    };
    const largeVermillionRect: ColoredRect = {
      x: 0.1,
      y: 0,
      width: 0.9,
      height: 1,
      depth: 0,
      id: 1,
      fill: '#d8332a',
      fillNameKey: 'mondrian.colour.vermillion',
    };
    expect(dominantColorNameKey([smallCobaltRect, largeVermillionRect], palette)).toBe(
      'mondrian.colour.vermillion',
    );
  });

  it('skips the neutral background even when it is the largest fill', () => {
    const palette: Palette = {
      bg: '#fafafa',
      line: '#000000',
      fills: [
        { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
        { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
      ],
    };
    const largeIvoryRect: ColoredRect = {
      x: 0,
      y: 0,
      width: 0.99,
      height: 1,
      depth: 0,
      id: 0,
      fill: '#fafafa',
      fillNameKey: 'mondrian.colour.ivory',
    };
    const smallVermillionRect: ColoredRect = {
      x: 0.99,
      y: 0,
      width: 0.01,
      height: 1,
      depth: 0,
      id: 1,
      fill: '#d8332a',
      fillNameKey: 'mondrian.colour.vermillion',
    };
    expect(dominantColorNameKey([largeIvoryRect, smallVermillionRect], palette)).toBe(
      'mondrian.colour.vermillion',
    );
  });

  it('skips the line colour even when it is dominant, whatever case its hex is written in', () => {
    const palette: Palette = {
      bg: '#ffffff',
      line: '#1A1714',
      fills: [
        { nameKey: 'mondrian.colour.onyx', hex: '#1a1714' },
        { nameKey: 'mondrian.colour.saffron', hex: '#f5c518' },
      ],
    };
    const largeOnyxRect: ColoredRect = {
      x: 0,
      y: 0,
      width: 0.9,
      height: 1,
      depth: 0,
      id: 0,
      fill: '#1a1714',
      fillNameKey: 'mondrian.colour.onyx',
    };
    const smallSaffronRect: ColoredRect = {
      x: 0.9,
      y: 0,
      width: 0.1,
      height: 1,
      depth: 0,
      id: 1,
      fill: '#f5c518',
      fillNameKey: 'mondrian.colour.saffron',
    };
    expect(dominantColorNameKey([largeOnyxRect, smallSaffronRect], palette)).toBe(
      'mondrian.colour.saffron',
    );
  });

  it('aggregates multiple rects with the same fill', () => {
    const palette: Palette = {
      bg: '#ffffff',
      line: '#000000',
      fills: [
        { nameKey: 'mondrian.colour.cobalt', hex: '#1e4fb6' },
        { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
      ],
    };
    const cobaltA: ColoredRect = {
      x: 0,
      y: 0,
      width: 0.4,
      height: 0.5,
      depth: 0,
      id: 0,
      fill: '#1e4fb6',
      fillNameKey: 'mondrian.colour.cobalt',
    };
    const cobaltB: ColoredRect = {
      x: 0.4,
      y: 0,
      width: 0.4,
      height: 0.5,
      depth: 0,
      id: 1,
      fill: '#1e4fb6',
      fillNameKey: 'mondrian.colour.cobalt',
    };
    const vermillionRect: ColoredRect = {
      x: 0,
      y: 0.5,
      width: 0.6,
      height: 0.5,
      depth: 0,
      id: 2,
      fill: '#d8332a',
      fillNameKey: 'mondrian.colour.vermillion',
    };
    expect(dominantColorNameKey([cobaltA, cobaltB, vermillionRect], palette)).toBe(
      'mondrian.colour.cobalt',
    );
  });

  it('keeps the colour seen first when two colours cover the same area', () => {
    const palette: Palette = {
      bg: '#ffffff',
      line: '#000000',
      fills: [
        { nameKey: 'mondrian.colour.cobalt', hex: '#1e4fb6' },
        { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
      ],
    };
    const leftVermillionRect: ColoredRect = {
      x: 0,
      y: 0,
      width: 0.5,
      height: 1,
      depth: 0,
      id: 0,
      fill: '#d8332a',
      fillNameKey: 'mondrian.colour.vermillion',
    };
    const rightCobaltRect: ColoredRect = {
      x: 0.5,
      y: 0,
      width: 0.5,
      height: 1,
      depth: 0,
      id: 1,
      fill: '#1e4fb6',
      fillNameKey: 'mondrian.colour.cobalt',
    };
    expect(dominantColorNameKey([leftVermillionRect, rightCobaltRect], palette)).toBe(
      'mondrian.colour.vermillion',
    );
  });

  it('falls back to the first palette fill when no non-neutral rects exist', () => {
    const monochromePalette: Palette = {
      bg: '#aaaaaa',
      line: '#aaaaaa',
      fills: [{ nameKey: 'mondrian.colour.pearl', hex: '#aaaaaa' }],
    };
    const layout = generateLayout({ seed: 1, complexity: 12 });
    const rects = colorize(layout, { seed: 1, palette: monochromePalette, balance: 0.5 });
    expect(dominantColorNameKey(rects, monochromePalette)).toBe('mondrian.colour.pearl');
  });

  it('falls back to the unnamed colour when the palette has no fills at all', () => {
    const emptyPalette: Palette = { bg: '#000000', line: '#ffffff', fills: [] };
    expect(dominantColorNameKey([], emptyPalette)).toBe('mondrian.colour.unnamed');
  });
});

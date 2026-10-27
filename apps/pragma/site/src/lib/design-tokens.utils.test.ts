import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import {
  compositeOver,
  type ColourScheme,
  listTokenUtilityCandidates,
  measureContrastOnFill,
  measureFillContrast,
  measureTokenContrast,
  parseColour,
  readSchemeColour,
  readThemeTokens,
  readUtilityName,
  resolveColourToken,
} from './design-tokens.utils';
import { ON_COLOR_DARK, ON_COLOR_LIGHT } from './member-color.utils';

const SITE_SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STYLESHEET_PATH = join(SITE_SOURCE_ROOT, 'styles', 'tokens.css');
const STYLESHEET = readFileSync(STYLESHEET_PATH, 'utf8');
const TOKENS = readThemeTokens(STYLESHEET);
const SCHEMES: readonly ColourScheme[] = ['light', 'dark'];
const MINIMUM_TEXT_CONTRAST = 4.5;
const SOURCE_FILE = /\.tsx?$/u;
const TEST_FILE = /\.test\.tsx?$/u;
const TOKEN_READER_FILE = 'design-tokens.utils.ts';
const COLOUR_VARIABLE = /var\(--color-([a-z0-9-]+)\)/gu;
const DECIMAL_PLACES = 2;

const TEXT_PAIRS: readonly (readonly [string, string])[] = [
  ...['paper', 'leaf', 'raised', 'sunk'].flatMap((background) =>
    ['ink', 'ink-soft', 'ink-faint', 'accent', 'accent-strong', 'danger', 'pencil'].map(
      (text) => [text, background] as const,
    ),
  ),
  ['ink', 'hover'],
  ['ink-soft', 'hover'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-pressed'],
  ['on-danger', 'danger'],
  ['danger', 'danger-soft'],
  ['good', 'good-soft'],
  ['warn', 'warn-soft'],
  ['ink', 'warn-soft'],
  ['on-highlight', 'highlight'],
  ['paper', 'ink'],
  ['accent-strong', 'accent-soft'],
  ['ink', 'accent-soft'],
  ['stage-ink', 'stage-bg'],
  ['stage-ink-dim', 'stage-bg'],
  ['stage-chord', 'stage-bg'],
];

const PILL_LABELS: readonly (readonly [string, string])[] = [
  ['ink', 'paper'],
  ['ink', 'leaf'],
  ['ink', 'raised'],
  ['accent', 'paper'],
  ['accent', 'leaf'],
  ['accent', 'raised'],
];

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    const isScanned =
      SOURCE_FILE.test(entry.name) &&
      !TEST_FILE.test(entry.name) &&
      entry.name !== TOKEN_READER_FILE;
    return isScanned ? [path] : [];
  });
}

async function compileTokens(): Promise<{ build: (candidates: string[]) => string }> {
  const require = createRequire(import.meta.url);
  return compile(STYLESHEET, {
    base: dirname(STYLESHEET_PATH),
    loadStylesheet: async (id: string, base: string) => {
      const path =
        id === 'tailwindcss' ? require.resolve('tailwindcss/index.css') : resolve(base, id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
  });
}

// @FollowsBlueprint test-pure-unit
describe('readThemeTokens', () => {
  it('reads colours, text roles, radii and shadows, and skips resets and nested properties', () => {
    const tokens = readThemeTokens(`
      --color-*: initial;
      --color-paper: light-dark(#f5f1e8, #16130f) ;
      --text-body: 16px;
      --text-body--line-height: 24px;
      --radius-pill: 999px;
      --shadow-leaf: 0 1px 0 #000;
      --font-sans: Geist;
    `);
    expect([...tokens.colours]).toEqual([['paper', 'light-dark(#f5f1e8, #16130f)']]);
    expect([...tokens.textRoles]).toEqual(['body']);
    expect([...tokens.radii]).toEqual(['pill']);
    expect([...tokens.shadows]).toEqual(['leaf']);
  });
});

describe('readSchemeColour', () => {
  it('splits a light-dark pair and repeats a single value for both schemes', () => {
    expect(readSchemeColour(' light-dark(#fff, #000) ')).toEqual({ light: '#fff', dark: '#000' });
    expect(readSchemeColour(' #0a0907 ')).toEqual({ light: '#0a0907', dark: '#0a0907' });
  });
});

describe('parseColour', () => {
  it('reads an opaque hex, a hex with an alpha byte, and refuses anything else', () => {
    expect(parseColour(' #ff0000 ')).toEqual({ r: 255, g: 0, b: 0, alpha: 1 });
    expect(parseColour(' #00000080 ')).toEqual({ r: 0, g: 0, b: 0, alpha: 128 / 255 });
    expect(parseColour('#zz000080')).toBeNull();
    expect(parseColour('red')).toBeNull();
  });
});

describe('compositeOver', () => {
  it('blends a translucent colour over an opaque one', () => {
    expect(compositeOver({ r: 0, g: 0, b: 0, alpha: 0.5 }, { r: 255, g: 255, b: 255 })).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
  });
});

describe('resolveColourToken and the contrast measures', () => {
  const tokens = readThemeTokens(`
    --color-ink: light-dark(#000000, #ffffff);
    --color-paper: light-dark(#ffffff, #000000);
    --color-veil: #00000000;
    --color-word: red;
  `);

  it('resolves a token per scheme and answers null for an unknown or unparsable one', () => {
    expect(resolveColourToken(tokens, 'ink', 'dark')).toEqual({ r: 255, g: 255, b: 255, alpha: 1 });
    expect(resolveColourToken(tokens, 'missing', 'light')).toBeNull();
    expect(resolveColourToken(tokens, 'word', 'light')).toBeNull();
  });

  it('measures text on a background, text on a fill over a background, and a fill against what is under it', () => {
    expect(measureTokenContrast(tokens, 'ink', 'paper', 'light')).toBe(21);
    expect(measureTokenContrast(tokens, 'ink', 'missing', 'light')).toBeNull();
    expect(measureTokenContrast(tokens, 'missing', 'paper', 'light')).toBeNull();
    expect(measureContrastOnFill(tokens, 'ink', 'veil', 'paper', 'dark')).toBe(21);
    expect(measureContrastOnFill(tokens, 'ink', 'missing', 'paper', 'dark')).toBeNull();
    expect(measureContrastOnFill(tokens, 'missing', 'veil', 'paper', 'dark')).toBeNull();
    expect(measureContrastOnFill(tokens, 'ink', 'veil', 'missing', 'dark')).toBeNull();
    expect(measureFillContrast(tokens, 'veil', 'paper', 'light')).toBe(1);
    expect(measureFillContrast(tokens, 'missing', 'paper', 'light')).toBeNull();
    expect(measureFillContrast(tokens, 'veil', 'missing', 'light')).toBeNull();
  });
});

describe('listTokenUtilityCandidates', () => {
  it('keeps the colour, text, radius and shadow utilities, with their variants, and drops the rest', () => {
    expect(
      listTokenUtilityCandidates(
        "className='flex hover:bg-surface text-meta !rounded-pill shadow-leaf p-2 border-t-rule'",
      ),
    ).toEqual(['!rounded-pill', 'border-t-rule', 'hover:bg-surface', 'shadow-leaf', 'text-meta']);
  });

  it('reads the utility a variant-prefixed or important class applies', () => {
    expect(readUtilityName('lg:hover:!bg-paper')).toBe('bg-paper');
    expect(readUtilityName('text-ink')).toBe('text-ink');
    expect(readUtilityName('md:bg-paper!')).toBe('bg-paper');
  });
});

describe('the stylesheet', () => {
  it('holds the same two inks for a member colour as member-color.utils', () => {
    expect(TOKENS.colours.get('on-color-dark')).toBe(ON_COLOR_DARK);
    expect(TOKENS.colours.get('on-color-light')).toBe(ON_COLOR_LIGHT);
  });

  it.each(SCHEMES)('keeps every listed text pair at 4.5:1 or more in the %s scheme', (scheme) => {
    const failing = TEXT_PAIRS.filter(([text, background]) => {
      const ratio = measureTokenContrast(TOKENS, text, background, scheme);
      return ratio === null || ratio < MINIMUM_TEXT_CONTRAST;
    });
    expect(failing).toEqual([]);
  });

  it.each(SCHEMES)(
    'keeps the secondary pill label at 4.5:1 or more on its translucent fill in the %s scheme',
    (scheme) => {
      const failing = PILL_LABELS.filter(([text, under]) => {
        const ratio = measureContrastOnFill(TOKENS, text, 'glass', under, scheme);
        return ratio === null || ratio < MINIMUM_TEXT_CONTRAST;
      });
      expect(failing).toEqual([]);
    },
  );

  it('reports the secondary pill fill against paper and raised, which has no threshold', () => {
    const report = SCHEMES.flatMap((scheme) =>
      ['paper', 'raised'].map(
        (under) =>
          `${scheme} glass over ${under}: ${String(measureFillContrast(TOKENS, 'glass', under, scheme)?.toFixed(DECIMAL_PLACES))}:1`,
      ),
    );
    expect(report).toHaveLength(SCHEMES.length * 2);
  });
});

describe('the source under site/src', () => {
  const files = listSourceFiles(SITE_SOURCE_ROOT);

  it('names only colour variables the stylesheet defines', () => {
    const unknown = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(COLOUR_VARIABLE)]
        .map((match) => match[1] ?? '')
        .filter((name) => !TOKENS.colours.has(name))
        .map((name) => `${relative(SITE_SOURCE_ROOT, file)}: --color-${name}`),
    );
    expect(unknown).toEqual([]);
  });

  it('uses only colour, text, radius and shadow utilities the stylesheet generates', async () => {
    const compiler = await compileTokens();
    let generated = compiler.build([]).length;
    const unknown: string[] = [];
    const generatedCandidates = new Set<string>();
    for (const file of files) {
      for (const candidate of listTokenUtilityCandidates(readFileSync(file, 'utf8'))) {
        if (generatedCandidates.has(candidate)) continue;
        const next = compiler.build([candidate]).length;
        if (next > generated) generatedCandidates.add(candidate);
        if (next === generated) unknown.push(`${relative(SITE_SOURCE_ROOT, file)}: ${candidate}`);
        generated = next;
      }
    }
    expect(unknown).toEqual([]);
  });
});

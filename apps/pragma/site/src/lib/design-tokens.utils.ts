import { contrastRatio, parseHex, type Rgb } from './member-color.utils';

export type ColourScheme = 'light' | 'dark';

export interface SchemeColour {
  readonly light: string;
  readonly dark: string;
}

export interface Rgba extends Rgb {
  readonly alpha: number;
}

const THEME_VARIABLE = /--([a-z0-9-]+)\s*:\s*([^;]+);/gu;
const LIGHT_DARK_VALUE = /^light-dark\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)$/u;
const HEX_WITH_ALPHA = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/u;
const COLOUR_PREFIX = 'color-';
const TEXT_PREFIX = 'text-';
const RADIUS_PREFIX = 'radius-';
const SHADOW_PREFIX = 'shadow-';
const NESTED_PROPERTY_MARKER = '--';
const HEX_RADIX = 16;
const BYTE_MAX = 255;
const OPAQUE = 1;

export interface ThemeTokens {
  readonly colours: ReadonlyMap<string, string>;
  readonly textRoles: ReadonlySet<string>;
  readonly radii: ReadonlySet<string>;
  readonly shadows: ReadonlySet<string>;
}

// @FollowsBlueprint utils-pure-module
export function readThemeTokens(stylesheet: string): ThemeTokens {
  const colours = new Map<string, string>();
  const textRoles = new Set<string>();
  const radii = new Set<string>();
  const shadows = new Set<string>();
  for (const match of stylesheet.matchAll(THEME_VARIABLE)) {
    const name = String(match[1]);
    const value = String(match[2]).trim();
    if (name.includes(NESTED_PROPERTY_MARKER)) continue;
    if (name.startsWith(COLOUR_PREFIX)) colours.set(name.slice(COLOUR_PREFIX.length), value);
    else if (name.startsWith(TEXT_PREFIX)) textRoles.add(name.slice(TEXT_PREFIX.length));
    else if (name.startsWith(RADIUS_PREFIX)) radii.add(name.slice(RADIUS_PREFIX.length));
    else if (name.startsWith(SHADOW_PREFIX)) shadows.add(name.slice(SHADOW_PREFIX.length));
  }
  return { colours, textRoles, radii, shadows };
}

export function readSchemeColour(value: string): SchemeColour {
  const match = LIGHT_DARK_VALUE.exec(value.trim());
  if (match === null) return { light: value.trim(), dark: value.trim() };
  return { light: String(match[1]), dark: String(match[2]) };
}

export function parseColour(value: string): Rgba | null {
  const withAlpha = HEX_WITH_ALPHA.exec(value.trim());
  const rgb = parseHex(withAlpha === null ? value : `#${String(withAlpha[1])}`);
  if (rgb === null) return null;
  const alpha =
    withAlpha === null ? OPAQUE : Number.parseInt(String(withAlpha[2]), HEX_RADIX) / BYTE_MAX;
  return { ...rgb, alpha };
}

export function compositeOver(top: Rgba, bottom: Rgb): Rgb {
  const mix = (upper: number, lower: number): number =>
    Math.round(upper * top.alpha + lower * (OPAQUE - top.alpha));
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b) };
}

export function resolveColourToken(
  tokens: ThemeTokens,
  name: string,
  scheme: ColourScheme,
): Rgba | null {
  const value = tokens.colours.get(name);
  if (value === undefined) return null;
  return parseColour(readSchemeColour(value)[scheme]);
}

export function measureTokenContrast(
  tokens: ThemeTokens,
  textToken: string,
  backgroundToken: string,
  scheme: ColourScheme,
): number | null {
  const text = resolveColourToken(tokens, textToken, scheme);
  const background = resolveColourToken(tokens, backgroundToken, scheme);
  if (text === null || background === null) return null;
  return contrastRatio(compositeOver(text, background), background);
}

const CLASS_TOKEN = /[!a-z0-9:/._%&[\]-]+/giu;
const TOKEN_UTILITY_ROOT =
  /^-?(?:(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|fill|stroke|divide|from|via|to|decoration|placeholder|caret|accent)-|(?:rounded|shadow)(?:-|$))/u;

const IMPORTANT_MARK = /^!|!$/gu;

export function readUtilityName(token: string): string {
  return token.slice(token.lastIndexOf(':') + 1).replace(IMPORTANT_MARK, '');
}

export function listTokenUtilityCandidates(source: string): string[] {
  const candidates = new Set<string>();
  for (const match of source.matchAll(CLASS_TOKEN)) {
    const token = match[0];
    if (TOKEN_UTILITY_ROOT.test(readUtilityName(token))) candidates.add(token);
  }
  return [...candidates].sort();
}

export function measureContrastOnFill(
  tokens: ThemeTokens,
  textToken: string,
  fillToken: string,
  underToken: string,
  scheme: ColourScheme,
): number | null {
  const text = resolveColourToken(tokens, textToken, scheme);
  const fill = resolveColourToken(tokens, fillToken, scheme);
  const under = resolveColourToken(tokens, underToken, scheme);
  if (text === null || fill === null || under === null) return null;
  const background = compositeOver(fill, under);
  return contrastRatio(compositeOver(text, background), background);
}

export function measureFillContrast(
  tokens: ThemeTokens,
  fillToken: string,
  underToken: string,
  scheme: ColourScheme,
): number | null {
  const fill = resolveColourToken(tokens, fillToken, scheme);
  const under = resolveColourToken(tokens, underToken, scheme);
  if (fill === null || under === null) return null;
  return contrastRatio(compositeOver(fill, under), under);
}

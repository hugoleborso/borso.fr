/** @Feature songs */

import { SECTION_END_DIRECTIVES, SECTION_START_DIRECTIVES } from './chordpro-sections.utils';

export interface ChordToken {
  readonly kind: 'chord';
  readonly chord: string;
}

export interface LyricToken {
  readonly kind: 'lyric';
  readonly text: string;
}

export type LineToken = ChordToken | LyricToken;

export interface DirectiveLine {
  readonly kind: 'directive';
  readonly name: string;
  readonly value: string;
}

export interface ChordLine {
  readonly kind: 'chord-line';
  readonly tokens: readonly LineToken[];
}

export interface PlainLine {
  readonly kind: 'plain-line';
  readonly text: string;
}

export interface BlankLine {
  readonly kind: 'blank';
}

export interface TabLine {
  readonly kind: 'tab-line';
  readonly text: string;
}

export type ChordProLine = DirectiveLine | ChordLine | PlainLine | BlankLine | TabLine;

const CHORD_PATTERN = /\[[^\]]+\]/g;
const DIRECTIVE_PATTERN = /^\{[a-zA-Z_]+(?::\s*.+)?\}$/;
const DELIMITER_LENGTH = 1;
const DIRECTIVE_VALUE_SEPARATOR = ':';

function parseDirective(braced: string): DirectiveLine {
  const body = braced.slice(DELIMITER_LENGTH, -DELIMITER_LENGTH);
  const separatorIndex = body.indexOf(DIRECTIVE_VALUE_SEPARATOR);
  if (separatorIndex === -1) return { kind: 'directive', name: body, value: '' };
  return {
    kind: 'directive',
    name: body.slice(0, separatorIndex),
    value: body.slice(separatorIndex + DELIMITER_LENGTH).trimStart(),
  };
}

// @FollowsBlueprint utils-pure-module
export function parseChordProLine(line: string): ChordProLine {
  if (line.trim().length === 0) return { kind: 'blank' };
  const trimmed = line.trim();
  if (DIRECTIVE_PATTERN.test(trimmed)) return parseDirective(trimmed);
  if (!line.includes('[')) return { kind: 'plain-line', text: line };
  const tokens: LineToken[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  CHORD_PATTERN.lastIndex = 0;
  match = CHORD_PATTERN.exec(line);
  while (match !== null) {
    const before = line.slice(cursor, match.index);
    if (before.length > 0) tokens.push({ kind: 'lyric', text: before });
    tokens.push({ kind: 'chord', chord: match[0].slice(DELIMITER_LENGTH, -DELIMITER_LENGTH) });
    cursor = match.index + match[0].length;
    match = CHORD_PATTERN.exec(line);
  }
  const tail = line.slice(cursor);
  if (tail.length > 0) tokens.push({ kind: 'lyric', text: tail });
  return { kind: 'chord-line', tokens };
}

const TITLE_DIRECTIVE_NAMES = new Set(['title', 't']);

export function isTitleDirective(directiveName: string): boolean {
  return TITLE_DIRECTIVE_NAMES.has(directiveName);
}

const KEY_DIRECTIVE_NAMES = new Set(['key', 'k']);

function isKeyDirective(directiveName: string): boolean {
  return KEY_DIRECTIVE_NAMES.has(directiveName);
}

export function directiveLines(lines: readonly ChordProLine[]): readonly DirectiveLine[] {
  const directives: DirectiveLine[] = [];
  for (const line of lines) {
    if (line.kind === 'directive') directives.push(line);
  }
  return directives;
}

export function readTitle(lines: readonly ChordProLine[]): string | null {
  for (const directive of directiveLines(lines)) {
    if (isTitleDirective(directive.name)) return directive.value;
  }
  return null;
}

const TAB_SECTION_KIND = 'tab';

export function parseChordPro(source: string): readonly ChordProLine[] {
  let isInsideTab = false;
  return source.split(/\r?\n/).map((rawLine) => {
    const line = parseChordProLine(rawLine);
    if (line.kind === 'directive') {
      const startedKind = SECTION_START_DIRECTIVES.get(line.name);
      if (startedKind !== undefined) isInsideTab = startedKind === TAB_SECTION_KIND;
      if (SECTION_END_DIRECTIVES.has(line.name)) isInsideTab = false;
      return line;
    }
    if (isInsideTab && line.kind !== 'blank') return { kind: 'tab-line', text: rawLine };
    return line;
  });
}

const NO_TAB_COLUMNS = 0;

export function widestTabLineLength(lines: readonly ChordProLine[]): number {
  let widest = NO_TAB_COLUMNS;
  for (const line of lines) {
    if (line.kind === 'tab-line') widest = Math.max(widest, line.text.trimEnd().length);
  }
  return widest;
}

const NOTES_SHARP: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
const NOTES_FLAT: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];
const NOTES_IN_OCTAVE = 12;
const ROOT_PATTERN = /^[A-G][#b]?/;
const FLAT_SIGN = 'b';
const BASS_SEPARATOR = '/';

function chromaticIndexOfRoot(root: string): number {
  return root.endsWith(FLAT_SIGN) ? NOTES_FLAT.indexOf(root) : NOTES_SHARP.indexOf(root);
}

function transposeChordPart(chord: string, semitones: number): string {
  const rootMatch = ROOT_PATTERN.exec(chord);
  if (rootMatch === null) return chord;
  const root = rootMatch[0];
  const suffix = chord.slice(root.length);
  const rootIndex = chromaticIndexOfRoot(root);
  if (rootIndex === -1) return chord;
  const next = (((rootIndex + semitones) % NOTES_IN_OCTAVE) + NOTES_IN_OCTAVE) % NOTES_IN_OCTAVE;
  return `${NOTES_SHARP[next]}${suffix}`;
}

export function transposeChord(chord: string, semitones: number): string {
  return chord
    .split(BASS_SEPARATOR)
    .map((part) => transposeChordPart(part, semitones))
    .join(BASS_SEPARATOR);
}

function transposeDirective(line: DirectiveLine, semitones: number): DirectiveLine {
  if (!isKeyDirective(line.name)) return line;
  return { kind: 'directive', name: line.name, value: transposeChord(line.value, semitones) };
}

export function transposeLines(
  lines: readonly ChordProLine[],
  semitones: number,
): readonly ChordProLine[] {
  if (semitones === 0) return lines;
  return lines.map((line) => {
    if (line.kind === 'directive') return transposeDirective(line, semitones);
    if (line.kind !== 'chord-line') return line;
    return {
      kind: 'chord-line',
      tokens: line.tokens.map((token) =>
        token.kind === 'chord'
          ? { kind: 'chord', chord: transposeChord(token.chord, semitones) }
          : token,
      ),
    };
  });
}

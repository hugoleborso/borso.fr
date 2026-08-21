/** @Feature songs */

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

export type ChordProLine = DirectiveLine | ChordLine | PlainLine | BlankLine;

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

export function parseChordPro(source: string): readonly ChordProLine[] {
  return source.split(/\r?\n/).map(parseChordProLine);
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

export type ChordProSectionKind = 'verse' | 'chorus' | 'bridge' | 'tab' | 'body';

export type LabelledSectionKind = Exclude<ChordProSectionKind, 'body'>;

export interface BodySection {
  readonly kind: 'body';
  readonly label: null;
  readonly ordinalAmongKind: null;
  readonly lines: readonly ChordProLine[];
}

export interface LabelledSection {
  readonly kind: LabelledSectionKind;
  readonly label: string | null;
  readonly ordinalAmongKind: number;
  readonly lines: readonly ChordProLine[];
}

export type ChordProSection = BodySection | LabelledSection;

const BODY_SECTION_KIND = 'body';
const FIRST_ORDINAL = 1;

const SECTION_START_DIRECTIVES = new Map<string, ChordProSectionKind>([
  ['start_of_verse', 'verse'],
  ['sov', 'verse'],
  ['start_of_chorus', 'chorus'],
  ['soc', 'chorus'],
  ['start_of_bridge', 'bridge'],
  ['sob', 'bridge'],
  ['start_of_tab', 'tab'],
  ['sot', 'tab'],
]);

const SECTION_END_DIRECTIVES = new Set([
  'end_of_verse',
  'eov',
  'end_of_chorus',
  'eoc',
  'end_of_bridge',
  'eob',
  'end_of_tab',
  'eot',
]);

interface AccumulatingSection {
  readonly kind: ChordProSectionKind;
  readonly label: string | null;
  readonly lines: ChordProLine[];
}

function openSection(kind: ChordProSectionKind, label: string | null): AccumulatingSection {
  return { kind, label, lines: [] };
}

function hasRenderableLine(lines: readonly ChordProLine[]): boolean {
  return lines.some((line) => line.kind !== 'blank');
}

const NO_SECTION_SEEN_YET = 0;

function rankByKind(sections: readonly AccumulatingSection[]): readonly ChordProSection[] {
  const seenPerKind = new Map<LabelledSectionKind, number>();
  return sections.map((section) => {
    const { kind, label, lines } = section;
    if (kind === BODY_SECTION_KIND) return { kind, label: null, ordinalAmongKind: null, lines };
    const ordinalAmongKind = (seenPerKind.get(kind) ?? NO_SECTION_SEEN_YET) + FIRST_ORDINAL;
    seenPerKind.set(kind, ordinalAmongKind);
    return { kind, label, ordinalAmongKind, lines };
  });
}

export function groupChordProSections(lines: readonly ChordProLine[]): readonly ChordProSection[] {
  const closed: AccumulatingSection[] = [];
  let current = openSection(BODY_SECTION_KIND, null);
  const closeCurrent = (): void => {
    if (current.kind !== BODY_SECTION_KIND || hasRenderableLine(current.lines)) {
      closed.push(current);
    }
    current = openSection(BODY_SECTION_KIND, null);
  };
  for (const line of lines) {
    // Stryker disable next-line ConditionalExpression: equivalent mutant
    if (line.kind === 'directive') {
      const startedKind = SECTION_START_DIRECTIVES.get(line.name);
      if (startedKind !== undefined) {
        closeCurrent();
        current = openSection(startedKind, line.value.length > 0 ? line.value : null);
        continue;
      }
      if (SECTION_END_DIRECTIVES.has(line.name)) {
        closeCurrent();
        continue;
      }
    }
    current.lines.push(line);
  }
  closeCurrent();
  return rankByKind(closed);
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

function chromaticIndexOfRoot(root: string): number {
  return root.endsWith(FLAT_SIGN) ? NOTES_FLAT.indexOf(root) : NOTES_SHARP.indexOf(root);
}

export function transposeChord(chord: string, semitones: number): string {
  const rootMatch = ROOT_PATTERN.exec(chord);
  if (rootMatch === null) return chord;
  const root = rootMatch[0];
  const suffix = chord.slice(root.length);
  const rootIndex = chromaticIndexOfRoot(root);
  if (rootIndex === -1) return chord;
  const next = (((rootIndex + semitones) % NOTES_IN_OCTAVE) + NOTES_IN_OCTAVE) % NOTES_IN_OCTAVE;
  return `${NOTES_SHARP[next]}${suffix}`;
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

export function hasSectionHeading(section: ChordProSection): section is LabelledSection {
  return section.kind !== BODY_SECTION_KIND;
}

export function buildSectionHeading(displayName: string, ordinalAmongKind: number): string {
  if (ordinalAmongKind <= FIRST_ORDINAL) return displayName;
  return `${displayName} ${ordinalAmongKind}`;
}

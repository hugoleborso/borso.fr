/**
 * Minimal ChordPro renderer. Parses ChordPro source into a flat list
 * of typed segments the chord-chart viewer can render: directive
 * lines (title/key/comment), section headers ({start_of_chorus}),
 * chord-over-lyric lines, blank lines. The actual visual rendering is
 * delegated to a thin React wrapper around the output of this
 * function — keeping the parser pure makes the chord viewer
 * unit-testable without a DOM.
 *
 * Spec note: this is a minimal parser, sufficient for the v1 viewer
 * (chord-above-lyric layout, transposable). Tab + Lilypond blocks are
 * left as raw text — the viewer renders them in a `<pre>` block.
 */

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

/** ChordPro spells the title directive both in full and abbreviated. */
export function isTitleDirective(directiveName: string): boolean {
  return TITLE_DIRECTIVE_NAMES.has(directiveName);
}

const KEY_DIRECTIVE_NAMES = new Set(['key', 'k']);

function isKeyDirective(directiveName: string): boolean {
  return KEY_DIRECTIVE_NAMES.has(directiveName);
}

/**
 * Returns the title declared via `{title: ...}` or `{t: ...}` if any.
 */
/** The directive lines of a parsed chart, in source order. */
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

/** Every section kind that carries a heading on screen. */
export type LabelledSectionKind = Exclude<ChordProSectionKind, 'body'>;

/** An unmarked stretch of chart, between or before the marked blocks. */
export interface BodySection {
  readonly kind: 'body';
  readonly label: null;
  readonly ordinal: null;
  readonly lines: readonly ChordProLine[];
}

export interface LabelledSection {
  readonly kind: LabelledSectionKind;
  /** The directive argument, e.g. `{start_of_verse: Intro riff}`. */
  readonly label: string | null;
  /** Rank among the sections sharing this kind, counting from one. */
  readonly ordinal: number;
  readonly lines: readonly ChordProLine[];
}

export type ChordProSection = BodySection | LabelledSection;

const BODY_SECTION_KIND = 'body';
const FIRST_ORDINAL = 1;

// ChordPro spells every section marker in full and abbreviated.
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
    if (kind === BODY_SECTION_KIND) return { kind, label: null, ordinal: null, lines };
    const ordinal = (seenPerKind.get(kind) ?? NO_SECTION_SEEN_YET) + FIRST_ORDINAL;
    seenPerKind.set(kind, ordinal);
    return { kind, label, ordinal, lines };
  });
}

/**
 * Groups parsed lines into the verse / chorus / bridge blocks a reader
 * scans for on stage. Lines outside any marker collect into `body`
 * sections, which are dropped when they hold nothing but blanks so the
 * gap between two marked blocks does not render as an empty heading.
 * A section left unclosed at the end of the source is still returned.
 */
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
    // Stryker disable next-line ConditionalExpression: equivalent mutant. This
    // narrows the union so `line.name` type-checks; at runtime every other line
    // kind lacks `name`, so both marker lookups miss and the line is pushed
    // either way.
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

/**
 * Transposes a single chord by an integer number of semitones. Only
 * the chord root is shifted; the suffix (m, 7, maj7, sus2, …) stays
 * intact. Returns the original chord unchanged if it can't be parsed
 * as a known root.
 */
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

export function transposeChord(chord: string, semitones: number): string {
  const rootMatch = ROOT_PATTERN.exec(chord);
  if (rootMatch === null) return chord;
  const root = rootMatch[0];
  const suffix = chord.slice(root.length);
  // Flats: convert via the flat table first, then re-emit in the
  // sharp convention (the parser is forgiving on input, normalised on
  // output).
  const rootIndex = root.endsWith(FLAT_SIGN) ? NOTES_FLAT.indexOf(root) : NOTES_SHARP.indexOf(root);
  if (rootIndex === -1) return chord;
  const next = (((rootIndex + semitones) % NOTES_IN_OCTAVE) + NOTES_IN_OCTAVE) % NOTES_IN_OCTAVE;
  return `${NOTES_SHARP[next]}${suffix}`;
}

function transposeDirective(line: DirectiveLine, semitones: number): DirectiveLine {
  if (!isKeyDirective(line.name)) return line;
  return { kind: 'directive', name: line.name, value: transposeChord(line.value, semitones) };
}

/**
 * Shifts every chord the chart draws, including the one the `{key: …}`
 * directive prints above them: a key label left at its written value while the
 * chords move says the song is in a key the chart no longer plays.
 */
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

/** A `body` run is an unmarked stretch of chart, so it carries no heading. */
export function hasSectionHeading(section: ChordProSection): section is LabelledSection {
  return section.kind !== BODY_SECTION_KIND;
}

/**
 * Names a section for the reader. The first block of a kind stays
 * unnumbered, because "Chorus" reads better than "Chorus 1" on a chart
 * carrying a single chorus; every later block takes its rank.
 */
export function buildSectionHeading(displayName: string, ordinal: number): string {
  if (ordinal <= FIRST_ORDINAL) return displayName;
  return `${displayName} ${ordinal}`;
}

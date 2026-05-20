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

const CHORD_PATTERN = /\[([^\]]+)\]/g;
const DIRECTIVE_PATTERN = /^\{([a-zA-Z_]+)(?::\s*(.+))?\}$/;

export function parseChordProLine(line: string): ChordProLine {
  if (line.trim().length === 0) return { kind: 'blank' };
  const directive = DIRECTIVE_PATTERN.exec(line.trim());
  if (directive !== null) {
    return {
      kind: 'directive',
      name: directive[1] ?? '',
      value: directive[2] ?? '',
    };
  }
  if (!line.includes('[')) return { kind: 'plain-line', text: line };
  const tokens: LineToken[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  CHORD_PATTERN.lastIndex = 0;
  match = CHORD_PATTERN.exec(line);
  while (match !== null) {
    const before = line.slice(cursor, match.index);
    if (before.length > 0) tokens.push({ kind: 'lyric', text: before });
    tokens.push({ kind: 'chord', chord: match[1] ?? '' });
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

/**
 * Returns the title declared via `{title: ...}` or `{t: ...}` if any.
 */
export function readTitle(lines: readonly ChordProLine[]): string | null {
  for (const line of lines) {
    if (line.kind === 'directive' && (line.name === 'title' || line.name === 't')) {
      return line.value;
    }
  }
  return null;
}

/**
 * Transposes a single chord by an integer number of semitones. Only
 * the chord root is shifted; the suffix (m, 7, maj7, sus2, …) stays
 * intact. Returns the original chord unchanged if it can't be parsed
 * as a known root.
 */
const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const ROOT_PATTERN = /^([A-G])([#b]?)(.*)$/;

export function transposeChord(chord: string, semitones: number): string {
  const match = ROOT_PATTERN.exec(chord);
  if (match === null) return chord;
  const letter = match[1] ?? '';
  const accidental = match[2] ?? '';
  const suffix = match[3] ?? '';
  const baseIndex = NOTES_SHARP.indexOf(`${letter}${accidental === 'b' ? '' : accidental}`);
  // Flats: convert via the flat table first, then re-emit in the
  // sharp convention (the parser is forgiving on input, normalised on
  // output).
  let rootIndex = baseIndex;
  if (accidental === 'b') {
    rootIndex = NOTES_FLAT.indexOf(`${letter}b`);
  }
  if (rootIndex === -1) return chord;
  const NOTES_IN_OCTAVE = 12;
  const next = ((rootIndex + semitones) % NOTES_IN_OCTAVE + NOTES_IN_OCTAVE) % NOTES_IN_OCTAVE;
  return `${NOTES_SHARP[next]}${suffix}`;
}

export function transposeLines(
  lines: readonly ChordProLine[],
  semitones: number,
): readonly ChordProLine[] {
  if (semitones === 0) return lines;
  return lines.map((line) => {
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

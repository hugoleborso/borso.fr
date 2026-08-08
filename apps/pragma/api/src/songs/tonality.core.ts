/**
 * Derive a song's start / end tonality from a ChordPro source. The
 * rule is intentionally simple: scan the first line that carries a
 * recognisable chord token, and (separately) the last such line, and
 * return the chord's root + quality string.
 *
 * Recognised chord shape: `C`, `Cm`, `C#`, `Bb`, `F#m`, `Dmaj7`,
 * `G/B` (slash chord — only the root is reported), etc. The token
 * matched is the FIRST bracketed `[...]` on the line — ChordPro's
 * canonical chord-in-lyric syntax — or, failing that, the first
 * whitespace-separated token that looks like a chord on a line where
 * every token looks like a chord (the "chord line above lyrics"
 * convention).
 *
 * Output is the chord's root + quality, e.g. `C`, `F#m`, `Dmaj7`.
 * Ambiguous / missing → null. The UI shows null as an empty input and
 * lets the user override.
 *
 * Pure function over a string. No I/O, no `now`.
 */

const CHORD_ROOT_REGEX = /^[A-G][#b]?/;
const CHORD_QUALITY_REGEX = /^(?:maj7|min7|m7|maj|min|m|sus2|sus4|sus|dim|aug|7|6|9|11|13)/;
const BRACKETED_CHORD_REGEX = /\[[^\]]*\]/g;
const BRACKET_DELIMITER_LENGTH = 1;

export interface ChordTonality {
  root: string;
  quality: string;
}

function parseChord(rawChord: string): ChordTonality | null {
  const rootMatch = CHORD_ROOT_REGEX.exec(rawChord);
  if (rootMatch === null) return null;
  const root = rootMatch[0];
  const qualityMatch = CHORD_QUALITY_REGEX.exec(rawChord.slice(root.length));
  return { root, quality: qualityMatch === null ? '' : qualityMatch[0] };
}

function chordsOnLine(line: string): readonly ChordTonality[] {
  const bracketedMatches = [...line.matchAll(BRACKETED_CHORD_REGEX)];
  if (bracketedMatches.length > 0) {
    const bracketedChords: ChordTonality[] = [];
    for (const match of bracketedMatches) {
      const inner = match[0].slice(BRACKET_DELIMITER_LENGTH, -BRACKET_DELIMITER_LENGTH);
      const parsed = parseChord(inner);
      if (parsed !== null) bracketedChords.push(parsed);
    }
    return bracketedChords;
  }
  const chordOnlyLine: ChordTonality[] = [];
  for (const token of line.trim().split(/\s+/)) {
    const parsed = parseChord(token);
    if (parsed === null) return [];
    chordOnlyLine.push(parsed);
  }
  return chordOnlyLine;
}

function formatChord(chord: ChordTonality): string {
  return `${chord.root}${chord.quality}`;
}

export function deriveTonality(chordProSource: string): {
  start: string | null;
  end: string | null;
} {
  const lines = chordProSource.split('\n');
  let start: ChordTonality | null = null;
  let end: ChordTonality | null = null;
  for (const line of lines) {
    for (const chord of chordsOnLine(line)) {
      start ??= chord;
      end = chord;
    }
  }
  return {
    start: start === null ? null : formatChord(start),
    end: end === null ? null : formatChord(end),
  };
}

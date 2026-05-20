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

const CHORD_REGEX = /^([A-G][#b]?)(maj7|min7|m7|maj|min|m|sus2|sus4|sus|dim|aug|7|6|9|11|13)?/;
const BRACKETED_CHORD_REGEX = /\[([^\]]*)\]/g;

export interface ChordTonality {
  root: string;
  quality: string;
}

function parseChord(rawChord: string): ChordTonality | null {
  const beforeSlash = rawChord.split('/')[0] ?? rawChord;
  const match = CHORD_REGEX.exec(beforeSlash);
  if (match === null) return null;
  const root = match[1];
  if (root === undefined) return null;
  const quality = match[2] ?? '';
  // Ensure we consumed something meaningful — the regex never matches
  // an empty root because it anchors `[A-G]`.
  return { root, quality };
}

function chordsOnLine(line: string): readonly ChordTonality[] {
  const bracketedMatches = [...line.matchAll(BRACKETED_CHORD_REGEX)];
  if (bracketedMatches.length > 0) {
    const chords: ChordTonality[] = [];
    for (const match of bracketedMatches) {
      const inner = match[1] ?? '';
      const parsed = parseChord(inner);
      if (parsed !== null) chords.push(parsed);
    }
    return chords;
  }
  const tokens = line
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return [];
  const chords = tokens.map(parseChord);
  // Treat the line as a chord-only line iff EVERY token parses.
  if (chords.some((chord) => chord === null)) return [];
  return chords.filter((chord): chord is ChordTonality => chord !== null);
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
    const chords = chordsOnLine(line);
    if (chords.length === 0) continue;
    if (start === null) start = chords[0] ?? null;
    const last = chords[chords.length - 1];
    if (last !== undefined) end = last;
  }
  return {
    start: start === null ? null : formatChord(start),
    end: end === null ? null : formatChord(end),
  };
}

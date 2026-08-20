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
      const chord = parseChord(inner);
      if (chord !== null) bracketedChords.push(chord);
    }
    return bracketedChords;
  }
  const chordOnlyLine: ChordTonality[] = [];
  for (const token of line.trim().split(/\s+/)) {
    const chord = parseChord(token);
    if (chord === null) return [];
    chordOnlyLine.push(chord);
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

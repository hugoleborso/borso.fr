/** @Feature songs */

const CHORD_SYMBOL_PATTERN =
  /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|\+)?\d*(?:(?:maj|add|sus|b|#|\+|-)\d+)*(?:\/[A-G][#b]?)?$/;
const BAR_SEPARATORS = new Set(['|', '||', '/', '%']);
const BRACKETED_TOKEN_PATTERN = /\[[^\]]+\]/g;
const DIRECTIVE_LINE_PATTERN = /^\s*\{[a-zA-Z_]+(?::[^}]*)?\}\s*$/;
const SECTION_LABEL_PATTERN = /^\s*\[([^\]]+)\]\s*$/;
const WORD_PATTERN = /\S+/g;
const LINE_BREAK_PATTERN = /\r\n?/g;
const TAB_STOP = 8;
const TAB_STAFF_LINE_PATTERN =
  /^\s*(?:[A-Ga-g][#b]?\s*)?\|[-\d|hpbrsvx/\\~()<>^*.: ]*-{2}[-\d|hpbrsvx/\\~()<>^*.: ]*$/;
const TAB_BLOCK_START_PATTERN = /^\s*\{(?:start_of_tab|sot)(?::[^}]*)?\}\s*$/;
const TAB_BLOCK_END_PATTERN = /^\s*\{(?:end_of_tab|eot)\}\s*$/;
const TAB_BLOCK_START = '{start_of_tab}';
const TAB_BLOCK_END = '{end_of_tab}';

export interface ChordConversion {
  readonly chordPro: string;
  readonly hasChords: boolean;
  readonly isChanged: boolean;
}

interface PlacedChord {
  readonly column: number;
  readonly symbol: string;
}

export function isChordSymbol(token: string): boolean {
  return CHORD_SYMBOL_PATTERN.test(token);
}

function expandTabs(line: string): string {
  let expanded = '';
  for (const character of line) {
    if (character === '\t') {
      expanded += ' '.repeat(TAB_STOP - (expanded.length % TAB_STOP));
      continue;
    }
    expanded += character;
  }
  return expanded;
}

function readWords(line: string): readonly PlacedChord[] {
  return [...line.matchAll(WORD_PATTERN)].map((match) => ({
    column: match.index,
    symbol: match[0],
  }));
}

export function isChordLine(line: string): boolean {
  const words = readWords(line);
  const chords = words.filter((word) => isChordSymbol(word.symbol));
  if (chords.length === 0) return false;
  return words.every((word) => isChordSymbol(word.symbol) || BAR_SEPARATORS.has(word.symbol));
}

function hasBracketedChord(line: string): boolean {
  return [...line.matchAll(BRACKETED_TOKEN_PATTERN)].some((match) =>
    isChordSymbol(match[0].slice(1, -1)),
  );
}

export function isChordPro(text: string): boolean {
  return text
    .split('\n')
    .some((line) => DIRECTIVE_LINE_PATTERN.test(line) || hasBracketedChord(line));
}

export function isTabStaffLine(line: string): boolean {
  return TAB_STAFF_LINE_PATTERN.test(line);
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function hasTabStaffAhead(lines: readonly string[], from: number): boolean {
  for (const line of lines.slice(from)) {
    if (isTabStaffLine(line)) return true;
    if (!isBlank(line) && !isChordLine(line)) return false;
  }
  return false;
}

function fenceTabStaves(lines: readonly string[]): readonly string[] {
  const fenced: string[] = [];
  let isInsideAuthoredTab = false;
  let isInsideFence = false;
  for (const [index, line] of lines.entries()) {
    if (isInsideFence && !hasTabStaffAhead(lines, index)) {
      fenced.push(TAB_BLOCK_END);
      isInsideFence = false;
    }
    if (TAB_BLOCK_START_PATTERN.test(line)) isInsideAuthoredTab = true;
    if (TAB_BLOCK_END_PATTERN.test(line)) isInsideAuthoredTab = false;
    if (!isInsideFence && !isInsideAuthoredTab && isTabStaffLine(line)) {
      const lineAbove = fenced.at(-1);
      const chordLineAbove =
        lineAbove !== undefined && isChordLine(lineAbove) ? fenced.pop() : undefined;
      fenced.push(TAB_BLOCK_START);
      if (chordLineAbove !== undefined) fenced.push(chordLineAbove);
      isInsideFence = true;
    }
    fenced.push(line);
  }
  if (isInsideFence) fenced.push(TAB_BLOCK_END);
  return fenced;
}

function placeChordsInLyric(chords: readonly PlacedChord[], lyric: string): string {
  let merged = lyric;
  for (const chord of chords.toReversed()) {
    const padded = merged.padEnd(chord.column, ' ');
    merged = `${padded.slice(0, chord.column)}[${chord.symbol}]${padded.slice(chord.column)}`;
  }
  return merged.trimEnd();
}

function bracketChordLine(line: string): string {
  return line.replaceAll(WORD_PATTERN, (word) => (isChordSymbol(word) ? `[${word}]` : word)).trim();
}

function rewriteSectionLabel(line: string): string {
  const label = SECTION_LABEL_PATTERN.exec(line)?.[1];
  if (label === undefined || isChordSymbol(label)) return line;
  return `{comment: ${label.trim()}}`;
}

function isLyricLine(line: string): boolean {
  return line.trim().length > 0 && !isChordLine(line) && !SECTION_LABEL_PATTERN.test(line);
}

function readChords(line: string): readonly PlacedChord[] {
  return readWords(line).filter((word) => isChordSymbol(word.symbol));
}

// @FollowsBlueprint core-projection
export function convertChordsAboveLyrics(pastedText: string): ChordConversion {
  const text = pastedText.replace(LINE_BREAK_PATTERN, '\n');
  const fencedText = fenceTabStaves(text.split('\n')).join('\n');
  const isFenced = fencedText !== text;
  if (isChordPro(text)) return { chordPro: fencedText, hasChords: true, isChanged: isFenced };
  const fencedLines = fenceTabStaves(text.split('\n').map(expandTabs));
  const converted: string[] = [];
  let pendingChordLine: string | null = null;
  let hasChords = false;
  let isInsideTab = false;
  for (const line of fencedLines) {
    if (TAB_BLOCK_START_PATTERN.test(line)) isInsideTab = true;
    if (isInsideTab) {
      converted.push(line);
      if (TAB_BLOCK_END_PATTERN.test(line)) isInsideTab = false;
      continue;
    }
    if (pendingChordLine !== null && isLyricLine(line)) {
      converted.push(placeChordsInLyric(readChords(pendingChordLine), line));
      pendingChordLine = null;
      continue;
    }
    if (pendingChordLine !== null) converted.push(bracketChordLine(pendingChordLine));
    pendingChordLine = null;
    if (isChordLine(line)) {
      hasChords = true;
      pendingChordLine = line;
      continue;
    }
    converted.push(rewriteSectionLabel(line));
  }
  if (pendingChordLine !== null) converted.push(bracketChordLine(pendingChordLine));
  if (!hasChords) return { chordPro: fencedText, hasChords: false, isChanged: isFenced };
  return { chordPro: converted.join('\n'), hasChords: true, isChanged: true };
}

export type ChordChartSource = 'paste' | 'photo' | 'pdf';

export interface ChordChartAdded {
  readonly source: ChordChartSource;
  readonly converted: boolean;
}

export function describeChordChartAdded(
  source: ChordChartSource,
  text: string | null,
): ChordChartAdded {
  return { source, converted: text !== null && convertChordsAboveLyrics(text).isChanged };
}

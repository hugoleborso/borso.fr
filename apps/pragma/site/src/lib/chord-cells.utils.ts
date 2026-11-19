/** @Feature songs */

import type { LineToken } from './chordpro.utils';

export interface ChordCell {
  readonly chord: string | null;
  readonly lyric: string;
}

const LYRIC_FRAGMENT_PATTERN = /^\s*\S*\s*|\S+\s*/g;

function splitLyricIntoWords(text: string): readonly string[] {
  return [...text.matchAll(LYRIC_FRAGMENT_PATTERN)].map((match) => match[0]);
}

// @FollowsBlueprint utils-pure-module
export function buildChordCells(tokens: readonly LineToken[]): readonly ChordCell[] {
  const cells: ChordCell[] = [];
  let pendingChord: string | null = null;
  for (const token of tokens) {
    if (token.kind === 'chord') {
      if (pendingChord !== null) cells.push({ chord: pendingChord, lyric: '' });
      pendingChord = token.chord;
      continue;
    }
    for (const word of splitLyricIntoWords(token.text)) {
      cells.push({ chord: pendingChord, lyric: word });
      pendingChord = null;
    }
  }
  if (pendingChord !== null) cells.push({ chord: pendingChord, lyric: '' });
  return cells;
}

const ENDS_IN_SPACE_PATTERN = /\s$/;

export function groupCellsIntoWords(
  cells: readonly ChordCell[],
): readonly (readonly ChordCell[])[] {
  const words: ChordCell[][] = [];
  let currentWord: ChordCell[] = [];
  for (const cell of cells) {
    currentWord.push(cell);
    if (ENDS_IN_SPACE_PATTERN.test(cell.lyric)) {
      words.push(currentWord);
      currentWord = [];
    }
  }
  if (currentWord.length > 0) words.push(currentWord);
  return words;
}

const REPEAT_MARK_PATTERN = /\bx\d+\b/gi;
const LETTER_PATTERN = /\p{L}/u;

function isLyricWording(text: string): boolean {
  return LETTER_PATTERN.test(text.replace(REPEAT_MARK_PATTERN, ''));
}

export function hasLyricText(tokens: readonly LineToken[]): boolean {
  return tokens.some((token) => token.kind === 'lyric' && isLyricWording(token.text));
}

export const CHORD_NAME_PATTERN =
  /(?<!\p{L})[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|\d|[#b+-](?=\d))*(?:\/[A-G][#b]?)?(?![\p{L}\d#])/gu;

export interface TextSegment {
  readonly text: string;
  readonly isChord: boolean;
}

export function splitChordNames(text: string): readonly TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(CHORD_NAME_PATTERN)) {
    if (match.index > cursor)
      segments.push({ text: text.slice(cursor, match.index), isChord: false });
    segments.push({ text: match[0], isChord: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), isChord: false });
  return segments;
}

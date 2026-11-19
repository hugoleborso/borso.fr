/** @Feature songs */

import type { ChordLine, ChordProLine, DirectiveLine, PlainLine } from './chordpro.utils';

const COMMENT_DIRECTIVE_NAMES = new Set(['comment', 'c', 'comment_italic', 'ci']);
const SOLO_WORD_PATTERN = /\bsolo\b/i;
const PARENTHESISED_PATTERN = /\([^)]*\)/g;
const LYRIC_WORD_PATTERN = /\p{L}{2,}/u;
const CHORD_NAME_PATTERN =
  /(?<!\p{L})[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|\d|[#b+-](?=\d))*(?:\/[A-G][#b]?)?(?![\p{L}\d#])/gu;
const CHORD_GAP = ' ';

// @FollowsBlueprint utils-pure-module
export function isCommentDirective(directiveName: string): boolean {
  return COMMENT_DIRECTIVE_NAMES.has(directiveName);
}

export function isSoloComment(line: DirectiveLine): boolean {
  return isCommentDirective(line.name) && SOLO_WORD_PATTERN.test(line.value);
}

function lyricTextOf(line: ChordLine | PlainLine): string {
  if (line.kind === 'plain-line') return line.text;
  return line.tokens.map((token) => (token.kind === 'lyric' ? token.text : CHORD_GAP)).join('');
}

export function isLyricLine(line: ChordProLine): boolean {
  if (line.kind !== 'chord-line' && line.kind !== 'plain-line') return false;
  const words = lyricTextOf(line)
    .replace(PARENTHESISED_PATTERN, '')
    .replace(CHORD_NAME_PATTERN, '');
  return LYRIC_WORD_PATTERN.test(words);
}

export interface ImplicitSoloProgress {
  readonly hasRows: boolean;
  readonly isAfterBlank: boolean;
}

export const IMPLICIT_SOLO_OPENED: ImplicitSoloProgress = { hasRows: false, isAfterBlank: false };

function isParagraphLine(line: ChordProLine): boolean {
  return line.kind !== 'blank' && line.kind !== 'directive';
}

export function hasLyricsInParagraph(upcoming: readonly ChordProLine[]): boolean {
  for (const line of upcoming) {
    if (!isParagraphLine(line)) return false;
    if (isLyricLine(line)) return true;
  }
  return false;
}

export function shouldEndImplicitSolo(
  line: ChordProLine,
  upcoming: readonly ChordProLine[],
  progress: ImplicitSoloProgress,
): boolean {
  if (line.kind === 'directive') return progress.hasRows || !isCommentDirective(line.name);
  return progress.isAfterBlank && hasLyricsInParagraph(upcoming);
}

export function advanceImplicitSolo(
  progress: ImplicitSoloProgress,
  line: ChordProLine,
): ImplicitSoloProgress {
  const isBlank = line.kind === 'blank';
  return {
    hasRows: progress.hasRows || (!isBlank && line.kind !== 'directive'),
    isAfterBlank: isBlank && progress.hasRows,
  };
}

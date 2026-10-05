import { readCapture } from './text.core';

export interface FrontMatterDocument {
  readonly frontMatter: Readonly<Record<string, string>>;
  readonly body: string;
}

const FENCE = '---';
const LINE_BREAK = '\n';
const KEY_VALUE_PATTERN = /^(?<key>[\p{L}_][\p{L}\p{N}_'-]*)\s*:(?<value>.*)$/u;
const INLINE_COMMENT_PATTERN = /\s+#.*$/;
const QUOTED_VALUE_PATTERN = /^(?<quote>["'])(?<value>.*)\k<quote>$/;

interface FencedRange {
  readonly lines: readonly string[];
  readonly closingIndex: number;
}

const OPENING_FENCE_PATTERN = /^---[ \t]*(?:\n|$)/;

function normalizeLineBreaks(markdown: string): string {
  return markdown.replaceAll('\r\n', LINE_BREAK);
}

function findFencedRange(markdown: string): FencedRange | null {
  const normalized = normalizeLineBreaks(markdown);
  if (!OPENING_FENCE_PATTERN.test(normalized)) return null;
  const lines = normalized.split(LINE_BREAK);
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trimEnd() === FENCE);
  if (closingIndex === -1) return null;
  return { lines, closingIndex };
}

function readScalar(rawValue: string): string {
  const trimmed = rawValue.trim();
  const quoted = QUOTED_VALUE_PATTERN.exec(trimmed);
  if (quoted !== null) return readCapture(quoted, 'value');
  return trimmed.replace(INLINE_COMMENT_PATTERN, '');
}

function readKeyValue(line: string): readonly [string, string] | null {
  const match = KEY_VALUE_PATTERN.exec(line);
  if (match === null) return null;
  return [readCapture(match, 'key'), readScalar(readCapture(match, 'value'))];
}

// @FollowsBlueprint core-parse-untrusted
export function splitFrontMatter(markdown: string): FrontMatterDocument {
  const range = findFencedRange(markdown);
  if (range === null) return { frontMatter: {}, body: normalizeLineBreaks(markdown) };
  const pairs = range.lines
    .slice(1, range.closingIndex)
    .map(readKeyValue)
    .filter((pair) => pair !== null);
  return {
    frontMatter: Object.fromEntries(pairs),
    body: range.lines.slice(range.closingIndex + 1).join(LINE_BREAK),
  };
}

function isLineForKey(line: string, key: string): boolean {
  return readKeyValue(line)?.[0] === key;
}

export function setFrontMatterValue(markdown: string, key: string, value: string): string {
  const range = findFencedRange(markdown);
  const assignment = `${key}: ${value}`;
  if (range === null) return [FENCE, assignment, FENCE, markdown].join(LINE_BREAK);
  const header = range.lines.slice(1, range.closingIndex);
  const existingIndex = header.findIndex((line) => isLineForKey(line, key));
  const updatedHeader =
    existingIndex === -1
      ? [...header, assignment]
      : header.map((line, index) => (index === existingIndex ? assignment : line));
  return [FENCE, ...updatedHeader, ...range.lines.slice(range.closingIndex)].join(LINE_BREAK);
}

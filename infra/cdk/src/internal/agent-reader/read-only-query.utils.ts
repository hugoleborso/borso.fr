const ALLOWED_FIRST_KEYWORDS: ReadonlySet<string> = new Set(['select', 'with']);

const FORBIDDEN_KEYWORDS: ReadonlySet<string> = new Set([
  'insert',
  'update',
  'delete',
  'merge',
  'create',
  'alter',
  'drop',
  'grant',
  'revoke',
  'truncate',
  'copy',
  'call',
  'do',
  'set',
  'reset',
  'into',
  'lock',
  'share',
  'begin',
  'start',
  'commit',
  'rollback',
  'savepoint',
  'release',
  'prepare',
  'execute',
  'deallocate',
  'listen',
  'notify',
  'unlisten',
  'discard',
  'vacuum',
  'refresh',
  'set_config',
]);

const WORD_PATTERN = /[a-z_][a-z0-9_$]*/gi;
const KEYWORD_END_PATTERN = /[^a-z_]|$/i;
const LEADING_PARENTHESES_PATTERN = /^[\s(]*/;
const TRAILING_TERMINATOR_PATTERN = /;\s*$/;
const SPAN_OPENER_PATTERN = /'|"|--|\/\*|(?<![\w$])\$(?:[a-z_]\w*)?\$/gi;
const STANDARD_STRING_PATTERN = /^'[^']*'/;
const ESCAPE_STRING_PATTERN = /^'(?:[^'\\]|''|\\.)*'/s;
const BLOCK_COMMENT_MARKER_PATTERN = /\/\*|\*\//g;
const ESCAPE_STRING_PREFIX_PATTERN = /e/i;
const IDENTIFIER_CHARACTER_PATTERN = /[\w$]/;
const CHARACTER_BEFORE_THE_ESCAPE_PREFIX = 2;
const NOT_FOUND = -1;
const BLANK = ' ';
const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKSLASH = '\\';
const STATEMENT_SEPARATOR = ';';
const LINE_COMMENT_OPENER = '--';
const BLOCK_COMMENT_OPENER = '/*';
const BLOCK_COMMENT_CLOSER = '*/';
const NEWLINE = '\n';
export const ROW_CAP = 200;

export type QueryDecision =
  | { readonly accepted: true; readonly statement: string }
  | { readonly accepted: false; readonly reason: string };

interface MaskedSource {
  readonly code: string;
  readonly unterminated: string | undefined;
}

function blankOut(text: string): string {
  return text.replaceAll(/[^\n]/g, BLANK);
}

function endOfMatch(anchoredPattern: RegExp, source: string, start: number): number {
  const match = anchoredPattern.exec(source.slice(start));
  return match === null ? NOT_FOUND : start + match[0].length;
}

function closeBlockCommentFrom(source: string, from: number): number {
  BLOCK_COMMENT_MARKER_PATTERN.lastIndex = from;
  const marker = BLOCK_COMMENT_MARKER_PATTERN.exec(source);
  if (marker === null) return NOT_FOUND;
  const afterMarker = BLOCK_COMMENT_MARKER_PATTERN.lastIndex;
  if (marker[0] === BLOCK_COMMENT_CLOSER) return afterMarker;
  const innerEnd = closeBlockCommentFrom(source, afterMarker);
  return innerEnd === NOT_FOUND ? NOT_FOUND : closeBlockCommentFrom(source, innerEnd);
}

function endOfLineComment(source: string, start: number): number {
  const newline = source.indexOf(NEWLINE, start);
  return newline === NOT_FOUND ? source.length : newline;
}

function endOfDelimited(source: string, start: number, delimiter: string): number {
  const closer = source.indexOf(delimiter, start + delimiter.length);
  return closer === NOT_FOUND ? NOT_FOUND : closer + delimiter.length;
}

function isEscapeStringPrefix(source: string, quoteIndex: number): boolean {
  return (
    ESCAPE_STRING_PREFIX_PATTERN.test(source.charAt(quoteIndex - 1)) &&
    !IDENTIFIER_CHARACTER_PATTERN.test(
      source.charAt(quoteIndex - CHARACTER_BEFORE_THE_ESCAPE_PREFIX),
    )
  );
}

function endOfSpan(source: string, start: number, opener: string): number {
  if (opener === SINGLE_QUOTE) {
    const pattern = isEscapeStringPrefix(source, start)
      ? ESCAPE_STRING_PATTERN
      : STANDARD_STRING_PATTERN;
    return endOfMatch(pattern, source, start);
  }
  if (opener === LINE_COMMENT_OPENER) return endOfLineComment(source, start);
  if (opener === BLOCK_COMMENT_OPENER) {
    return closeBlockCommentFrom(source, start + BLOCK_COMMENT_OPENER.length);
  }
  return endOfDelimited(source, start, opener);
}

function kindOfUnterminatedSpan(opener: string): string {
  if (opener === SINGLE_QUOTE) return 'string';
  if (opener === DOUBLE_QUOTE) return 'quoted identifier';
  if (opener === BLOCK_COMMENT_OPENER) return 'comment';
  return 'dollar-quoted string';
}

function maskSpan(span: string, opener: string, shouldKeepQuotedIdentifiers: boolean): string {
  if (shouldKeepQuotedIdentifiers && opener === DOUBLE_QUOTE) {
    return BLANK + span.slice(1, -1) + BLANK;
  }
  return blankOut(span);
}

export function maskLiteralsAndComments(
  source: string,
  from = 0,
  shouldKeepQuotedIdentifiers = false,
): MaskedSource {
  SPAN_OPENER_PATTERN.lastIndex = from;
  const opener = SPAN_OPENER_PATTERN.exec(source);
  if (opener === null) return { code: source.slice(from), unterminated: undefined };
  const leadingCode = source.slice(from, opener.index);
  const end = endOfSpan(source, opener.index, opener[0]);
  if (end === NOT_FOUND) {
    return { code: leadingCode, unterminated: kindOfUnterminatedSpan(opener[0]) };
  }
  const rest = maskLiteralsAndComments(source, end, shouldKeepQuotedIdentifiers);
  return {
    code:
      leadingCode +
      maskSpan(source.slice(opener.index, end), opener[0], shouldKeepQuotedIdentifiers) +
      rest.code,
    unterminated: rest.unterminated,
  };
}

function firstKeyword(code: string): string {
  const rest = code.replace(LEADING_PARENTHESES_PATTERN, '');
  return rest.slice(0, rest.search(KEYWORD_END_PATTERN)).toLowerCase();
}

function forbiddenKeywordsIn(code: string): string[] {
  const words = Array.from(code.matchAll(WORD_PATTERN), ([word]) => word.toLowerCase());
  return [...new Set(words.filter((word) => FORBIDDEN_KEYWORDS.has(word)))];
}

function refuse(reason: string): QueryDecision {
  return { accepted: false, reason };
}

// @FollowsBlueprint utils-pure-module
export function decideReadOnlyQuery(source: string): QueryDecision {
  const masked = maskLiteralsAndComments(source);
  if (masked.unterminated !== undefined) {
    return refuse(`the query has an unterminated ${masked.unterminated}.`);
  }
  const code = masked.code.replace(TRAILING_TERMINATOR_PATTERN, '');
  if (code.trim() === '') return refuse('the query is empty.');
  if (code.includes(STATEMENT_SEPARATOR)) {
    return refuse('the query holds more than one statement; send exactly one.');
  }
  if (code.includes(BACKSLASH)) {
    return refuse('the query holds a backslash outside a string, which psql reads as a command.');
  }
  const keyword = firstKeyword(code);
  if (!ALLOWED_FIRST_KEYWORDS.has(keyword)) {
    return refuse(`the query must start with SELECT or WITH, not "${keyword}".`);
  }
  const forbidden = forbiddenKeywordsIn(code);
  if (forbidden.length > 0) {
    return refuse(
      `the query uses ${forbidden.join(', ').toUpperCase()}, which a read never needs.`,
    );
  }
  return { accepted: true, statement: source.slice(0, code.trimEnd().length) };
}

export function listBlocklistedTables(source: string, blocklist: readonly string[]): string[] {
  const { code } = maskLiteralsAndComments(source, 0, true);
  const words = new Set(Array.from(code.matchAll(WORD_PATTERN), ([word]) => word.toLowerCase()));
  return blocklist.filter((table) => words.has(table));
}

export function decideTableAccess(source: string, blocklist: readonly string[]): QueryDecision {
  const named = listBlocklistedTables(source, blocklist);
  if (named.length > 0) {
    return refuse(
      `the query names ${named.join(', ')}, which the reader cannot read: those tables hold credentials, keys or tokens (ADR-0044).`,
    );
  }
  return { accepted: true, statement: source };
}

export type ReadOnlySessionCommands = readonly [
  begin: string,
  cappedSelect: string,
  rollback: string,
];

export function buildReadOnlySessionCommands(
  statement: string,
  rowCap: number,
): ReadOnlySessionCommands {
  return [
    'BEGIN READ ONLY',
    `SELECT * FROM (\n${statement}\n) AS capped_result LIMIT ${String(rowCap)}`,
    'ROLLBACK',
  ];
}

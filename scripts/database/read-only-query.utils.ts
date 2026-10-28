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
const ARGUMENT_SEPARATOR = '--';

export const DEFAULT_APP = 'pragma';
export const DEFAULT_STAGE = 'prod';
export const ROW_CAP = 200;

const READER_ROLE_PREFIX = 'ai_reader_';
const SCHEMA_RESOURCE_TYPE = 'AWS::CloudFormation::CustomResource';

const READABLE_SCHEMA_BY_TARGET: ReadonlyMap<string, string> = new Map([
  ['pragma/prod', 'prod'],
  ['last-loop-lepin/prod', 'prod'],
  ['banana-rush/prod', 'prod'],
]);
const READABLE_TARGETS_LABEL = [...READABLE_SCHEMA_BY_TARGET.keys()]
  .map((target) => `APP=${target.replace('/', ' STAGE=')}`)
  .join(', ');
const PRIVATE_APP = 'talos';
const PRIVATE_APP_REFUSAL =
  'talos holds private data and has no read-only role by design (ADR-0044). Query it through its agent API, POST /api/agent/sql with an agent token (ADR-0039).';

export type QueryDecision =
  | { readonly accepted: true; readonly statement: string }
  | { readonly accepted: false; readonly reason: string };

export type TargetDecision =
  | {
      readonly accepted: true;
      readonly app: string;
      readonly schemaName: string;
      readonly roleName: string;
      readonly stackName: string;
    }
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
    !IDENTIFIER_CHARACTER_PATTERN.test(source.charAt(quoteIndex - 2))
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

export const READER_NOT_PROVISIONED_REFUSAL =
  'the deployed stack carries no read-only reader, so no table blocklist can be read from it and every table would look readable. ' +
  'The production deploy that provisions the reader has not run for this application yet (ADR-0044).';

export function decideTableAccess(source: string, blocklist: readonly string[]): QueryDecision {
  const named = listBlocklistedTables(source, blocklist);
  if (named.length > 0) {
    return refuse(
      `the query names ${named.join(', ')}, which the reader cannot read: those tables hold credentials, keys or tokens (ADR-0044).`,
    );
  }
  return { accepted: true, statement: source };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isAReaderRoleName(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

export type ReaderProvisioning =
  | { readonly provisioned: true; readonly blocklist: string[] }
  | { readonly provisioned: false };

export function readReaderProvisioning(template: unknown): ReaderProvisioning {
  if (!isRecord(template) || !isRecord(template.Resources)) return { provisioned: false };
  for (const resource of Object.values(template.Resources)) {
    if (!isRecord(resource) || resource.Type !== SCHEMA_RESOURCE_TYPE) continue;
    if (!isRecord(resource.Properties)) continue;
    if (!isAReaderRoleName(resource.Properties.readerRoleName)) continue;
    const blocklist = resource.Properties.readerTableBlocklist;
    return { provisioned: true, blocklist: isStringList(blocklist) ? blocklist : [] };
  }
  return { provisioned: false };
}

export function decideReadTarget(app: string, stage: string): TargetDecision {
  if (app === PRIVATE_APP) return { accepted: false, reason: PRIVATE_APP_REFUSAL };
  const schemaName = READABLE_SCHEMA_BY_TARGET.get(`${app}/${stage}`);
  if (schemaName === undefined) {
    return {
      accepted: false,
      reason: `no read-only role exists for APP=${app} STAGE=${stage}. Readable: ${READABLE_TARGETS_LABEL} (ADR-0044).`,
    };
  }
  return {
    accepted: true,
    app,
    schemaName,
    roleName: `${READER_ROLE_PREFIX}${schemaName}`,
    stackName: `${app}-${stage}`,
  };
}

export function buildReadOnlySessionCommands(statement: string, rowCap: number): string[] {
  return [
    'BEGIN READ ONLY',
    `SELECT * FROM (\n${statement}\n) AS capped_result LIMIT ${String(rowCap)}`,
    'ROLLBACK',
  ];
}

export function readQueryArguments(argumentsAfterScript: readonly string[]): string {
  const withoutSeparator =
    argumentsAfterScript[0] === ARGUMENT_SEPARATOR
      ? argumentsAfterScript.slice(1)
      : argumentsAfterScript;
  return withoutSeparator.join(BLANK);
}

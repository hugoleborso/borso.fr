const STATEMENT_BREAKPOINT = '--> statement-breakpoint';
const LINE_COMMENT_PATTERN = /--[^\n]*/g;
const MASKED_CHARACTER = '\u0001';

function maskLineComments(statement: string): string {
  return statement.replace(LINE_COMMENT_PATTERN, (comment) =>
    MASKED_CHARACTER.repeat(comment.length),
  );
}

function rewriteOutsideComments(
  statement: string,
  pattern: RegExp,
  substitute: (found: RegExpExecArray) => string,
): string {
  const found = pattern.exec(maskLineComments(statement));
  if (found === null) return statement;
  const end = found.index + found[0].length;
  return statement.slice(0, found.index) + substitute(found) + statement.slice(end);
}

const IDEMPOTENT_REWRITES: readonly (readonly [RegExp, string])[] = [
  [/\bCREATE\s+TABLE(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'CREATE TABLE IF NOT EXISTS'],
  [/\bCREATE\s+UNIQUE\s+INDEX(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'CREATE UNIQUE INDEX IF NOT EXISTS'],
  [/\bCREATE\s+INDEX(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'CREATE INDEX IF NOT EXISTS'],
  [/\bCREATE\s+SCHEMA(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'CREATE SCHEMA IF NOT EXISTS'],
  [/\bADD\s+COLUMN(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'ADD COLUMN IF NOT EXISTS'],
];

const ALREADY_ASYNC_INDEX = /\bINDEX\s+ASYNC\b/i;
const ALREADY_ASYNC_AFTER_IF_NOT_EXISTS = /\bIF\s+NOT\s+EXISTS\s+ASYNC\b/i;
const GAP_AFTER_CREATE_INDEX = /(?<=\bCREATE\s+(?:UNIQUE\s+)?INDEX)\s+/i;
const CREATE_INDEX_ANYWHERE = /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i;

export function makeIdempotent(statement: string): string {
  return IDEMPOTENT_REWRITES.reduce(
    (rewritten, [pattern, replacement]) =>
      rewriteOutsideComments(rewritten, pattern, () => replacement),
    statement,
  );
}

export function stripUsingClause(statement: string): string {
  return statement.replace(/\)\s+USING\s+\w+\s+/i, ') ').replace(/\bUSING\s+\w+\s+\(/i, '(');
}

export function asyncifyIndex(statement: string): string {
  if (!CREATE_INDEX_ANYWHERE.test(maskLineComments(statement))) return statement;
  const withoutAsync = rewriteOutsideComments(
    rewriteOutsideComments(statement, ALREADY_ASYNC_INDEX, () => 'INDEX'),
    ALREADY_ASYNC_AFTER_IF_NOT_EXISTS,
    () => 'IF NOT EXISTS',
  );
  return rewriteOutsideComments(withoutAsync, GAP_AFTER_CREATE_INDEX, () => ' ASYNC ');
}

// @FollowsBlueprint utils-pure-module
export function splitStatements(sql: string): readonly string[] {
  return sql
    .split(STATEMENT_BREAKPOINT)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => asyncifyIndex(stripUsingClause(makeIdempotent(chunk))));
}

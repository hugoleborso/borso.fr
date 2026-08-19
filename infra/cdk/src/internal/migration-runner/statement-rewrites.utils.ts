/**
 * The rewrites drizzle-kit's SQL needs before Aurora DSQL will accept it.
 *
 * Each function maps one string to another, so the migration runner keeps the
 * connection and the transactions, and the grammar rules stay testable by
 * calling them with a statement.
 *
 * See docs/knowledge/dsql-postgres-compat-gaps.md.
 */

const STATEMENT_BREAKPOINT = '--> statement-breakpoint';
const LINE_COMMENT_PATTERN = /--[^\n]*/g;
/** Stands in for a commented-out character. No SQL keyword or space matches it. */
const MASKED_CHARACTER = '\u0001';

/**
 * The statement with every line comment blanked out, character for character.
 *
 * Same length as the input, so an index into this string is an index into the
 * original. The filler matches nothing in the patterns below, so a match found
 * here is a match in real SQL rather than in prose.
 */
function maskLineComments(statement: string): string {
  return statement.replace(LINE_COMMENT_PATTERN, (comment) =>
    MASKED_CHARACTER.repeat(comment.length),
  );
}

/**
 * Apply one rewrite to the first match that is not inside a line comment.
 *
 * The rewrites here are deliberately not global, because a statement carries
 * one DDL verb and the first match is it. A `--` comment can carry the same
 * words though, and this repository's own migrations do, so a plain
 * `String.replace` lands the rewrite in the prose and leaves the statement it
 * describes without its `IF NOT EXISTS`.
 *
 * The match is found against the masked copy and spliced into the original, so
 * a comment reaches the database exactly as its author wrote it. The
 * substitution is a function rather than a `$1` string because the pattern
 * cannot be re-run against the matched text alone: its lookaheads read
 * characters the match does not contain.
 */
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

/** Each create-shape DDL drizzle-kit emits, and the idempotent form of it. */
const IDEMPOTENT_REWRITES: readonly (readonly [RegExp, string])[] = [
  [/\bCREATE\s+TABLE(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'CREATE TABLE IF NOT EXISTS'],
  [/\bCREATE\s+UNIQUE\s+INDEX(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'CREATE UNIQUE INDEX IF NOT EXISTS'],
  [/\bCREATE\s+INDEX(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'CREATE INDEX IF NOT EXISTS'],
  [/\bCREATE\s+SCHEMA(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'CREATE SCHEMA IF NOT EXISTS'],
  [/\bADD\s+COLUMN(?=\s)(?!\s+IF\s+NOT\s+EXISTS)/i, 'ADD COLUMN IF NOT EXISTS'],
];

/** The three shapes `asyncifyIndex` moves, in the order it applies them. */
const ALREADY_ASYNC_INDEX = /\bINDEX\s+ASYNC\b/i;
const ALREADY_ASYNC_AFTER_IF_NOT_EXISTS = /\bIF\s+NOT\s+EXISTS\s+ASYNC\b/i;
/**
 * The gap after the index keyword, found by lookbehind so there is no capture
 * group to read back. A group would be typed as possibly absent and the check
 * for that could never run, since the group participates whenever the pattern
 * matches at all.
 */
const GAP_AFTER_CREATE_INDEX = /(?<=\bCREATE\s+(?:UNIQUE\s+)?INDEX)\s+/i;
const CREATE_INDEX_ANYWHERE = /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i;

/**
 * Make a single DDL statement idempotent by injecting `IF NOT EXISTS`.
 *
 * Why: Aurora DSQL forbids multi-DDL transactions, so we ship each
 * statement in its own tx. If the migration is interrupted partway —
 * e.g. statement N succeeds, statement N+1 fails — the `_migrations`
 * marker is never written and the retry restarts from statement 1.
 * Without `IF NOT EXISTS`, re-creating the already-existing relations
 * from the previous partial run fails with `relation X already exists`
 * (or `column X already exists` for `ADD COLUMN`).
 *
 * Targets the create-shape DDL that drizzle-kit emits: `CREATE TABLE`,
 * `CREATE INDEX`, `CREATE UNIQUE INDEX`, `CREATE SCHEMA`, and
 * `ALTER TABLE ... ADD COLUMN`. Leaves everything else (INSERT, UPDATE,
 * SET, RENAME, …) alone — those are either re-entry-safe or carry their
 * own conditional shape.
 */
export function makeIdempotent(statement: string): string {
  return IDEMPOTENT_REWRITES.reduce(
    (rewritten, [pattern, replacement]) =>
      rewriteOutsideComments(rewritten, pattern, () => replacement),
    statement,
  );
}

/**
 * Strip the `USING <method>` access-method clause from CREATE INDEX.
 * Aurora DSQL doesn't accept it ("USING not supported for CREATE INDEX")
 * — DSQL only ships one storage layer, so naming btree explicitly is
 * meaningless to its planner. drizzle-kit always emits `USING btree`;
 * this rewrite drops it without touching the rest of the statement.
 */
export function stripUsingClause(statement: string): string {
  return statement.replace(/\)\s+USING\s+\w+\s+/i, ') ').replace(/\bUSING\s+\w+\s+\(/i, '(');
}

/**
 * Inject the `ASYNC` keyword into `CREATE [UNIQUE] INDEX` statements so
 * Aurora DSQL accepts them. DSQL rejects vanilla `CREATE INDEX` with
 * `unsupported mode. please use CREATE INDEX ASYNC` — non-primary indexes
 * are built asynchronously to keep schema changes online, and the engine
 * tracks the job in `sys.jobs`. drizzle-kit emits standard `CREATE INDEX`;
 * this rewrite slots `ASYNC` into the exact position the AWS grammar
 * demands: `CREATE [UNIQUE] INDEX ASYNC [IF NOT EXISTS] name ...`.
 *
 * Idempotent: statements that already contain `ASYNC` are passed through.
 * Non-CREATE-INDEX statements are passed through.
 *
 * See docs/knowledge/dsql-postgres-compat-gaps.md §11.
 */
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

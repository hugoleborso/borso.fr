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
  return statement
    .replace(/\bCREATE\s+TABLE(\s+(?!IF\s+NOT\s+EXISTS))/i, 'CREATE TABLE IF NOT EXISTS$1')
    .replace(
      /\bCREATE\s+UNIQUE\s+INDEX(\s+(?!IF\s+NOT\s+EXISTS))/i,
      'CREATE UNIQUE INDEX IF NOT EXISTS$1',
    )
    .replace(/\bCREATE\s+INDEX(\s+(?!IF\s+NOT\s+EXISTS))/i, 'CREATE INDEX IF NOT EXISTS$1')
    .replace(/\bCREATE\s+SCHEMA(\s+(?!IF\s+NOT\s+EXISTS))/i, 'CREATE SCHEMA IF NOT EXISTS$1')
    .replace(/\bADD\s+COLUMN(\s+(?!IF\s+NOT\s+EXISTS))/i, 'ADD COLUMN IF NOT EXISTS$1');
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
  if (!/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(statement)) return statement;
  const withoutAsync = statement
    .replace(/\bINDEX\s+ASYNC\s+/i, 'INDEX ')
    .replace(/\bIF\s+NOT\s+EXISTS\s+ASYNC\s+/i, 'IF NOT EXISTS ');
  return withoutAsync.replace(
    /\b(CREATE\s+(?:UNIQUE\s+)?INDEX)\s+(IF\s+NOT\s+EXISTS\s+)?/i,
    '$1 ASYNC $2',
  );
}

// @FollowsBlueprint utils-pure-module
export function splitStatements(sql: string): readonly string[] {
  return sql
    .split(STATEMENT_BREAKPOINT)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => asyncifyIndex(stripUsingClause(makeIdempotent(chunk))));
}

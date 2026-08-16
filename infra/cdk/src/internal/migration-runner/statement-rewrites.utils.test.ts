import { describe, expect, it } from 'vitest';
import {
  asyncifyIndex,
  makeIdempotent,
  splitStatements,
  stripUsingClause,
} from './statement-rewrites.utils.js';

// @FollowsBlueprint test-pure-unit
describe('makeIdempotent', () => {
  it('adds IF NOT EXISTS to CREATE TABLE', () => {
    expect(makeIdempotent('CREATE TABLE "runners" (id TEXT)')).toBe(
      'CREATE TABLE IF NOT EXISTS "runners" (id TEXT)',
    );
  });

  it('adds IF NOT EXISTS to CREATE UNIQUE INDEX before the plain CREATE INDEX rewrite', () => {
    expect(makeIdempotent('CREATE UNIQUE INDEX "runners_slug" ON "runners" (slug)')).toBe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "runners_slug" ON "runners" (slug)',
    );
  });

  it('adds IF NOT EXISTS to CREATE INDEX', () => {
    expect(makeIdempotent('CREATE INDEX "runners_slug" ON "runners" (slug)')).toBe(
      'CREATE INDEX IF NOT EXISTS "runners_slug" ON "runners" (slug)',
    );
  });

  it('adds IF NOT EXISTS to CREATE SCHEMA', () => {
    expect(makeIdempotent('CREATE SCHEMA "pr_27"')).toBe('CREATE SCHEMA IF NOT EXISTS "pr_27"');
  });

  it('adds IF NOT EXISTS to ADD COLUMN', () => {
    expect(makeIdempotent('ALTER TABLE "runners" ADD COLUMN "bib" TEXT')).toBe(
      'ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "bib" TEXT',
    );
  });

  it('leaves a statement that already says IF NOT EXISTS alone', () => {
    const statement = 'CREATE TABLE IF NOT EXISTS "runners" (id TEXT)';
    expect(makeIdempotent(statement)).toBe(statement);
  });

  it('leaves a statement it does not recognise alone', () => {
    expect(makeIdempotent('INSERT INTO "runners" VALUES (1)')).toBe(
      'INSERT INTO "runners" VALUES (1)',
    );
  });
});

describe('stripUsingClause', () => {
  it('drops USING between the closing parenthesis and the column list', () => {
    expect(stripUsingClause('CREATE INDEX "i" ON "runners" USING btree ("slug")')).toBe(
      'CREATE INDEX "i" ON "runners" ("slug")',
    );
  });

  it('drops USING that follows a parenthesised expression', () => {
    expect(stripUsingClause('CREATE INDEX "i" ON "runners" (slug) USING btree ASC')).toBe(
      'CREATE INDEX "i" ON "runners" (slug) ASC',
    );
  });

  it('leaves a statement with no USING clause alone', () => {
    expect(stripUsingClause('CREATE TABLE "runners" (id TEXT)')).toBe(
      'CREATE TABLE "runners" (id TEXT)',
    );
  });
});

describe('asyncifyIndex', () => {
  it('inserts ASYNC after CREATE INDEX', () => {
    expect(asyncifyIndex('CREATE INDEX "i" ON "runners" (slug)')).toBe(
      'CREATE INDEX ASYNC "i" ON "runners" (slug)',
    );
  });

  it('inserts ASYNC between CREATE UNIQUE INDEX and IF NOT EXISTS', () => {
    expect(asyncifyIndex('CREATE UNIQUE INDEX IF NOT EXISTS "i" ON "runners" (slug)')).toBe(
      'CREATE UNIQUE INDEX ASYNC IF NOT EXISTS "i" ON "runners" (slug)',
    );
  });

  it('passes a statement that already carries ASYNC through unchanged', () => {
    const statement = 'CREATE INDEX ASYNC IF NOT EXISTS "i" ON "runners" (slug)';
    expect(asyncifyIndex(statement)).toBe(statement);
  });

  it('passes a non index statement through unchanged', () => {
    expect(asyncifyIndex('CREATE TABLE "runners" (id TEXT)')).toBe(
      'CREATE TABLE "runners" (id TEXT)',
    );
  });
});

describe('splitStatements', () => {
  it('splits on the drizzle breakpoint and rewrites each statement', () => {
    const sql = [
      'CREATE TABLE "runners" (id TEXT)',
      '--> statement-breakpoint',
      'CREATE INDEX "i" ON "runners" USING btree ("slug")',
    ].join('\n');

    expect(splitStatements(sql)).toStrictEqual([
      'CREATE TABLE IF NOT EXISTS "runners" (id TEXT)',
      'CREATE INDEX ASYNC IF NOT EXISTS "i" ON "runners" ("slug")',
    ]);
  });

  it('drops the empty chunks a trailing breakpoint leaves behind', () => {
    expect(splitStatements('CREATE SCHEMA "pr_27"\n--> statement-breakpoint\n   ')).toStrictEqual([
      'CREATE SCHEMA IF NOT EXISTS "pr_27"',
    ]);
  });
});

/**
 * Every keyword separator in these rewrites is `\s+` rather than a space, and
 * until this block existed nothing said so: each case above feeds canonical
 * single-space SQL, which a `\s` reads identically. drizzle-kit emits one
 * spacing today, so the tolerance is there for the hand-written migration and
 * for whatever the generator emits next.
 */
describe('the rewrites tolerate the whitespace SQL allows', () => {
  it('adds IF NOT EXISTS across a doubled space and a newline', () => {
    expect(makeIdempotent('CREATE  TABLE "runners" (id TEXT)')).toBe(
      'CREATE TABLE IF NOT EXISTS "runners" (id TEXT)',
    );
    expect(makeIdempotent('CREATE\nSCHEMA "pr_27"')).toBe('CREATE SCHEMA IF NOT EXISTS "pr_27"');
    expect(makeIdempotent('ALTER TABLE "runners" ADD\tCOLUMN "bib" TEXT')).toBe(
      'ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "bib" TEXT',
    );
  });

  it('reaches CREATE UNIQUE INDEX through both of its separators', () => {
    expect(makeIdempotent('CREATE  UNIQUE INDEX "i" ON "runners" (slug)')).toBe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "i" ON "runners" (slug)',
    );
    expect(makeIdempotent('CREATE UNIQUE\nINDEX "i" ON "runners" (slug)')).toBe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "i" ON "runners" (slug)',
    );
  });

  it('adds IF NOT EXISTS across a doubled space before CREATE INDEX', () => {
    expect(makeIdempotent('CREATE  INDEX "i" ON "runners" (slug)')).toBe(
      'CREATE INDEX IF NOT EXISTS "i" ON "runners" (slug)',
    );
  });

  it('recognises an existing IF NOT EXISTS written with irregular spacing', () => {
    const statement = 'CREATE TABLE IF  NOT EXISTS "runners" (id TEXT)';
    expect(makeIdempotent(statement)).toBe(statement);
    const spread = 'CREATE SCHEMA IF NOT\nEXISTS "pr_27"';
    expect(makeIdempotent(spread)).toBe(spread);
  });

  it('drops a USING clause written across a newline', () => {
    expect(stripUsingClause('CREATE INDEX "i" ON "runners"\nUSING  btree ("slug")')).toBe(
      'CREATE INDEX "i" ON "runners"\n("slug")',
    );
    expect(stripUsingClause('CREATE INDEX "i" ON "runners" (slug)  USING\tbtree ASC')).toBe(
      'CREATE INDEX "i" ON "runners" (slug) ASC',
    );
  });

  it('recognises an index statement whose keywords are spread out', () => {
    expect(asyncifyIndex('CREATE  UNIQUE  INDEX "i" ON "runners" (slug)')).toBe(
      'CREATE  UNIQUE  INDEX ASYNC "i" ON "runners" (slug)',
    );
    expect(asyncifyIndex('CREATE\nINDEX IF  NOT  EXISTS "i" ON "runners" (slug)')).toBe(
      'CREATE\nINDEX ASYNC IF  NOT  EXISTS "i" ON "runners" (slug)',
    );
  });

  it('passes through an index that already carries ASYNC behind irregular spacing', () => {
    const doubled = 'CREATE INDEX  ASYNC "i" ON "runners" (slug)';
    expect(asyncifyIndex(doubled)).toBe('CREATE INDEX ASYNC "i" ON "runners" (slug)');
    const spread = 'CREATE INDEX IF  NOT  EXISTS  ASYNC "i" ON "runners" (slug)';
    expect(asyncifyIndex(spread)).toBe('CREATE INDEX ASYNC IF NOT EXISTS "i" ON "runners" (slug)');
  });
});

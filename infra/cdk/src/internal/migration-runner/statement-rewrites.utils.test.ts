import { describe, expect, it } from 'vitest';
import {
  asyncifyIndex,
  makeIdempotent,
  splitStatements,
  stripUsingClause,
} from './statement-rewrites.utils.js';

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

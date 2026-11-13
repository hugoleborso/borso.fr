/**
 * @vitest-environment node
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(HERE, 'migrations');

const CONSTRUCTS_DSQL_REFUSES = [
  { name: 'a foreign key', pattern: /\bREFERENCES\b|\bFOREIGN\s+KEY\b/i },
  { name: 'a jsonb column', pattern: /\bjsonb\b/i },
  { name: 'a unique index or constraint', pattern: /\bUNIQUE\b/i },
  { name: 'a column defaulting to now()', pattern: /DEFAULT\s+now\(\)/i },
  { name: 'an ASYNC index written by hand', pattern: /CREATE\s+INDEX\s+ASYNC/i },
] as const;

function readMigrations(): { readonly file: string; readonly sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS_DIR, file), 'utf8') }));
}

// @FollowsBlueprint test-artifact-audit
describe('migration SQL audit', () => {
  const migrations = readMigrations();

  it('finds the generated migrations', () => {
    expect(migrations.length).toBeGreaterThan(0);
  });

  it.each(CONSTRUCTS_DSQL_REFUSES)('holds no $name', ({ pattern }) => {
    expect(migrations.filter((migration) => pattern.test(migration.sql))).toEqual([]);
  });

  it('creates the five tables of the specs and no card state', () => {
    const tables = migrations.flatMap((migration) =>
      [...migration.sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((match) => match[1]),
    );
    expect(
      tables.toSorted((left, right) => String(left).localeCompare(String(right), 'en')),
    ).toEqual([
      'app_config',
      'deck_line_event',
      'operator_credential',
      'review_event',
      'sign_in_attempt',
    ]);
  });
});

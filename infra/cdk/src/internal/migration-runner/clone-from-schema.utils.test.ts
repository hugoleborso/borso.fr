import { describe, expect, it } from 'vitest';
import {
  buildCloneInsertSql,
  buildCreateTableLikeSql,
  isCloneableDataTable,
  selectCloneableDataTables,
} from './clone-from-schema.utils.js';

describe('buildCreateTableLikeSql', () => {
  it('emits CREATE TABLE IF NOT EXISTS … LIKE … INCLUDING ALL with quoted identifiers', () => {
    expect(buildCreateTableLikeSql('prod', 'pr_27', 'editions')).toBe(
      'CREATE TABLE IF NOT EXISTS "pr_27"."editions" (LIKE "prod"."editions" INCLUDING ALL)',
    );
  });

  it('accepts underscore-prefixed names (e.g. `_migrations`)', () => {
    expect(buildCreateTableLikeSql('prod', 'pr_27', '_migrations')).toContain(
      '"pr_27"."_migrations"',
    );
  });

  it.each([
    ['source', 'pr-27', 'editions'],
    ['', 'pr_27', 'editions'],
    ['source', 'pr_27', '0starts_with_digit'],
    ['source', 'pr_27', 'has space'],
    ['source', 'pr_27', '" OR 1=1; --'],
  ])(
    'rejects identifiers that are not safe Postgres unquoted names (%s, %s, %s)',
    (source, target, table) => {
      expect(() => buildCreateTableLikeSql(source, target, table)).toThrow(/Invalid/);
    },
  );
});

describe('buildCloneInsertSql', () => {
  it('builds an INSERT … SELECT with explicit column list and ON CONFLICT DO NOTHING', () => {
    expect(buildCloneInsertSql('prod', 'pr_27', 'editions', ['slug', 'display_name'], [])).toBe(
      'INSERT INTO "pr_27"."editions" ("slug", "display_name")' +
        ' SELECT "slug", "display_name" FROM "prod"."editions"' +
        ' ON CONFLICT DO NOTHING',
    );
  });

  it('replaces nullified columns by `NULL AS "col"` in the SELECT list', () => {
    const sql = buildCloneInsertSql(
      'prod',
      'pr_27',
      'runners',
      ['edition_slug', 'slug', 'display_name', 'photo_key'],
      ['photo_key'],
    );
    expect(sql).toBe(
      'INSERT INTO "pr_27"."runners" ("edition_slug", "slug", "display_name", "photo_key")' +
        ' SELECT "edition_slug", "slug", "display_name", NULL AS "photo_key" FROM "prod"."runners"' +
        ' ON CONFLICT DO NOTHING',
    );
  });

  it('nullifies multiple columns at once', () => {
    const sql = buildCloneInsertSql(
      'prod',
      'pr_27',
      'media',
      ['id', 'object_key', 'thumbnail_key'],
      ['object_key', 'thumbnail_key'],
    );
    expect(sql).toContain('NULL AS "object_key"');
    expect(sql).toContain('NULL AS "thumbnail_key"');
  });

  it("ignores nullify entries that aren't in the column list (no-op rather than crash)", () => {
    // Caller misconfigured `columnsToNullify` — column doesn't exist on
    // this table. We still build a valid INSERT for the columns that
    // DO exist; the stray nullify entry is silently skipped because the
    // SELECT list is driven by `columns`, not `nullifyColumns`.
    const sql = buildCloneInsertSql(
      'prod',
      'pr_27',
      'editions',
      ['slug', 'display_name'],
      ['photo_key'],
    );
    expect(sql).not.toContain('photo_key');
  });

  it('throws when the column list is empty', () => {
    expect(() => buildCloneInsertSql('prod', 'pr_27', 'runners', [], [])).toThrow(
      /empty column list/,
    );
  });

  it('rejects invalid column identifiers', () => {
    expect(() =>
      buildCloneInsertSql('prod', 'pr_27', 'runners', ['valid', 'DROP TABLE'], []),
    ).toThrow(/Invalid/);
  });

  it('rejects invalid identifiers in the nullify list', () => {
    expect(() => buildCloneInsertSql('prod', 'pr_27', 'runners', ['photo_key'], ['"; --'])).toThrow(
      /Invalid/,
    );
  });

  it('rejects an invalid table name', () => {
    expect(() => buildCloneInsertSql('prod', 'pr_27', 'runners; DROP', ['slug'], [])).toThrow(
      /Invalid/,
    );
  });

  it('rejects an invalid source schema name', () => {
    expect(() => buildCloneInsertSql('prod"; --', 'pr_27', 'runners', ['slug'], [])).toThrow(
      /Invalid/,
    );
  });

  it('rejects an invalid target schema name', () => {
    expect(() => buildCloneInsertSql('prod', 'pr_27"; --', 'runners', ['slug'], [])).toThrow(
      /Invalid/,
    );
  });
});

describe('selectCloneableDataTables', () => {
  it('drops the marker table and everything blocklisted', () => {
    expect(
      selectCloneableDataTables(
        ['_migrations', 'admin_sessions', 'editions', 'runners'],
        ['admin_sessions'],
      ),
    ).toStrictEqual(['editions', 'runners']);
  });

  it('keeps every data table when nothing is blocklisted', () => {
    expect(selectCloneableDataTables(['editions', 'runners'], [])).toStrictEqual([
      'editions',
      'runners',
    ]);
  });

  it('leaves an empty schema empty', () => {
    expect(selectCloneableDataTables([], ['admin_sessions'])).toStrictEqual([]);
  });
});

describe('isCloneableDataTable', () => {
  it('treats `_migrations` as not cloneable as a data table — caller copies it out-of-band', () => {
    expect(isCloneableDataTable('_migrations', [])).toBe(false);
  });

  it('returns false for tables listed in the blocklist', () => {
    expect(isCloneableDataTable('admin_sessions', ['admin_sessions', 'auth_attempts'])).toBe(false);
    expect(isCloneableDataTable('auth_attempts', ['admin_sessions', 'auth_attempts'])).toBe(false);
  });

  it('returns true for tables outside the blocklist', () => {
    expect(isCloneableDataTable('editions', ['admin_sessions'])).toBe(true);
    expect(isCloneableDataTable('runners', [])).toBe(true);
  });
});

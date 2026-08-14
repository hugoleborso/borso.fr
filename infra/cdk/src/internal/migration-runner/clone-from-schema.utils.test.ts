import { describe, expect, it } from 'vitest';
import {
  buildCloneInsertSql,
  buildCreateTableLikeSql,
  buildReplaceBeforeCloneSql,
  findUndecidedCredentialTables,
  isCloneableDataTable,
  isReplacedBeforeClone,
  selectCloneableDataTables,
} from './clone-from-schema.utils.js';

// @FollowsBlueprint test-pure-unit
describe('findUndecidedCredentialTables', () => {
  const PRAGMA_MIGRATIONS = [
    'CREATE TABLE "app_config" (id integer PRIMARY KEY, password_hash text NOT NULL);',
    'CREATE TABLE IF NOT EXISTS "song" (slug text PRIMARY KEY);',
  ];
  const LLL_MIGRATIONS = ['CREATE TABLE admin_credentials (pin_hash text NOT NULL);'];

  it('names the credential table the migrations create and the config ignores', () => {
    expect(findUndecidedCredentialTables({}, PRAGMA_MIGRATIONS)).toStrictEqual(['app_config']);
  });

  it('accepts a table that is blocklisted', () => {
    expect(
      findUndecidedCredentialTables({ tableBlocklist: ['admin_credentials'] }, LLL_MIGRATIONS),
    ).toStrictEqual([]);
  });

  it('accepts a table that is replaced', () => {
    expect(
      findUndecidedCredentialTables({ tablesToReplace: ['app_config'] }, PRAGMA_MIGRATIONS),
    ).toStrictEqual([]);
  });

  // The guard has to stay quiet about a credential table this app has never
  // heard of, or every app pays for every other app's schema.
  it('says nothing about a credential table the migrations never create', () => {
    expect(findUndecidedCredentialTables({}, LLL_MIGRATIONS)).toStrictEqual(['admin_credentials']);
    expect(findUndecidedCredentialTables({}, [])).toStrictEqual([]);
  });

  it('ignores non-credential entries in either list', () => {
    expect(
      findUndecidedCredentialTables(
        { tableBlocklist: ['auth_attempt'], tablesToReplace: ['song'] },
        PRAGMA_MIGRATIONS,
      ),
    ).toStrictEqual(['app_config']);
  });

  it('matches a CREATE TABLE written without quotes or with IF NOT EXISTS', () => {
    expect(
      findUndecidedCredentialTables({}, ['create table if not exists app_config (id int);']),
    ).toStrictEqual(['app_config']);
  });

  // A migration that only reads or alters the table is not where it is born, so
  // an app inheriting a cloned schema is not asked to re-decide.
  it('does not fire on a migration that merely references the table', () => {
    expect(
      findUndecidedCredentialTables({}, ['ALTER TABLE app_config ADD COLUMN hmac_key text;']),
    ).toStrictEqual([]);
  });
});

describe('isReplacedBeforeClone', () => {
  it('selects only the named tables', () => {
    expect(isReplacedBeforeClone('app_config', ['app_config'])).toBe(true);
    expect(isReplacedBeforeClone('member', ['app_config'])).toBe(false);
  });

  it('replaces nothing when the list is empty, which is the default', () => {
    expect(isReplacedBeforeClone('app_config', [])).toBe(false);
  });
});

describe('buildReplaceBeforeCloneSql', () => {
  it('empties the target table so the source row wins over a stale one', () => {
    expect(buildReplaceBeforeCloneSql('pr_40', 'app_config')).toBe(
      'DELETE FROM "pr_40"."app_config"',
    );
  });

  it('touches only the target schema — the source is never written to', () => {
    const sql = buildReplaceBeforeCloneSql('pr_40', 'app_config');
    expect(sql).not.toContain('prod');
    expect(sql.startsWith('DELETE FROM "pr_40"')).toBe(true);
  });

  it('rejects an identifier that could smuggle SQL', () => {
    expect(() => buildReplaceBeforeCloneSql('pr_40', 'app_config"; DROP SCHEMA "prod')).toThrow(
      /Invalid table name/,
    );
    expect(() => buildReplaceBeforeCloneSql('pr-40', 'app_config')).toThrow(/Invalid schema name/);
  });
});

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

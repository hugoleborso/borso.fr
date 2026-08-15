import { describe, expect, it } from 'vitest';
import {
  buildAddColumnSql,
  buildCloneInsertSql,
  formatColumnType,
  buildCreateTableLikeSql,
  buildReplaceBeforeCloneSql,
  listUndecidedCredentialTables,
  isCloneableDataTable,
  isReplacedBeforeClone,
  selectCloneableDataTables,
  selectMissingColumns,
} from './clone-from-schema.utils.js';

// @FollowsBlueprint test-pure-unit
describe('listUndecidedCredentialTables', () => {
  const PRAGMA_MIGRATIONS = [
    'CREATE TABLE "app_config" (id integer PRIMARY KEY, password_hash text NOT NULL);',
    'CREATE TABLE IF NOT EXISTS "song" (slug text PRIMARY KEY);',
  ];
  const LLL_MIGRATIONS = ['CREATE TABLE admin_credentials (pin_hash text NOT NULL);'];

  it('names the credential table the migrations create and the config ignores', () => {
    expect(listUndecidedCredentialTables({}, PRAGMA_MIGRATIONS)).toStrictEqual(['app_config']);
  });

  it('accepts a table that is blocklisted', () => {
    expect(
      listUndecidedCredentialTables({ tableBlocklist: ['admin_credentials'] }, LLL_MIGRATIONS),
    ).toStrictEqual([]);
  });

  it('accepts a table that is replaced', () => {
    expect(
      listUndecidedCredentialTables({ tablesToReplace: ['app_config'] }, PRAGMA_MIGRATIONS),
    ).toStrictEqual([]);
  });

  // The guard has to stay quiet about a credential table this app has never
  // heard of, or every app pays for every other app's schema.
  it('says nothing about a credential table the migrations never create', () => {
    expect(listUndecidedCredentialTables({}, LLL_MIGRATIONS)).toStrictEqual(['admin_credentials']);
    expect(listUndecidedCredentialTables({}, [])).toStrictEqual([]);
  });

  it('ignores non-credential entries in either list', () => {
    expect(
      listUndecidedCredentialTables(
        { tableBlocklist: ['auth_attempt'], tablesToReplace: ['song'] },
        PRAGMA_MIGRATIONS,
      ),
    ).toStrictEqual(['app_config']);
  });

  it('matches a CREATE TABLE written without quotes or with IF NOT EXISTS', () => {
    expect(
      listUndecidedCredentialTables({}, ['create table if not exists app_config (id int);']),
    ).toStrictEqual(['app_config']);
  });

  // A migration that only reads or alters the table is not where it is born, so
  // an app inheriting a cloned schema is not asked to re-decide.
  it('does not fire on a migration that merely references the table', () => {
    expect(
      listUndecidedCredentialTables({}, ['ALTER TABLE app_config ADD COLUMN hmac_key text;']),
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

describe('selectMissingColumns', () => {
  it('returns the source columns the target does not have', () => {
    expect(
      selectMissingColumns(
        [
          { name: 'id', type: 'text' },
          { name: 'is_harmonic', type: 'boolean' },
          { name: 'family', type: 'text' },
        ],
        ['id', 'is_harmonic'],
      ),
    ).toStrictEqual([{ name: 'family', type: 'text' }]);
  });

  it('returns nothing when the target already matches', () => {
    expect(
      selectMissingColumns([{ name: 'id', type: 'text' }], ['id', 'extra_column_only_here']),
    ).toStrictEqual([]);
  });

  it('returns every column for a table the target has not created yet', () => {
    const columns = [
      { name: 'id', type: 'text' },
      { name: 'name', type: 'text' },
    ];
    expect(selectMissingColumns(columns, [])).toStrictEqual(columns);
  });
});

describe('buildAddColumnSql', () => {
  it('builds a bare ADD COLUMN, which is the only shape Aurora DSQL accepts', () => {
    expect(buildAddColumnSql('pr_49', 'instrument', { name: 'family', type: 'text' })).toBe(
      'ALTER TABLE "pr_49"."instrument" ADD COLUMN IF NOT EXISTS "family" text',
    );
  });

  it('keeps a length or a precision the catalogue reported', () => {
    expect(
      buildAddColumnSql('pr_49', 'song', { name: 'title', type: 'character varying(200)' }),
    ).toBe('ALTER TABLE "pr_49"."song" ADD COLUMN IF NOT EXISTS "title" character varying(200)');
    expect(buildAddColumnSql('pr_49', 'song', { name: 'weight', type: 'numeric(10, 2)' })).toBe(
      'ALTER TABLE "pr_49"."song" ADD COLUMN IF NOT EXISTS "weight" numeric(10, 2)',
    );
    expect(
      buildAddColumnSql('pr_49', 'song', { name: 'created_at', type: 'timestamp with time zone' }),
    ).toBe(
      'ALTER TABLE "pr_49"."song" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone',
    );
  });

  it('refuses a type that is not a plain type name', () => {
    expect(() =>
      buildAddColumnSql('pr_49', 'song', { name: 'title', type: 'text; DROP SCHEMA "pragma"' }),
    ).toThrow('refusing to build with type');
  });

  it('refuses an identifier that is not a plain identifier', () => {
    expect(() => buildAddColumnSql('pr_49', 'song', { name: 'a"b', type: 'text' })).toThrow(
      'Invalid column name',
    );
    expect(() => buildAddColumnSql('pr-49', 'song', { name: 'title', type: 'text' })).toThrow(
      'Invalid schema name',
    );
    expect(() => buildAddColumnSql('pr_49', 'so ng', { name: 'title', type: 'text' })).toThrow(
      'Invalid table name',
    );
  });
});

describe('formatColumnType', () => {
  const row = {
    column_name: 'family',
    data_type: 'text',
    character_maximum_length: null,
    numeric_precision: null,
    numeric_scale: null,
  };

  it('takes the data type as-is when the catalogue reports no modifier', () => {
    expect(formatColumnType(row)).toStrictEqual({ name: 'family', type: 'text' });
  });

  it('folds back the length the catalogue reports separately', () => {
    expect(
      formatColumnType({ ...row, data_type: 'character varying', character_maximum_length: 200 }),
    ).toStrictEqual({ name: 'family', type: 'character varying(200)' });
  });

  it('folds back a numeric precision and scale', () => {
    expect(
      formatColumnType({ ...row, data_type: 'numeric', numeric_precision: 10, numeric_scale: 2 }),
    ).toStrictEqual({ name: 'family', type: 'numeric(10,2)' });
  });

  it('defaults a numeric with no scale to zero, which is what Postgres means by it', () => {
    expect(formatColumnType({ ...row, data_type: 'numeric', numeric_precision: 10 })).toStrictEqual(
      { name: 'family', type: 'numeric(10,0)' },
    );
  });

  it('leaves a non-numeric type alone even when a precision is reported', () => {
    expect(formatColumnType({ ...row, data_type: 'integer', numeric_precision: 32 })).toStrictEqual(
      { name: 'family', type: 'integer' },
    );
  });
});

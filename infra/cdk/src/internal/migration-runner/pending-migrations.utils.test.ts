import { describe, expect, it } from 'vitest';
import { selectPendingMigrations } from './pending-migrations.utils.js';

const MIGRATIONS = [
  { name: '0001_init', sql: 'CREATE TABLE a();' },
  { name: '0002_runners', sql: 'CREATE TABLE b();' },
  { name: '0003_punches', sql: 'CREATE TABLE c();' },
];

// @FollowsBlueprint test-pure-unit
describe('selectPendingMigrations', () => {
  it('keeps only the migrations the schema has not recorded', () => {
    expect(selectPendingMigrations(MIGRATIONS, new Set(['0001_init']))).toStrictEqual([
      MIGRATIONS[1],
      MIGRATIONS[2],
    ]);
  });

  it('keeps every migration on a schema that has applied none', () => {
    expect(selectPendingMigrations(MIGRATIONS, new Set())).toStrictEqual(MIGRATIONS);
  });

  it('keeps nothing once every migration is recorded', () => {
    const appliedNames = new Set(MIGRATIONS.map((migration) => migration.name));

    expect(selectPendingMigrations(MIGRATIONS, appliedNames)).toStrictEqual([]);
  });

  it('ignores a recorded name that no longer ships', () => {
    expect(selectPendingMigrations([], new Set(['0001_init']))).toStrictEqual([]);
  });
});

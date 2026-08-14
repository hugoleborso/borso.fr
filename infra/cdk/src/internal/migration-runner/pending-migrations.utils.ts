/**
 * Which migrations a schema still owes.
 *
 * The runner reads the `_migrations` table, and the answer decides what it
 * replays. Selecting the list up front keeps the apply loop a straight run of
 * statements, and it makes "an applied migration is never replayed" a
 * property a test can assert without a database.
 */

export interface MigrationName {
  readonly name: string;
}

// @FollowsBlueprint utils-pure-module
export function selectPendingMigrations<TMigration extends MigrationName>(
  migrations: readonly TMigration[],
  appliedNames: ReadonlySet<string>,
): TMigration[] {
  return migrations.filter((migration) => !appliedNames.has(migration.name));
}

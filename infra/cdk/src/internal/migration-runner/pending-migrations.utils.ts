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

/**
 * Barrel for every Drizzle table in the app. `drizzle-kit` reads from
 * here (configured in `drizzle.config.ts`); the migration runner Lambda
 * applies the generated `.sql` files via the `DsqlSchema` construct.
 */

/**
 * @Blueprint database-schema-barrel
 * @BlueprintName Database Schema Barrel
 * @BlueprintUsage Use for the one module the migration tool reads, so every table is named in a single place while each declaration stays inside the slice that owns it.
 * @BlueprintDescription Re-exports the tables from the four slice schemas and nothing else, which is the single namespace `drizzle-kit` reads to diff the database, so a new table becomes visible to migrations by adding one export line rather than by moving the declaration out of its slice.
 */
export { adminCredentialsTable, adminSessionsTable, authAttemptsTable } from '../auth/auth.schema';
export { editionsTable } from '../edition/edition.schema';
export { loopPunchesTable, manualDidNotFinishesTable } from '../punch/punch.schema';
export { runnersTable } from '../runner/runner.schema';

/**
 * Barrel for every Drizzle table in the app. `drizzle-kit` reads from
 * here (configured in `drizzle.config.ts`); the migration runner Lambda
 * applies the generated `.sql` files via the `DsqlSchema` construct.
 */

export { editionsTable } from '../edition/edition.schema';
export { runnersTable } from '../runner/runner.schema';
export { loopPunchesTable, manualDnfsTable } from '../punch/punch.schema';
export {
  adminCredentialsTable,
  adminSessionsTable,
  authAttemptsTable,
} from '../auth/auth.schema';

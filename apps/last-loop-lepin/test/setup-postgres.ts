import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(HERE, '..');
const MIGRATIONS_DIR = join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');

const MIGRATION_FILE_PATTERN = /^\d+_[A-Za-z0-9_-]+\.sql$/;
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

function readMigrationStatements(): readonly string[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => MIGRATION_FILE_PATTERN.test(name))
    .toSorted();
  const statements: string[] = [];
  for (const file of files) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const chunks = content
      .split(STATEMENT_BREAKPOINT)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);
    statements.push(...chunks);
  }
  return statements;
}

async function applyMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1, onnotice: () => undefined });
  try {
    await sql.unsafe(
      'DROP TABLE IF EXISTS loop_punches, loop_punch_claims, manual_dnfs, runners, editions, auth_attempts, admin_credentials, admin_sessions CASCADE',
    );
    for (const statement of readMigrationStatements()) {
      await sql.unsafe(statement);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function setProcessEnv(databaseUrl: string): void {
  process.env.DATABASE_URL = databaseUrl;
  process.env.STAGE = 'dev';
  process.env.PHOTOS_BUCKET = 'last-loop-lepin-test-photos';
  delete process.env.ALLOWED_ORIGIN;
  delete process.env.PIN_HASH;
  delete process.env.JWT_SECRET;
}

/**
 * @Blueprint test-global-setup
 * @BlueprintName Test Global Setup
 * @BlueprintUsage Use for the vitest `globalSetup` of a suite that needs a real database, which takes its database from the environment.
 * @BlueprintDescription Requires the `DATABASE_URL` that `test:e2e` and CI provide and refuses to start without one, then applies the migration files off disk rather than the Drizzle objects, so the suite runs against the artefact the deploy applies. It boots nothing, so there is no teardown: a container fallback here ran in neither CI nor `test:e2e`, and its library carried five of the advisories PR #274 cleared.
 */
export async function setup(): Promise<void> {
  const externalUrl = process.env.DATABASE_URL;
  if (externalUrl === undefined || externalUrl.length === 0) {
    throw new Error(
      'last-loop-lepin back-e2e: DATABASE_URL must be set. Run via `pnpm --filter @borso-app/last-loop-lepin run test:e2e`, which boots the sandbox Postgres.',
    );
  }
  await applyMigrations(externalUrl);
  setProcessEnv(externalUrl);
}

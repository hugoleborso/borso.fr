/**
 * Vitest `globalSetup` for the back-e2e gate. `DATABASE_URL` is exported by
 * the caller: `pnpm run test` boots the sandbox cluster through
 * `scripts/local-postgres.sh`. The schema is applied once from the `.sql`
 * files the deploy applies, so the suite runs against the artefact rather than
 * against the Drizzle objects. Per-suite isolation is `truncateAllTables`.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(HERE, '..');
const MIGRATIONS_DIR = join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');

const MIGRATION_FILE_PATTERN = /^\d+_[A-Za-z0-9_-]+\.sql$/;
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';
const CONNECTION_CLOSE_TIMEOUT_SECONDS = 5;

const TRACKED_TABLES = ['book', 'shelf'];

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
    await sql.unsafe(`DROP TABLE IF EXISTS ${TRACKED_TABLES.join(', ')} CASCADE`);
    for (const statement of readMigrationStatements()) {
      await sql.unsafe(statement);
    }
  } finally {
    await sql.end({ timeout: CONNECTION_CLOSE_TIMEOUT_SECONDS });
  }
}

// @FollowsBlueprint test-global-setup
export async function setup(): Promise<void> {
  const externalUrl = process.env.DATABASE_URL;
  if (externalUrl === undefined || externalUrl.length === 0) {
    throw new Error(
      'borsolivres back-e2e: DATABASE_URL must be set. Run `pnpm --filter @borso-app/borsolivres run test`, which boots the sandbox Postgres.',
    );
  }
  await applyMigrations(externalUrl);
  process.env.STAGE = 'dev';
}

export async function teardown(): Promise<void> {
  // The sandbox Postgres is owned by the script that started it.
}

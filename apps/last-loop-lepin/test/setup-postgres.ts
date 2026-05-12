/**
 * Vitest globalSetup for the back-e2e gate.
 *
 * Two modes:
 *
 * 1. **External Postgres** — if `DATABASE_URL` is already set, we trust the
 *    caller (CI runner, local sandbox with a system Postgres) and just
 *    apply the migrations once. Cheaper and works in environments that
 *    can't run nested containers.
 * 2. **Testcontainers** — otherwise, boot a Postgres 16 container, apply
 *    migrations, expose its URL.
 *
 * Per-suite isolation: every test that wants its own data set should call
 * `truncateAllTables(database)` in a `beforeEach`. Schema is shared across
 * suites because applying migrations is the expensive step (~1 s).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgres from 'postgres';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(HERE, '..');
const MIGRATIONS_DIR = join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');

const MIGRATION_FILE_PATTERN = /^\d+_[A-Za-z0-9_-]+\.sql$/;
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

let container: StartedPostgreSqlContainer | null = null;

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
    // Always start from an empty database — a previous run may have left
    // tables behind under an external Postgres. DROP IF EXISTS keeps it idempotent.
    await sql.unsafe(
      'DROP TABLE IF EXISTS loop_punches, manual_dnfs, runners, editions, auth_attempts CASCADE',
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
  process.env.JWT_SECRET = 'test-jwt-secret-not-for-prod-not-for-prod-not-for-prod';
  process.env.PHOTOS_BUCKET = 'last-loop-lepin-test-photos';
  // PIN "lastloop" pre-hashed with scrypt (salt + key generated once for tests).
  process.env.PIN_HASH =
    'scrypt$6ccc66eb93981b9b83e8817f584ca8f5$60191a1c31f18e88590e0e5c6995d1d6f7f0f053b6ffce8e3ea4288c56bd0e790d6a340ad59de2d29792c9d471ad144907d5d10e05ef03d0aea5f6383f734107';
}

export async function setup(): Promise<void> {
  const externalUrl = process.env.DATABASE_URL;
  if (externalUrl !== undefined && externalUrl.length > 0) {
    await applyMigrations(externalUrl);
    setProcessEnv(externalUrl);
    return;
  }

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('lastloop')
    .withUsername('lastloop')
    .withPassword('lastloop')
    .start();
  const url = container.getConnectionUri();
  await applyMigrations(url);
  setProcessEnv(url);
}

export async function teardown(): Promise<void> {
  await container?.stop();
}

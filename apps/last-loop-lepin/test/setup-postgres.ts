/**
 * Vitest globalSetup — boots a single Postgres testcontainer for the
 * back-e2e gate, applies the committed Drizzle migrations once, and
 * publishes the connection URL via `DATABASE_URL`.
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
    for (const statement of readMigrationStatements()) {
      await sql.unsafe(statement);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function setup(): Promise<void> {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('lastloop')
    .withUsername('lastloop')
    .withPassword('lastloop')
    .start();
  const url = container.getConnectionUri();
  await applyMigrations(url);
  process.env.DATABASE_URL = url;
  process.env.STAGE = 'dev';
  process.env.JWT_SECRET = 'test-jwt-secret-not-for-prod-not-for-prod-not-for-prod';
  process.env.PHOTOS_BUCKET = 'last-loop-lepin-test-photos';
  // PIN "lastloop" → scrypt hash, generated once and pinned here.
  process.env.PIN_HASH = 'scrypt$73657374$d4f6b0d3c8e4a7b2f6f1d3a8b9c0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2';
}

export async function teardown(): Promise<void> {
  await container?.stop();
}

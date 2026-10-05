import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIRECTORY = join(resolve(HERE, '..'), 'api', 'src', 'database', 'migrations');
const MIGRATION_FILE_PATTERN = /^\d+_[A-Za-z0-9_-]+\.sql$/;
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';
const CONNECTION_CLOSE_TIMEOUT_SECONDS = 5;

export const TRACKED_TABLES = [
  'auth_attempt',
  'passkey',
  'push_subscription',
  'session',
  'webauthn_challenge',
];

function readMigrationStatements(): string[] {
  return readdirSync(MIGRATIONS_DIRECTORY)
    .filter((name) => MIGRATION_FILE_PATTERN.test(name))
    .toSorted()
    .flatMap((file) =>
      readFileSync(join(MIGRATIONS_DIRECTORY, file), 'utf8').split(STATEMENT_BREAKPOINT),
    )
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export async function applyMigrations(connectionString: string): Promise<void> {
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
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error(
      'talos back-e2e: DATABASE_URL must be set. Run `pnpm --filter @borso-app/talos run test`, which starts the local Postgres.',
    );
  }
  await applyMigrations(databaseUrl);
  process.env.STAGE = 'dev';
}

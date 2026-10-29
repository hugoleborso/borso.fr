import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import type { TestProject } from 'vitest/node';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(HERE, '..');
const MIGRATIONS_DIR = join(WORKSPACE_ROOT, 'api', 'src', 'database', 'migrations');

const MIGRATION_FILE_PATTERN = /^\d+_[A-Za-z0-9_-]+\.sql$/;
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

const TRACKED_TABLES = [
  'app_config',
  'audience_suggestion',
  'audience_vote',
  'voting_round',
  'member_calendar_feed',
  'member_credential',
  'member_passkey',
  'webauthn_challenge',
  'setlist_vote',
  'improvement_vote',
  'improvement',
  'auth_attempt',
  'outreach_template',
  'bar',
  'take_comment',
  'take',
  'push_subscription',
  'notification_preference',
  'notification_dispatch',
  'task',
  'transition_comment',
  'setlist_entry',
  'session_setlist',
  'setlist_sheet',
  'setlist',
  'session',
  'study',
  'mastery_score_change',
  'mastery_override',
  'mastery_default',
  'song',
  'member_instrument',
  'instrument',
  'member',
];

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

export async function applyMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1, onnotice: () => undefined });
  try {
    await sql.unsafe(`DROP TABLE IF EXISTS ${TRACKED_TABLES.join(', ')} CASCADE`);
    for (const statement of readMigrationStatements()) {
      await sql.unsafe(statement);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function readDatabaseUrl(): string {
  const externalUrl = process.env.DATABASE_URL;
  if (externalUrl === undefined || externalUrl.length === 0) {
    throw new Error(
      'pragma back-e2e: DATABASE_URL must be set. Run via `pnpm --filter @borso-app/pragma run test` which boots the sandbox Postgres.',
    );
  }
  return externalUrl;
}

const NON_IDENTIFIER_CHARACTERS = /[^a-z0-9_]/g;

function databaseNamePrefix(baseUrl: URL, projectName: string): string {
  const baseName = baseUrl.pathname.slice(1);
  const projectSlug = projectName.toLowerCase().replaceAll(NON_IDENTIFIER_CHARACTERS, '_');
  return `${baseName}_${projectSlug}`;
}

function urlOfDatabase(baseUrl: URL, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function dropWorkerDatabases(
  administration: postgres.Sql,
  workerDatabasePrefix: string,
): Promise<void> {
  const rows = await administration<{ datname: string }[]>`
    SELECT datname FROM pg_database WHERE starts_with(datname, ${workerDatabasePrefix})`;
  for (const { datname } of rows) {
    await administration.unsafe(`DROP DATABASE "${datname}" WITH (FORCE)`);
  }
}

async function withAdministration(
  baseUrl: URL,
  work: (administration: postgres.Sql) => Promise<void>,
): Promise<void> {
  const administration = postgres(baseUrl.toString(), { max: 1, onnotice: () => undefined });
  try {
    await work(administration);
  } finally {
    await administration.end({ timeout: 5 });
  }
}

export interface WorkerDatabaseSource {
  readonly administrationUrl: string;
  readonly templateName: string;
  readonly workerDatabasePrefix: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    workerDatabaseSource: WorkerDatabaseSource;
  }
}

export async function setup(project: TestProject): Promise<() => Promise<void>> {
  const baseUrl = new URL(readDatabaseUrl());
  const prefix = databaseNamePrefix(baseUrl, project.name);
  const templateName = `${prefix}_template`;
  const workerDatabasePrefix = `${prefix}_worker_`;
  await withAdministration(baseUrl, async (administration) => {
    await dropWorkerDatabases(administration, workerDatabasePrefix);
    await administration.unsafe(`DROP DATABASE IF EXISTS "${templateName}" WITH (FORCE)`);
    await administration.unsafe(`CREATE DATABASE "${templateName}"`);
  });
  await applyMigrations(urlOfDatabase(baseUrl, templateName));
  project.provide('workerDatabaseSource', {
    administrationUrl: baseUrl.toString(),
    templateName,
    workerDatabasePrefix,
  });
  process.env.STAGE = 'dev';
  return async () => {
    await withAdministration(baseUrl, async (administration) => {
      await dropWorkerDatabases(administration, workerDatabasePrefix);
    });
  };
}

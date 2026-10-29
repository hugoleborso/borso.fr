import postgres from 'postgres';
import { inject } from 'vitest';
import { urlOfDatabase } from './setup-postgres';

const WORKER_DATABASE_SUFFIX = `_worker_${String(process.pid)}`;

function hasWorkerDatabase(databaseUrl: string | undefined): boolean {
  return databaseUrl?.endsWith(WORKER_DATABASE_SUFFIX) === true;
}

if (!hasWorkerDatabase(process.env.DATABASE_URL)) {
  const source = inject('workerDatabaseSource');
  const workerDatabaseName = `${source.workerDatabasePrefix}${String(process.pid)}`;
  const administration = postgres(source.administrationUrl, { max: 1, onnotice: () => undefined });
  try {
    await administration.unsafe(`DROP DATABASE IF EXISTS "${workerDatabaseName}" WITH (FORCE)`);
    await administration.unsafe(
      `CREATE DATABASE "${workerDatabaseName}" TEMPLATE "${source.templateName}"`,
    );
  } finally {
    await administration.end({ timeout: 5 });
  }
  process.env.DATABASE_URL = urlOfDatabase(new URL(source.administrationUrl), workerDatabaseName);
}

import postgres from 'postgres';
import { inject } from 'vitest';

const source = inject('workerDatabaseSource');
const workerDatabaseName = `${source.workerDatabasePrefix}${String(process.pid)}`;
const workerDatabaseUrl = new URL(source.administrationUrl);
workerDatabaseUrl.pathname = `/${workerDatabaseName}`;

if (process.env.DATABASE_URL !== workerDatabaseUrl.toString()) {
  const administration = postgres(source.administrationUrl, { max: 1, onnotice: () => undefined });
  try {
    await administration.unsafe(`DROP DATABASE IF EXISTS "${workerDatabaseName}" WITH (FORCE)`);
    await administration.unsafe(
      `CREATE DATABASE "${workerDatabaseName}" TEMPLATE "${source.templateName}"`,
    );
  } finally {
    await administration.end({ timeout: 5 });
  }
  process.env.DATABASE_URL = workerDatabaseUrl.toString();
}

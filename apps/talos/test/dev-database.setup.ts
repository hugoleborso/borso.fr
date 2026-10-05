import postgres from 'postgres';
import { applyMigrations } from './setup-postgres';

const databaseUrl = process.env.DATABASE_URL ?? '';
const sql = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
const [existing] = await sql<
  { table: string | null }[]
>`select to_regclass('passkey')::text as table`;
await sql.end();

if (existing?.table === null) {
  await applyMigrations(databaseUrl);
  process.stdout.write('[dev:db] tables créées dans la base locale\n');
}

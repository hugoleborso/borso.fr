import postgres from 'postgres';
import { recordAgentChanges } from '../api/src/agent/agent.service';
import { changeRequestSchema } from '../api/src/memory/memory-changes.schema';
import { MEMORY_SEED } from './memory-fixture';
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

const seed = changeRequestSchema.parse({
  idempotencyKey: 'dev-seed',
  actor: 'import',
  operations: MEMORY_SEED,
});
await recordAgentChanges(seed, 'mac');
process.stdout.write('[dev:db] mémoire de démonstration en base\n');
process.exit(0);

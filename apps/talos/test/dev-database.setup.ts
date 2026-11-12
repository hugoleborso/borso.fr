import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { recordAgentChanges } from '../api/src/agent/agent.service';
import { buildSessionCookie, SESSION_COOKIE_NAME } from '../api/src/auth/session-cookie.utils';
import { SESSION_LIFETIME_MS } from '../api/src/auth/session.core';
import { changeRequestSchema } from '../api/src/memory/memory-changes.schema';
import { MEMORY_SEED } from './memory-fixture';
import { applyMigrations, TRACKED_TABLES } from './setup-postgres';

const LOCAL_API_SESSION_HMAC = 'talos-dev-session-hmac';
const SEEDED_SESSION_ID = 'dev-seeded-sign-in';
const SEED_KEY_PREFIX = 'dev-seed-';
const SEED_KEY_HASH_LENGTH = 12;
const SITE_URL = 'http://localhost:5180';
const LIVE_SEED_PATH = new URL('./dev-live-seed.json', import.meta.url);
const DAY_PLACEHOLDER = /\{\{day\+(\d+)\}\}/g;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DAY_LENGTH = 'YYYY-MM-DD'.length;

function readSeedDatedFrom(day: string): unknown {
  const dayStart = new Date(`${day}T00:00:00Z`).getTime();
  const dated = readFileSync(LIVE_SEED_PATH, 'utf8').replace(
    DAY_PLACEHOLDER,
    (_placeholder, offset: string) =>
      new Date(dayStart + Number(offset) * MILLISECONDS_PER_DAY)
        .toISOString()
        .slice(0, ISO_DAY_LENGTH),
  );
  return JSON.parse(dated);
}

function toOperations(seed: unknown): unknown[] {
  return Array.isArray(seed) ? seed : [];
}

const databaseUrl = process.env.DATABASE_URL ?? '';
const now = new Date();
const day = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const operations = [...toOperations(MEMORY_SEED), ...toOperations(readSeedDatedFrom(day))];
const seedHash = createHash('sha256').update(JSON.stringify(operations)).digest('hex');
const seedKey = SEED_KEY_PREFIX + seedHash.slice(0, SEED_KEY_HASH_LENGTH);

const sql = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
const [existing] = await sql<
  { table: string | null }[]
>`select to_regclass('passkey')::text as table`;

if (existing?.table === null) {
  await applyMigrations(databaseUrl);
  process.stdout.write('[dev:db] tables créées dans la base locale\n');
}

const appliedSeedKeys = await sql<
  { key: string }[]
>`select idempotency_key as key from memory_change_batch where idempotency_key like ${`${SEED_KEY_PREFIX}%`}`;
const isAnotherSeedApplied =
  appliedSeedKeys.length > 0 && appliedSeedKeys.every(({ key }) => key !== seedKey);
if (isAnotherSeedApplied) {
  const memoryTables = TRACKED_TABLES.filter((table) => table.startsWith('memory_'));
  await sql.unsafe(`TRUNCATE ${memoryTables.join(', ')}`);
  process.stdout.write('[dev:db] le seed a changé : mémoire locale vidée puis rejouée\n');
}

await sql`
  insert into session (id, created_at, expires_at)
  values (${SEEDED_SESSION_ID}, ${now}, ${new Date(now.getTime() + SESSION_LIFETIME_MS)})
  on conflict (id) do update set created_at = excluded.created_at, expires_at = excluded.expires_at`;
await sql.end();

const seed = changeRequestSchema.parse({
  idempotencyKey: seedKey,
  actor: 'import',
  operations,
});
await recordAgentChanges(seed, 'mac');
const cookie = buildSessionCookie(LOCAL_API_SESSION_HMAC, now.getTime(), SEEDED_SESSION_ID);
process.stdout.write(
  '[dev:db] mémoire de démonstration en base\n' +
    `[dev:db] seeded sign-in, no passkey needed: cookie ${SESSION_COOKIE_NAME}=${cookie}\n` +
    `[dev:db] agent-browser cookies set ${SESSION_COOKIE_NAME} '${cookie}' --url ${SITE_URL} && agent-browser open ${SITE_URL}/\n`,
);
process.exit(0);

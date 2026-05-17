#!/usr/bin/env bash
# Owns the local Postgres lifecycle for `pnpm dev`. Boots the cluster
# via scripts/local-postgres.sh, applies the Drizzle migrations once,
# then idles so concurrently keeps the process alive. Seeding test
# fixtures (`race-down-to-one-survivor` etc.) is the caller's job via
# POST /api/__test/seed. SIGTERM stops the cluster cleanly.
set -euo pipefail

cd "$(dirname "$0")"
APP_SLUG="last-loop-lepin"
DATABASE_URL="$(../../scripts/local-postgres.sh start ${APP_SLUG})"
export DATABASE_URL

echo "[dev:db] cluster at ${DATABASE_URL}"

# Apply migrations idempotently — drops every business table first so a
# rerun lands a clean schema. Then seeds the admin_credentials row with
# the PIN "lastloop" scrypt hash so dev login works out of the box.
node --input-type=module -e "
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
const dir = './api/src/database/migrations';
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => undefined });
await sql.unsafe('DROP TABLE IF EXISTS loop_punches, manual_dnfs, runners, editions, auth_attempts, admin_credentials, admin_sessions CASCADE');
for (const file of readdirSync(dir).filter((n) => n.endsWith('.sql')).toSorted()) {
  for (const stmt of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint').map((s) => s.trim()).filter((s) => s.length > 0)) {
    await sql.unsafe(stmt);
  }
}
await sql.unsafe(\"INSERT INTO admin_credentials (id, scrypt_hash) VALUES (1, 'scrypt\\$6ccc66eb93981b9b83e8817f584ca8f5\\$60191a1c31f18e88590e0e5c6995d1d6f7f0f053b6ffce8e3ea4288c56bd0e790d6a340ad59de2d29792c9d471ad144907d5d10e05ef03d0aea5f6383f734107') ON CONFLICT (id) DO NOTHING\");
await sql.end();
console.log('[dev:db] migrations applied + admin PIN seeded (PIN=lastloop)');
"

trap '../../scripts/local-postgres.sh stop ${APP_SLUG}; echo "[dev:db] stopped"' EXIT INT TERM

# Idle forever so concurrently treats us as a long-running peer.
tail -f /dev/null

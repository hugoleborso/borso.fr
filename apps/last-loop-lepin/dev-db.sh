#!/usr/bin/env bash
# Owns the local Postgres lifecycle for `pnpm dev`. Boots the cluster
# via scripts/local-postgres.sh, applies the Drizzle migrations once,
# seeds the race-mid-loop-3 fixture, then idles so concurrently keeps
# the process alive. SIGTERM stops the cluster cleanly.
set -euo pipefail

cd "$(dirname "$0")"
APP_SLUG="last-loop-lepin"
DATABASE_URL="$(../../scripts/local-postgres.sh start ${APP_SLUG})"
export DATABASE_URL

echo "[dev:db] cluster at ${DATABASE_URL}"

# Apply migrations idempotently — drops every business table first so a
# rerun lands a clean schema.
node --input-type=module -e "
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
const dir = './api/src/database/migrations';
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => undefined });
await sql.unsafe('DROP TABLE IF EXISTS loop_punches, manual_dnfs, runners, editions, auth_attempts CASCADE');
for (const file of readdirSync(dir).filter((n) => n.endsWith('.sql')).toSorted()) {
  for (const stmt of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint').map((s) => s.trim()).filter((s) => s.length > 0)) {
    await sql.unsafe(stmt);
  }
}
await sql.end();
console.log('[dev:db] migrations applied');
"

trap '../../scripts/local-postgres.sh stop ${APP_SLUG}; echo "[dev:db] stopped"' EXIT INT TERM

# Idle forever so concurrently treats us as a long-running peer.
tail -f /dev/null

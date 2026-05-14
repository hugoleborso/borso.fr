# Local Postgres without Docker

> Pattern for running the back-e2e gate (or `pnpm dev:api`) on a sandbox
> that doesn't ship a Docker daemon — claude.ai/code, headless CI runners,
> any host where `dockerd` isn't reachable.

## Symptom

Testcontainers (`@testcontainers/postgresql`) throws
`failed to connect to the docker API at unix:///var/run/docker.sock` on
hosts that have the `docker` binary installed but no daemon running. The
back-e2e gate then fails before a single test executes.

`sudo dockerd` may not be available either; on rootless Ubuntu sandboxes
`dockerd` exists at `/usr/bin/dockerd` but `systemctl` is missing.

## Pattern — `scripts/local-postgres.sh`

The repo ships [`scripts/local-postgres.sh`](../../scripts/local-postgres.sh):
a wrapper around the system `postgresql-16` package's `initdb` + `pg_ctl`
that gives any app a sandbox-private cluster with **no Docker dependency**.

```
scripts/local-postgres.sh start <app-slug>
  # → prints postgresql://lastloop@127.0.0.1:<port>/<app>_test
scripts/local-postgres.sh stop  <app-slug>
scripts/local-postgres.sh wipe  <app-slug>
scripts/local-postgres.sh url   <app-slug>
```

Behaviour:

- Per-app **stable port** derived from a `cksum` of the slug → two apps
  never collide, but the same app picks the same port across runs.
- Cluster lives under `/tmp/borso-pg-<app-slug>/`, owned by the system
  `postgres` user (because `initdb` refuses to run as root).
- Trust auth + plain HTTP; safe because the cluster only listens on
  `127.0.0.1`.
- Idempotent: re-running `start` on an already-running cluster is a no-op
  and prints the same URL.

## Wiring a new app

1. **Vitest globalSetup** — make it honour an existing `DATABASE_URL`
   before falling back to testcontainers:

   ```ts
   // test/setup-postgres.ts
   export async function setup(): Promise<void> {
     const externalUrl = process.env.DATABASE_URL;
     if (externalUrl !== undefined && externalUrl.length > 0) {
       await applyMigrations(externalUrl);
       setProcessEnv(externalUrl);
       return;
     }
     container = await new PostgreSqlContainer('postgres:16-alpine').start();
     // …testcontainers branch…
   }
   ```

2. **`pnpm run test`** — boot the cluster + export `DATABASE_URL` in one go:

   ```jsonc
   // apps/<slug>/package.json
   "scripts": {
     "test": "DATABASE_URL=$(../../scripts/local-postgres.sh start <slug>) vitest run --project back-e2e",
     "db:local:start": "../../scripts/local-postgres.sh start <slug>",
     "db:local:stop":  "../../scripts/local-postgres.sh stop <slug>",
     "db:local:wipe":  "../../scripts/local-postgres.sh wipe <slug>",
     "db:local:url":   "../../scripts/local-postgres.sh url <slug>"
   }
   ```

3. **Drizzle migrations** — the same `.sql` files
   (`api/src/database/migrations/`) get applied by `globalSetup`, so
   `drizzle-kit generate` is the only schema-changing tool you ever run.
   Never `drizzle-kit push` against this cluster: tests verify the SQL
   that prod's `DsqlSchema` construct will execute, so push-vs-migrate
   drift would invalidate the gate.

4. **CI fallback** — keep the testcontainers branch as the CI path. The
   `services: postgres: 16` block in `.github/workflows/<app>.yml` (or
   `DATABASE_URL` injected by the runner) trips the same shortcut.

## When NOT to use this pattern

- Production. Use Aurora DSQL via the `DsqlSchema` + `DsqlCluster`
  constructs.
- Anything that needs an extension Postgres doesn't ship in the base apt
  package. The script doesn't install `postgresql-contrib`.

## Pre-requisites

- `postgresql-16` apt package installed (`/usr/lib/postgresql/16/bin/initdb`
  must exist). The repo's `scripts/install-repo-deps.sh` doesn't install
  this — it's a sandbox-side concern. Add it to your dockerfile / runner
  bootstrap if you need it everywhere.

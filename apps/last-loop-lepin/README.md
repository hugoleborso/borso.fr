# last-loop-lepin

> Backyard ultra "qui a une fin" — race-day live dashboard at `last-loop-lepin.borso.fr`.

Spec : [`docs/features/last-loop-lepin/race-day-live/spec/spec.md`](../../docs/features/last-loop-lepin/race-day-live/spec/spec.md).
Plan : [`docs/features/last-loop-lepin/race-day-live/plan/plan.md`](../../docs/features/last-loop-lepin/race-day-live/plan/plan.md).

## Local

```
pnpm install
pnpm --filter @borso-app/last-loop-lepin run dev          # Vite (site)
pnpm --filter @borso-app/last-loop-lepin run dev:api      # Hono local server (port 3001)
pnpm --filter @borso-app/last-loop-lepin run test:core    # gate A (~1 s, no Docker)
pnpm --filter @borso-app/last-loop-lepin run test         # gate B (testcontainers Postgres)
```

## Layers

- `site/` — Vite + React frontend.
- `api/` — Hono on Lambda, Drizzle ORM over Aurora DSQL.
- `cdk/` — CDK app composing `PreviewableApp` + `DsqlClusterStack`.
- `test/` — shared setup (testcontainers Postgres) + race-scenario suites.

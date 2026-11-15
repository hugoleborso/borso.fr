# last-loop-lepin

> Backyard ultra "qui a une fin" — race-day live dashboard at `last-loop-lepin.borso.fr`.

Spec : [`docs/features/last-loop-lepin/race-day-live/spec/spec.md`](../../docs/features/last-loop-lepin/race-day-live/spec/spec.md).
Plan : [`docs/features/last-loop-lepin/race-day-live/plan/plan.md`](../../docs/features/last-loop-lepin/race-day-live/plan/plan.md).

## Local

```
pnpm install
pnpm --filter @borso-app/last-loop-lepin run dev          # Vite (site)
pnpm --filter @borso-app/last-loop-lepin run dev:api      # Hono local server (port 3001)
pnpm --filter @borso-app/last-loop-lepin exec vitest run --project core --changed <base>
pnpm --filter @borso-app/last-loop-lepin run test:e2e --changed <base>
```

CI runs `test:core` with coverage and the whole `test:e2e` suite. Locally, run only what the change affects.

## Layout

Run `ls apps/last-loop-lepin` to see what the app holds. The root `CLAUDE.md` describes the layout every full-stack app shares.

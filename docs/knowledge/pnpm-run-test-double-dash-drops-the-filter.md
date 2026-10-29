---
summary: '`pnpm run test:e2e -- <path>` passes the `--` on to Vitest, which then ignores the path and runs every file; write `pnpm run test:e2e <path>` or call `pnpm exec vitest run --project <name> <path>`.'
triggers:
  commands:
    - 'pnpm\b[^|;&]*\brun\s+test(:[a-z-]+)?\s+--\s'
---

# `pnpm run test:e2e -- <path>` runs everything

pnpm forwards every argument after the script name to the script, the `--`
included. The script's own command then receives `-- apps/…/x.test.ts`, and
Vitest's argument parser files everything after a `--` away as passthrough
arguments rather than as file filters. The path is dropped without a word and
the whole project runs.

On PR #193 that turned a one-file check in `apps/pragma` into all 29 back-e2e
files, about nine minutes, with no output until the end: the run looked hung
and then looked like a regression in files nobody had touched.

What works:

```bash
pnpm run test:e2e apps/pragma/api/src/takes/takes.controller.test.ts      # no --
cd apps/pragma && DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) \
  pnpm exec vitest run --project back-e2e api/src/takes/takes.controller.test.ts
```

The second form is the one to reach for in a full-stack app, because the
`test` script also starts the local Postgres and picks the project, and a bare
`pnpm exec vitest run <path>` without `--project` runs the file under every
project that includes it.

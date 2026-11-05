---
status: done
summary: |
  Slice 3 shipped. `POST /api/read-batch` takes 1 to 10 GET reads, runs each through
  `app.fetch` in parallel with the outer headers, and answers 200 with one status, content
  type and body per read, in order. A malformed batch answers 400 `read-batch-invalid`, is
  reported, and runs nothing. The route is mounted in `createApp` outside `AppRouter`, is a
  silent write for stale scope, is excluded from MCP tool coverage, and sets
  `read_batch.size` on the active span. Every slice 3 gate passes.
artifacts:
  - apps/pragma/domain/read-batch.core.ts
  - apps/pragma/domain/read-batch.core.test.ts
  - apps/pragma/api/src/read-batch/read-batch.schema.ts
  - apps/pragma/api/src/read-batch/read-batch.schema.test.ts
  - apps/pragma/api/src/read-batch/read-batch.core.ts
  - apps/pragma/api/src/read-batch/read-batch.core.test.ts
  - apps/pragma/api/src/read-batch/read-batch.service.ts
  - apps/pragma/api/src/read-batch/read-batch.controller.ts
  - apps/pragma/api/src/read-batch/read-batch.controller.test.ts
  - apps/pragma/api/src/app.ts
  - apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts
  - apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts
  - apps/pragma/api/src/realtime/stale-scope.core.ts
  - apps/pragma/api/src/realtime/derived-read-roots.test.ts
  - apps/pragma/api/src/mcp/tool-coverage.core.ts
  - apps/pragma/VOCABULARY.md
  - docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-03.md
next:
  kind: validate
---

# Implementation 03, slice 3 (the API read batch)

## Goal, smallest change, shape

- Goal. One `POST /api/read-batch` answers up to 10 reads in one Lambda, each through the
  whole app with its own status, so slice 4 can fold a tick's reads into one request.
- Smallest change. A domain core, one api slice (schema, core, service, controller, e2e),
  one mount in `createApp`, one silent write path, one tool exclusion, one span attribute,
  one VOCABULARY entry.
- Shape. `BatchedRead { path, headers: Partial<Record<PragmaRequestHeader, string>> }`,
  `ReadBatch { reads }` (1 to 10), `BatchedAnswer { status, contentType, body }`,
  `ReadBatchAnswer { answers }` in input order. Both request objects are strict, so an extra
  key such as `method` is refused.

## Choices the plan left open, or where the code differs from it

- `isBatchableRead` carries `core-decision`, not `core-lookup-table`. The lookup-table
  blueprint is for a function with no condition, and this one decides. It also refuses any
  path under `/api/read-batch/`, not only the exact path.
- The controller does not call the error-reporting adapter. `borso/no-controller-imports-outside-service`
  refuses that import (measured, lint failed). `answerReadBatch` records `read_batch.size`,
  and `reportInvalidReadBatch` in the service reports the 400.
- `api/src/realtime/derived-read-roots.test.ts` lists `read-batch` among the slices that hold
  no band data. The core suite failed without it (measured). The batch runs other slices'
  routes and imports none of their services.
- A body that is not JSON answers Hono's own 400 (`Malformed JSON in request body`), raised
  by the validator before our hook, so it carries no `read-batch-invalid` body and is not
  reported. Nothing runs. The e2e asserts the 400 only.
- A `GET /api/read-batch` answers 404, since only `POST` is mounted. The plan listed it with
  the 400 cases. The e2e asserts 404.

## Two reads on one pool, and one read that throws

- Shared pool. `postgres` keeps 10 connections by default and the client sets no `max`
  (measured in `database/client.ts`). One Lambda serves one request at a time, so 10 reads
  can each hold a connection, and a read's own parallel queries queue in `postgres.js`. The
  GET routes take no transaction (inferred from a grep of `transaction(` in the repositories,
  all on writes), so no read holds a connection while waiting on another. The e2e "answers ten
  reads at once" runs 10 reads in one batch and gets ten 200s.
- One read throws. `app.fetch` runs `onError` per item, so a thrown service answers 500 for
  that item only. The e2e spies `getSongs` to reject and gets `[200, 500, 200]`.
- Each item also runs `traceRequests`, so each read gets its own Sentry transaction and
  flush. Its latency cost on a cold Lambda is unknown and belongs to the preview measurement.

## Production size (gate 3.10)

The plan's query names `songs`. The table is `song`. Run as
`APP=pragma scripts/db-read.sh "SELECT count(*) AS songs, sum(length(row_to_json(song)::text)) AS json_bytes FROM song"`,
it returned 115 songs and 122,371 bytes of row JSON (measured). That is the rows, not the
API's answer, so the batch answer size is still to be measured on the preview.

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| 3.1 | `pnpm --filter @borso-app/pragma lint` (oxlint `--type-aware`) | pass, after moving reporting into the service |
| 3.2 | `pnpm run format:check` (oxfmt `--check`) | pass, 2903 files |
| 3.3 | `pnpm --filter @borso-app/pragma typecheck` | pass |
| 3.4 | `pnpm --filter @borso-app/pragma exec vitest run --project core --coverage` | pass, 397 files, 3825 tests, 100% per file, after removing an unreachable `??` branch |
| 3.5 | `pnpm --filter @borso-app/pragma build` | pass |
| 3.6 | `pnpm knip` | pass, exit 0 |
| 3.7 | `pnpm --filter @borso-app/pragma run test:e2e api/src/read-batch api/src/realtime api/src/mcp/tool-coverage.test.ts api/src/audience` | pass, 3 files, 48 tests. `tool-coverage` and `stale-scope-coverage` run in the core project, passed in 3.4 |
| 3.8 | `pnpm exec stryker run --mutate domain/read-batch.core.ts,api/src/read-batch/read-batch.core.ts,api/src/realtime/stale-scope.core.ts,api/src/mcp/tool-coverage.core.ts,api/src/helpers/observability/error-reporting.adapter.ts` | 194 killed, 0 survived, score 100 |
| 3.9 | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` and `scripts/check-vocabulary-paths.sh` | pass, pass |
| 3.10 | `scripts/db-read.sh` on `song` | 115 songs, see above |

## Friction

Logged with `scripts/kaizen.sh --from impl-3`: the plan's gate 3.10 names the wrong table,
and the plan's code map had the controller import the adapter, which the controller import
rule refuses.

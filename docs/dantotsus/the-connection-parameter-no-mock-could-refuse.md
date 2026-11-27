---
date: 2026-10-29
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#218'
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/database/smoke-agent-reader.ts, scripts/smoke-agent-reader.sh, .github/workflows/deploy.yml]
time-to-detect: same day
tags: [dsql, cdk, gates, infra, agents]
zone: infra/cdk/src/internal/agent-reader
weak-point: gate-measures-nothing
recurs: [the-blocklist-that-was-empty-because-nothing-was-deployed]
---

# The connection parameter no mock could refuse

## User impact

The operator's first production read through the reader Lambda that
ADR-2026-10-28T2126 introduced failed on its very first invocation after the
deploy.

| | Seen | Expected |
| --- | --- | --- |
| `scripts/db-read.sh` on pragma prod | `the reader function failed with PostgresError: setting configuration parameter "default_transaction_read_only" not supported` | the rows of the `SELECT` |

Measured from the session log of 2026-10-29. The IAM allow let the invoke
through, the function signed a DSQL token and reached the cluster. Aurora DSQL
then refused one Postgres startup parameter and closed the connection. Every
agent read of production was blocked until the fix deployed.

## Causal chain

- The reader failed on its first invocation.
  - DSQL rejected `default_transaction_read_only` as a startup parameter and
    closed the connection rather than ignoring it.
    - The reader passed it beside `search_path`:
      ```ts
      connection: { search_path: schema, default_transaction_read_only: true },  // ← the faulty line
      ```
      - `60b6f4d5e` (#218) added it as defence in depth, so the connection
        would stay read-only even if `BEGIN READ ONLY` were ever dropped. Its
        writer took the parameter from Postgres. The repository's record of
        DSQL's divergences, `docs/knowledge/dsql-postgres-compat-gaps.md`,
        named `search_path` as the one connection setting and nothing about
        refused startup parameters, then and now (`git show 60b6f4d5e^:…`
        and `grep`, this session). The fact that held the right answer was in
        no document the agent had. (Material)

## Root cause of occurrence

*Thought DSQL accepts the Postgres startup parameters, actually it refuses
`default_transaction_read_only` and closes the connection.* (Material)

Under the agentic 4M rule this is Material: the agent wrote correct Postgres,
and nothing in its context said DSQL differs at the connection layer. Had it
known the "actually" part, it would have kept `BEGIN READ ONLY`, which the
handler already emitted, and sent `search_path` alone, as the six application
clients do.

## Detection failure causes

- **Typing:** `connection` is typed `Partial<ConnectionParameters>`, and that
  interface ends in `[name: string]: string | number | boolean`, so every
  spelling type-checks.
- **Unit tests:** the handler's suite mocks `postgres`, following the
  `test-handler-mocked-sdk` blueprint. A double records options and has no
  notion of a server that refuses one. One test asserted the parameter was
  passed, so it asserted the defect.
- **Coverage, mutation:** both at 100% on the file. The line ran, and changing
  it broke the test that asserted it. Neither asks whether a value is
  acceptable to anything outside the process.
- **Preview deploys:** previews provision no reader. Every app stack passes
  `readerPrincipalArns` only when `isProduction`, so the function first exists
  in production.
- **Review:** the line reads as a correct Postgres setting, because it is one.

## Countermeasure

`2fff0fd67` removed the parameter. `BEGIN READ ONLY` inside the handler, which
`buildReadOnlySessionCommands` already emitted, is the read-only guarantee, and
the statement assessment refuses writes before any connection opens.

```diff
-    connection: { search_path: schema, default_transaction_read_only: true },
+    connection: { search_path: schema },
```

## Eradication

**Type:** detection (level 4). A smoke invocation after the production deploy.

**Reference:** commit [`2fff0fd67`](https://github.com/hugoleborso/borso.fr/commit/2fff0fd67) (#219)

`scripts/smoke-agent-reader.sh`, run by `.github/workflows/deploy.yml` right
after each application's production deploy, invokes that application's reader
with `SELECT 1` and fails the job unless one row comes back. An application
whose stack publishes no `AgentReaderFunctionName` exits 0. One `SELECT 1`
exercises the startup parameters, the read-only transaction, the role mapping
and every environment variable the construct set, so it covers the class *only
a cluster can refuse this*, not the one key.

Verified against production while the defect was still deployed:

```
[smoke-agent-reader] pragma: the reader function threw.
  {"errorType":"PostgresError","errorMessage":"setting configuration parameter
   \"default_transaction_read_only\" not supported", …}
exit=1
```

The judgement half is proven by two vitest suites, not by a canary. When this
entry shipped, `gate-canaries` planted a response with no rows and asserted the
refusal. `c54e32da7` (#224) deleted `scripts/standards/gate-canaries.ts` and
its registry the same day, and only a comment in `scripts/smoke-agent-reader.sh`
still mentions the canary. What holds today, read this session:
`scripts/database/smoke-verdict.core.test.ts` covers `decideSmokeVerdict` on
one row, on no rows, on more rows, on a refusal and on a failure passed through
verbatim, and `scripts/database/reader-invocation.utils.test.ts` covers how a
thrown `PostgresError` payload is read. The entry point that wires them,
`scripts/database/smoke-agent-reader.ts` with `--payload <file>` and its exit
codes, has no test. The invocation itself cannot be proven without a real
cluster.

This is level 4, not 2. It runs after the production deploy, so it catches the
next refused parameter in production, before an agent finds it, but after
users of the reader could.

**Proposed:** first, a vitest suite beside
`scripts/database/smoke-agent-reader.ts` that runs it with `--payload`
fixtures for no rows, a thrown `PostgresError` and one row, and asserts exit 1,
1 and 0. A broken wiring between the captured response and the job's exit
status could then not pass silently. The stale canary comment in
`scripts/smoke-agent-reader.sh` goes in the same change.

**Proposed:** then move the proof before merge. Provision the reader on previews,
by dropping the `isProduction` condition around `readerPrincipalArns` in each
app stack, and run `scripts/smoke-agent-reader.sh` in the preview deploy. A
parameter, a transaction syntax or a role mapping the cluster refuses would
then fail the pull request's preview, on a real cluster, before merge. What a
preview reader may read is an access decision for the operator, since
ADR-2026-10-28T2126 scoped the reader to production.

**Similar instances:** `git grep -n 'connection: {' -- apps infra scripts`
finds six application clients and the reader, all sending `search_path` alone.
The migration runner sets its schema with a `SET search_path` statement rather
than a startup parameter.

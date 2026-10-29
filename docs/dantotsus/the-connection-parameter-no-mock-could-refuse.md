---
date: 2026-10-29
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#218'
fix-pr: '#219'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-dsql-connection-parameters.sh, .husky/pre-commit]
time-to-detect: same day
tags: [dsql, cdk, gates, infra, agents]
zone: infra/cdk/src/internal/agent-reader
weak-point: gate-measures-nothing
recurs: [the-blocklist-that-was-empty-because-nothing-was-deployed]
---

# The connection parameter no mock could refuse

## Symptom

The first production read through the reader Lambda ADR-0049 introduced, on the
very first invocation after the deploy:

```
[db:read] pragma schema prod through pragma-prod-agent-reader, read only
[db:read] the reader function failed with PostgresError: setting configuration
          parameter "default_transaction_read_only" not supported
```

Everything around it worked. The IAM allow let the invoke through, the function
ran, it signed a DSQL token, it reached the cluster. Aurora DSQL then refused
one Postgres startup parameter and closed the connection.

The parameter was mine, added as defence in depth beside `search_path`: a
session-level read-only flag so the connection would be read-only even if
`BEGIN READ ONLY` were ever dropped. `search_path` is proven — all four
application API clients send it to DSQL in production.
`default_transaction_read_only` had never been sent to a cluster by anything in
this repository.

## Root-cause chain

1. **Why did the read fail?**
   DSQL rejects `default_transaction_read_only` as a startup parameter and
   closes the connection rather than ignoring it.
2. **Why did it reach production?**
   Nothing between writing it and invoking it talks to DSQL.
3. **Why did the unit tests pass?**
   The handler's suite mocks `postgres`, following the `test-handler-mocked-sdk`
   blueprint. The double is a function that takes an options object and records
   it. **A mock accepts every option, including ones no real server would.** One
   test even asserts the parameter is passed — it asserted the defect.
4. **Why did the coverage and mutation gates pass?**
   Both measure whether a line runs and whether changing it breaks a test. That
   line ran, and changing it broke the test that asserted it. 100% on each,
   measuring the wrong thing perfectly.
5. **Why was the parameter added at all without proof?**
   It reads as free: one more key in an object literal, obviously correct
   Postgres. The repository already had the answer in four files — the app
   clients send `search_path` and nothing else — and nothing made that list
   visible at the moment of writing.

**Root cause:** thought a connection parameter is part of the code, actually it
is part of a contract with a server no test in this repository talks to, and
every gate here runs on the side of the boundary that cannot refuse it.

## Detection failure causes

- **Linter / static analysis:** `connection` is typed
  `Partial<ConnectionParameters>` and that interface ends in
  `[name: string]: string | number | boolean`, so every spelling type-checks.
  TypeScript was never going to help.
- **Unit tests:** the double records options; it has no notion of a server that
  refuses one. This is inherent to mocking an SDK, not a gap in the suite.
- **Coverage, mutation:** both at 100% on the file, and neither asks whether a
  value is acceptable to anything outside the process.
- **Preview deploys:** previews provision no reader, so the function is created
  only in prod. Nothing exercised it before the production deploy.
- **Code review:** the line reads as a correct Postgres setting, because it is
  one. The defect is that the server is not Postgres.

## Countermeasure

- **Code:** the parameter is gone. `BEGIN READ ONLY` inside the handler, which
  `buildReadOnlySessionCommands` already emitted, is the read-only guarantee,
  and the statement assessment refuses writes before any connection opens.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the list of proven parameters becomes a gate)

**Reference:** PR #219 · commit `self`

**The actual fix:** one key removed.

```diff
-    connection: { search_path: schema, default_transaction_read_only: true },
+    connection: { search_path: schema },
```

**What stops the next one:** `scripts/check-dsql-connection-parameters.sh`
reads every `connection: { … }` under `apps/` and `infra/` and refuses a key
that is not in the list this repository has run against a real cluster and seen
work. It runs in pre-commit on changed `.ts` files.

```
infra/cdk/src/internal/agent-reader/index.ts:66:
  "default_transaction_read_only" is not a DSQL startup parameter this repository has proven.
  DSQL closes the connection on an unsupported one, and a mocked driver accepts it.
  Prove it against a cluster, then add it to PROVEN_PARAMETERS in
  scripts/check-dsql-connection-parameters.sh.
```

Verified both ways on the branch: the check passes on the fixed tree, and
re-planting the parameter makes it exit 1 naming the file, the line and the key.

The allow-list is the point, not the spelling. A parameter enters it by being
proven against a cluster, in the same commit — which is the step that was
skipped here, and the only one that could have caught this.

**Sibling defects swept:** the four application clients send `search_path` and
nothing else; the migration runner sets its schema with a `SET search_path`
statement rather than a startup parameter. No other site passes `connection`.

## See also

- [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) — the DDL and type divergences; this is the connection-layer one.
- [`the-blocklist-that-was-empty-because-nothing-was-deployed.md`](./the-blocklist-that-was-empty-because-nothing-was-deployed.md) — the same shape: a gate ran and returned the safe-looking answer.
- [`docs/adr/0049-agents-read-production-through-an-invoked-reader-lambda.md`](../adr/0049-agents-read-production-through-an-invoked-reader-lambda.md)
- [`docs/quality/weak-points.md`](../quality/weak-points.md) — `gate-measures-nothing`.

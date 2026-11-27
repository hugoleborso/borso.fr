---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#12'
fix-commits: [a257e83d71, 52684a2bb]
eradication-level: 5
eradication-paths: [infra/cdk/src/constructs/dsql-schema.ts, infra/cdk/src/constructs/lambda-api.ts]
time-to-detect: 30 minutes (live Lambda 500s, empty response, looked like a routing bug at first)
tags: [dsql, iam, cdk, auth]
zone: infra/cdk/src/constructs/dsql-schema.ts
---

# Granted `dsql:DbConnect`, but the app authenticated as admin

## User impact

Once the PR #12 preview of last-loop-lepin was reachable, every request
that touched the database returned 500 with an empty body. Requests that
did not touch it worked.

| | Seen | Expected |
| --- | --- | --- |
| Any API call reading DSQL | `500`, CloudWatch: `is not authorized to perform: dsql:DbConnectAdmin on resource: arn:aws:dsql:… because no identity-based policy allows the dsql:DbConnectAdmin action` | `200` with the data |

Measured from the Lambda logs by the session that deployed the preview.

## Causal chain

- Every DSQL request returned 500.
  - The connection was refused: IAM denied `dsql:DbConnectAdmin` to the Lambda's role.
    - The client signed an admin token and connected as `admin`.

      ```ts
      // apps/last-loop-lepin/api/src/database/client.ts at 5353b6de1
      const DSQL_USER = 'admin';
      password: () => signer.getDbConnectAdminAuthToken(), // ← needs dsql:DbConnectAdmin
      ```

      - Commit 5353b6de1 ("database client + 6 feature layers + Hono app", 2026-05-12) wrote the client. No document in the repository then described a non-admin DSQL user (measured, `git grep -n -i "AWS IAM GRANT\|CREATE ROLE" 5353b6de1 -- docs infra` finds nothing).
    - `DsqlSchema.grantConnect()` granted only `dsql:DbConnect`, the action for a non-admin role's token. It had done so since it was ported in 1aa979e74.

## Root cause of occurrence

*Thought DSQL ships only the `admin` user, so the admin token is the only
way for an app to connect, actually DSQL lets a migration create a role
`WITH LOGIN` and map it to an IAM role with `AWS IAM GRANT`, and that role
connects with `getDbConnectAuthToken()` under `dsql:DbConnect`, the action
the construct already granted.*

Tag: **Material** (agentic rule). No document on DSQL roles was in the
agent's context when it wrote the client. The repository proves the
"actually": since PR #118 (52684a2bb), the migration runner provisions a
role per stage, `CREATE ROLE "api_pr_42" WITH LOGIN` then `AWS IAM GRANT
"api_pr_42" TO '<lambda role>'` (`infra/cdk/src/internal/migration-runner/database-role.utils.test.ts:84`),
and all six apps sign with `getDbConnectAuthToken()`.

The Machine condition under it: the IAM action lives in the construct, and
the user and signer live in each app's `client.ts`. Nothing ties them, so
each side chose an auth mode alone.

## Detection failure causes

- **Typing:** the granted action is a string in a policy statement, with no type link to the signer method the client calls.
- **Local run:** locally `client.ts` reads `DATABASE_URL` and never goes through `DsqlSigner`, so no local test exercises IAM.
- **CI:** the infra tests synthesise the template and assert the granted action. Nothing asserts which signer a client calls.
- **Review:** the construct and the client are in different packages, so no diff showed both.
- **Monitoring:** Lambda errors surfaced only after a user hit the endpoint.

## Countermeasure

Commit a257e83d71 made `grantConnect` grant `dsql:DbConnectAdmin`, to
match the admin signer. PR #118 (52684a2bb) reversed that direction: the
construct grants `dsql:DbConnect` and provisions a per-stage role, and
every client connects as that role with `getDbConnectAuthToken()`.

## Eradication

**Type:** knowledge (level 5).

**Reference:** commit [`52684a2bb`](https://github.com/hugoleborso/borso.fr/commit/52684a2bb).
The original level-1 claim, that the construct always emits the admin
action, no longer holds: `infra/cdk/src/constructs/dsql-schema.ts:231`
grants `DSQL_CONNECT_ACTION`, and
`infra/cdk/test/unit/dsql-schema.test.ts:163` asserts "grantConnect gives
the function dsql:DbConnect, never DbConnectAdmin".

What holds today is half a link. The construct passes the role name to the
Lambda as `DSQL_ROLE` (`infra/cdk/src/constructs/lambda-api.ts:147`). The
signer method is still written in each of the six `client.ts` files, and no
test pins it (measured, `grep -rln getDbConnect apps/*/api/src --include=*.test.ts`
finds none). A client that calls `getDbConnectAdminAuthToken()` would
compile and fail only in a deployed Lambda, so the level is the floor.

`docs/knowledge/dsql-postgres-compat-gaps.md` §8, written in this entry's
kaizen (2e02ca813), still says "Only the `admin` user exists; only
`dsql:DbConnectAdmin` works at runtime". That is false since PR #118.

**Proof it can fail:** none, since nothing checks the client side.

**Proposed:** make the construct the only place that knows the auth mode.
`@borso/infra` would export a connect helper that returns the signer call
and the role together, and every `client.ts` would call it instead of
choosing a signer. A grant and a token of different modes could then never
be paired. No API imports `@borso/infra` at runtime today (measured,
`grep -rln "@borso/infra" apps/*/api/src` is empty), so this would be its
first runtime export.

**Proposed (cheaper):** a rule under `eslint-rules/`, loaded by oxlint
through the `jsPlugins` entry for `./eslint-rules/index.js` in
`.oxlintrc.json`, that refuses any call to `getDbConnectAdminAuthToken`
in a file under `apps/*/api/src`. No app code calls it today (measured,
`grep -rn getDbConnectAdminAuthToken apps --include=*.ts` is empty). The
only caller is the migration runner in
`infra/cdk/src/internal/migration-runner/index.ts:82`, outside that scope.
An app could then not sign the admin token that the construct never
grants it, and the check would refuse it at lint, before any deploy.

Both proposals need §8 of `docs/knowledge/dsql-postgres-compat-gaps.md`
corrected, so it stops telling the next agent that only the admin token
works.

**Similar instances:** `infra/cdk/src/internal/migration-runner/index.ts:82`
signs an admin token and its role holds `dsql:DbConnectAdmin`
(`dsql-schema.ts:183`), so it matches.
`infra/cdk/src/internal/agent-reader/index.ts:56` signs a regular token as
the reader role, which `grantReaderConnect` grants.

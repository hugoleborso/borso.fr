---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/12
fix-pr: https://github.com/hugoleborso/borso.fr/pull/12
fix-commits: [a257e83]
eradication-level: 1
time-to-detect: 30 minutes (live Lambda 500s — empty response — looked like a routing bug at first)
tags: [dsql, iam, cdk, auth]
---

# Granted `dsql:DbConnect`, but the app authenticated as admin

## Symptom

After the preview deploy landed and the API was finally reachable, every
DSQL-touching request returned 500. CloudWatch:

```
xr: unable to accept connection, access denied
…
hint: 'User: arn:aws:sts::…:assumed-role/last-loop-lepin-pr-12-AppApiFnServiceRoleB64F28C1-CJujPbvbwTqK/last-loop-lepin-pr-12-api
       is not authorized to perform: dsql:DbConnectAdmin on resource: arn:aws:dsql:…
       because no identity-based policy allows the dsql:DbConnectAdmin action'
```

The Lambda's IAM role had `dsql:DbConnect` (regular-user authn). The
client code in `api/src/database/client.ts` called
`DsqlSigner.getDbConnectAdminAuthToken()` — admin authn. The two paths
are independent on DSQL: you either grant `DbConnect` AND get a regular
token, or grant `DbConnectAdmin` AND get an admin token. Mixing them
fails at runtime.

## Root-cause chain

1. **Why did the request 500?**
   The DSQL connection couldn't authenticate.
2. **Why couldn't it authenticate?**
   IAM denied `dsql:DbConnectAdmin` for the Lambda role.
3. **Why did the role lack that action?**
   `DsqlSchema.grantConnect()` only attached `dsql:DbConnect`.
4. **Why did the code call `getDbConnectAdminAuthToken()` then?**
   DSQL ships exactly one Postgres user out of the box (`admin`); there
   is no migration-runner path to provision a non-admin user we could
   authn as. Calling the admin-token signer is the only working path on
   DSQL today.
5. **Why did the construct grant `DbConnect`?**
   Mirror of the `DsqlCluster.grantConnect` shape, which was written
   when we still thought non-admin users were on the roadmap. The
   shipped grant drifted away from the only viable client behaviour.

**Root cause:** *I thought DSQL behaved like RDS where the user
provisions per-app DB users, so granting `DbConnect` and letting the
runtime authenticate as a non-admin was a real option. Actually DSQL
ships only an `admin` user today and the `DbConnectAdmin` IAM action
is the only viable runtime grant.* If I had known that, the grant and
the signer call would have agreed on day one.

## Detection failure causes

- **Typing:** `grantable.grantPrincipal.addToPrincipalPolicy(...)` has
  no type-level link to `DsqlSigner.getDbConnectAdminAuthToken`. The
  grant action is a free string.
- **Linter / static analysis:** no rule cross-references "what action
  did we grant" with "what API does the client call".
- **Functional validation locally:** local Postgres bypasses DSQL
  entirely — `client.ts` reads `DATABASE_URL` instead of going through
  `DsqlSigner`, so the local back-e2e suite never exercises the IAM
  path.
- **CI (tests / build):** infra tests synth the CFN template but don't
  execute it against AWS.
- **Code review:** I wrote both sides in the same session and missed
  the divergence.
- **Production monitoring:** Lambda errors fire after the user hits the
  endpoint; no synthetic ping is wired.

## Countermeasure

`infra/cdk/src/constructs/dsql-schema.ts` — `grantConnect` now grants
`dsql:DbConnectAdmin` to match the only path `DsqlSigner` offers on
DSQL.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

The structural argument: there is exactly one DSQL Postgres user the
migration runner ever talks to (`admin`), and exactly one signer method
the runtime calls. The grant now matches the signer; the previously-
expressible misconfiguration is no longer expressible because the only
construct shipping the grant always emits the admin action.

**Reference:** [PR #12](https://github.com/hugoleborso/borso.fr/pull/12) ·
commit [`a257e83`](https://github.com/hugoleborso/borso.fr/commit/a257e83)

**The actual fix:**

```diff
-  /**
-   * Grant `dsql:DbConnect` on the cluster to a Lambda. The grantee must
-   * connect with the schema as its `search_path`; the construct does not
-   * narrow IAM to a specific schema (DSQL doesn't support that today).
-   */
+  /**
+   * Grant `dsql:DbConnectAdmin` on the cluster to a Lambda. The grantee
+   * MUST authenticate via `DsqlSigner.getDbConnectAdminAuthToken()` and
+   * set its connection `search_path` to {@link schemaName} — the
+   * schema-per-stage layout is what gives us isolation, because DSQL
+   * doesn't (yet) narrow IAM to a specific schema OR support non-admin
+   * application users we could provision from the migration runner.
+   */
   public grantConnect(grantable: IGrantable): void {
     grantable.grantPrincipal.addToPrincipalPolicy(
       new PolicyStatement({
         effect: Effect.ALLOW,
-        actions: ['dsql:DbConnect'],
+        actions: ['dsql:DbConnectAdmin'],
         resources: [this.clusterArn],
       }),
     );
   }
```

**Sibling defects swept:** Migration runner already used
`getDbConnectAdminAuthToken()` and had the matching grant via the
custom-resource provider role — only the app Lambda was mismatched.

## See also

- [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md)
  — the broader list of DSQL behaviours that diverge from RDS/Postgres
  mental models.

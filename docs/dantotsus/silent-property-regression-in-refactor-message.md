---
date: 2026-05-25
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#25'
fix-commits: [79ffc6ac6a, f531ff64e]
eradication-level: 5
eradication-paths: [CLAUDE.md, apps/last-loop-lepin/cdk/lib/stack.ts]
time-to-detect: days
tags: [claude-md, refactor, observability, last-loop-lepin, dsql, auth, self-improvement-loop]
zone: apps/last-loop-lepin/api/src/auth/auth.service.ts
---

# A refactor commit said "drop both Secrets Manager secrets" and silently dropped the shared-across-stages property of one of them

## User impact

The race admin of last-loop-lepin could not sign in. Admin login on the PR #27
preview, and on prod, returned
`500 {"error":"auth denied", "reason":"misconfigured"}`. Before PR #25, one PIN
seeded once by the operator opened the admin on every stage.

| | Seen | Expected |
| --- | --- | --- |
| Admin login on a fresh preview or prod | 500 `misconfigured` | the admin panel, with the operator's PIN |

## Causal chain

- Admin login answered 500 `misconfigured`.
  - `login` found no PIN hash.

    ```ts
    const pinHash = await findAdminPinHash();
    if (pinHash === null) {
      throw new AuthDeniedError('misconfigured'); // ← ❌ every stage's admin_credentials starts empty
    }
    ```

    - The stage's `admin_credentials` table was empty. Migration
      `0002_admin_auth_tables.sql` creates it per schema, and each preview gets
      a fresh `pr_<N>` schema.
      - 1951beb06 (2026-05-17, PR #25) replaced both Secrets Manager secrets
        with per-schema tables. One of them was not per stage.

        ```ts
        const ADMIN_PIN_HASH_SECRET_NAME = `${APP_SLUG}/admin-pin-hash`; // 1951beb~1, stack.ts:19: no stage segment
        ```

        The other, `<app>/<stage>/admin-jwt-secret`, was. Every stage had read
        the same PIN secret, so one operator seed reached them all. The
        commit's body framed the change as "$0.80/mo saved, drop two SM
        secrets, auth lives in DB" and named neither property.

## Root cause of occurrence

*Thought the admin PIN was per-stage data like the JWT secret, actually every
stage read one unsuffixed secret, and the replacement table is per schema and
starts empty.* (Man)

The writer was an agent. The unsuffixed secret name was in its context: its own
diff deleted the line. The prior that both secrets were alike won. The commit
body, which treated the two secrets as one cost, is where that belief shows. It
is not the cause.

## Detection failure causes

- **Local validation:** dev seeds its own `admin_credentials` row in the local
  Postgres, so local login works.
- **CI:** no test logs in to a freshly deployed stage.
- **Review:** the body named cost numbers and showed one happy login on a seeded
  database. The dropped property was not named, so nobody asked.
- **Monitoring:** a 500 on admin login is a low-traffic event, and no alarm
  covers it. The post-deploy step in `deploy.yml` runs
  `scripts/smoke-agent-reader.sh` and `/api/health` answers `{ ok: true }`
  whether or not a credential exists.

## Countermeasure

f531ff64e (PR #27) clones each preview schema from prod through `DsqlSchema`'s
`cloneFromSchema`, so a preview inherits prod's `admin_credentials` row. See
[`dsql-clone-from-prod.md`](../knowledge/dsql-clone-from-prod.md). Prod still
needs its row seeded once by the operator.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit [`79ffc6ac6a`](https://github.com/hugoleborso/borso.fr/commit/79ffc6ac6a)
and commit f531ff64e.

What holds today:

- Previews cannot start empty while prod has a row: `apps/last-loop-lepin/cdk/lib/stack.ts`
  passes `cloneFromSchema`.
- CLAUDE.md's hard rules say: "A `refactor:` or `chore:` commit that replaces a
  mechanism names the property the old one had and the new one drops." It is a
  written instruction. `commitlint.config.js` does not check it.

Nothing stops a stage whose `admin_credentials` is empty from shipping
silently, prod included. The 2026-05-25 entry gave no reason a stronger
mechanism could not work, and one can.

**Proposed:** hold the property in the system. Make `/api/health` in
`apps/last-loop-lepin/api/src/app.ts` answer 503 when `findAdminPinHash()`
returns null, and add a step to `deploy.yml` that calls it after the deploy, so
a prod stage with no credential fails its deploy instead of failing its admin.
Alternatively, seed the row in a migration from a deploy-time parameter. Either
makes an empty credential table impossible to ship unnoticed. The CLAUDE.md rule
can then go. Neither exists yet.

**Proof it can fail:** not run.

**Similar instances:** pragma also moved auth into a per-schema table, and its
auth row arrives with the clone from prod (`.github/workflows/preview.yml`, the
auto-seed step's comment). The same empty-prod risk applies to it (inferred).

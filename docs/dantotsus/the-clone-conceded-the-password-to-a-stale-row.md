---
date: 2026-08-10
introduced-at: implementation
detected-at: staging
severity: high
related-pr: '#40'
fix-commits: [e3af9d248a, 4aaab634c7]
eradication-level: 2
eradication-paths: [infra/cdk/src/constructs/dsql-schema.ts, infra/cdk/src/internal/migration-runner/clone-from-schema.utils.ts]
time-to-detect: minutes
tags: [dsql, cdk, preview, auth, pragma, clone]
zone: infra/cdk/src/internal/migration-runner
---

# The clone conceded the password to a stale row

## User impact

pragma's previews were changed to clone production, so a reviewer sees real
songs and setlists instead of a thin fixture
([ADR-2026-08-09T1654](../adr/2026-08-09T1654-pragma-previews-clone-production.md);
the operator consented to his band's data being replicated into a
password-protected preview). The first deploy looked like a success: the song
count went from the fixture's handful to 56.

| | Seen | Expected |
| --- | --- | --- |
| `POST …/api/auth/login` with `{"password":"pragma-preview"}` on the PR-40 preview | `200` | `401 invalid-password` |

`pragma-preview` is the test fixture's password, written in this public
repository. The preview served real band data behind a password anybody could
read on GitHub. Measured by probing the live PR-40 preview on 2026-08-10.

## Causal chain

- The fixture's password signed into a preview holding production data.
  - `app_config` row id=1 still held the fixture's hash.
    - The clone skipped production's row id=1, because the target already had
      one and the copy concedes every conflict:
      ```sql
      INSERT INTO pr_N.<t> (cols) SELECT cols FROM prod.<t>
        ON CONFLICT DO NOTHING  -- ← the faulty line
      ```
      - The target was not empty. The test fixture had bootstrapped that
        preview schema on an earlier deploy, before cloning was switched on.
      - `44dd7ae69` (2026-05-25) wrote the clone with one conflict rule for
        every table. Its message names the case it designed for: "Re-deploy of
        the same PR: `ON CONFLICT DO NOTHING` keeps existing" rows. The
        construct's API offered `tableBlocklist` and `columnsToNullify`, and no
        way to say a table must mirror its source. (Machine)

## Root cause of occurrence

*Thought the only rows a clone would collide with were its own, from an
earlier deploy of the same preview, actually a target seeded by anything else
holds rows with the same fixed ids, and for a singleton credential row the
existing row then wins silently.* (Machine)

The API defaulted every table to "the existing row wins" and could not express
"the source is authoritative". For domain data the default is right, because a
re-deploy keeps what the preview accumulated. For a credential row with a fixed
primary key, collision is the normal case, so the one row where losing is
unacceptable is the one row guaranteed to lose.

## Detection failure causes

- **Typing:** `tableBlocklist` and `columnsToNullify` were both optional string
  lists. Every wrong configuration was well typed.
- **CI:** the pragma cdk suite asserted the clone config's contents, so it
  confirmed the configuration that had the hole. The runner's own tests all
  start from an empty schema, the one condition under which this cannot fail.
- **Deploy:** the clone step reports success when its statements run. It
  checks nothing about the rows it skipped.
- **Monitoring:** nothing watches previews.

## Countermeasure

`e3af9d2` adds `tablesToReplace`, which empties a named table just before its
rows are copied, so the source is authoritative on every deploy. pragma names
`app_config`. Verified after redeploy: the fixture's password returns
`401 invalid-password`. A 503 `auth-not-bootstrapped` would have meant an empty
table. The 401 means production's row is in place. The cost is a sub-second
window mid-deploy, between the `DELETE` and the `INSERT`, where the app answers
503.

## Eradication

**Type:** DevX check (level 2). The construct refuses to synthesize a clone
that leaves a known credential table undecided.

**Reference:** [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) commit [`4aaab63`](https://github.com/hugoleborso/borso.fr/commit/4aaab63)

```diff
+  const undecided = findUndecidedCredentialTables(config, migrations.map((m) => m.sql));
+  if (undecided.length === 0) return;
+  throw new Error(
+    `DsqlSchema: cloneFromSchema does not say what to do with ${undecided.join(', ')}. ` +
+      `Add each to tableBlocklist (the preview gets no credential) or to tablesToReplace ` +
+      `(the preview shares the source's credential — see ADR-2026-08-09T1654).`,
+  );
```

`apps/pragma/cdk/test/stack.test.ts` and its last-loop-lepin sibling build the
stack, so a clone config that leaves one of those tables undecided fails there
and in CI (inferred from the suites building the stack, not planted this
session).

The gap, stated: the guard asks only about names on a list kept by hand,
`CREDENTIAL_TABLES = ['app_config', 'admin_credentials']` in
`infra/cdk/src/internal/migration-runner/clone-from-schema.utils.ts`. The list
has already drifted. pragma has since created `member_credential`,
`member_passkey`, `vapid_key_pair` and other secret tables, and decides each in
its own `SECRET_TABLES_*` constants in `apps/pragma/cdk/lib/stack.ts`. The
guard would not have asked about any of them (measured this session).

**Proposed:** delete `CREDENTIAL_TABLES` and require a decision for every
table. The guard already parses each migration's `CREATE TABLE`. Make
`cloneFromSchema` take one record keyed by table name, whose values say what
the preview gets, such as `copyNew`, `copyFromSource` or `leaveEmpty`, and
refuse at synth any created table missing from it. The default "existing row
wins" then disappears, and no table can be cloned without a stated decision,
whatever its name. The same shape is proposed in
[the-commit-that-reversed-an-adr-without-touching-it](./the-commit-that-reversed-an-adr-without-touching-it.md).

**Similar instances:** `git grep -n 'cloneFromSchema:' -- 'apps/*/cdk'` finds
last-loop-lepin and pragma. last-loop-lepin blocklists `admin_credentials`,
and pragma replaces `app_config` and `member_credential`.

---
date: 2026-08-10
introduced-at: implementation
detected-at: staging
severity: high
related-pr: 40
fix-pr: 40
fix-commits: [e3af9d2, 4aaab63]
eradication-level: 1
time-to-detect: minutes
tags: [dsql, cdk, preview, auth, pragma, clone]
---

# The clone conceded the password to a stale row

## Symptom

pragma's previews were changed to clone production, so a reviewer sees
real songs and real setlists instead of a thin fixture (ratified in
[ADR-0009](../adr/0009-pragma-previews-clone-production.md); the operator
consented explicitly to their own and their band's data being replicated
into a password-protected preview).

The first deploy looked like a success. The song count went from the
fixture's handful to 56, so production data had landed. Then, probing the
live PR-40 preview:

```
$ curl -so /dev/null -w '%{http_code}' -X POST …/api/auth/login \
    -d '{"password":"pragma-preview"}'
200
```

`pragma-preview` is the password the **test fixture** uses. It is written
in this repository, which is public. So the preview was serving real band
data — names, songs, setlists — behind a password anybody could read on
GitHub. The worst available combination of the two halves, and each half
had worked exactly as written.

## Root-cause chain

1. **Why did the fixture's password still work?** `app_config` row id=1
   still held the fixture's hash. Production's row had not replaced it.
2. **Why not?** The clone's data step is
   `INSERT … SELECT … ON CONFLICT DO NOTHING`. Row id=1 already existed in
   the target, so production's row lost the conflict and was skipped —
   silently, as designed.
3. **Why did row id=1 already exist?** That preview schema had been
   bootstrapped by the test fixture on an earlier deploy, before cloning
   was switched on. The clone ran against a schema that was not empty.
4. **Why was `ON CONFLICT DO NOTHING` chosen?** Because it is right for
   domain data: a re-deploy keeps what the preview accumulated and adds
   what is new upstream. It is wrong for a singleton row whose only
   purpose is to mirror the source, and the config had no way to say which
   kind a table was.
5. **Why did the deploy report success?** It did everything it was asked.
   No step failed. The gap was between "the clone ran" and "the clone's
   result is what anyone intended".

**Root cause:** *thought "clone production" means the target ends up
matching the source, actually it means "add the source's rows where they
do not collide" — and for a credential row with a fixed primary key,
collision is the normal case, so the one row where losing silently is
unacceptable is the one row guaranteed to lose.*

## Detection failure causes

- **Typing:** `tableBlocklist` and `columnsToNullify` were both optional
  string lists. Every wrong configuration was a well-typed one.
- **Linter:** not a lint-shaped defect.
- **CI:** the pragma cdk suite asserted the clone config's contents, so it
  faithfully confirmed the configuration that had the hole. No test
  exercised a clone into a **non-empty** target, which is the only
  condition under which this fails — the runner's own tests all start
  from an empty schema.
- **Code review:** would have required knowing that this particular
  preview schema predated cloning.
- **QA validation:** caught it. The only reason it was found is a probe
  that asked *"does the old password still work?"* rather than *"did the
  data arrive?"* — the second question returned a satisfying yes.
- **Production monitoring:** the affected surface is a preview. Nothing
  watches previews, and previews are public.

## Countermeasure

- **Code:** commit `e3af9d2` — `tablesToReplace` empties a named table
  immediately before its rows are copied, so the source is authoritative
  on every deploy. pragma names `app_config`.
- Verified after redeploy: the fixture's password returns
  `401 invalid-password`. 401 rather than 503 matters — 503
  `auth-not-bootstrapped` would mean the table was left empty; 401 means
  production's row is in place.
- **Cost, stated:** a sub-second window mid-deploy, between the DELETE and
  the INSERT, where the app answers 503.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — the construct refuses to synthesize a clone
that has not stated its decision)

**Reference:** [PR #40](https://github.com/hugoleborso/borso.fr/pull/40)
commit [`e3af9d2`](https://github.com/hugoleborso/borso.fr/commit/e3af9d2)
· [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) commit
[`4aaab63`](https://github.com/hugoleborso/borso.fr/commit/4aaab63)

`e3af9d2` fixed the instance. It did nothing to stop the next app from
repeating it, so `4aaab63` makes the omission unsynthesizable:

```diff
+function assertCredentialTablesDecided(
+  config: DsqlSchemaCloneFromConfig | undefined,
+  migrations: readonly MigrationFile[],
+): void {
+  if (config === undefined) return;
+  const undecided = findUndecidedCredentialTables(config, migrations.map((m) => m.sql));
+  if (undecided.length === 0) return;
+  throw new Error(
+    `DsqlSchema: cloneFromSchema does not say what to do with ${undecided.join(', ')}. ` +
+      `Add each to tableBlocklist (the preview gets no credential) or to tablesToReplace ` +
+      `(the preview shares the source's credential — see ADR-0009).`,
+  );
+}
```

The three outcomes are all defensible and all different, which is exactly
why the choice must be written rather than defaulted:

| Config | Result |
| --- | --- |
| blocklisted | preview has no credential, answers 503 until seeded |
| in `tablesToReplace` | preview shares the source's credential (ADR-0009) |
| **neither** | whatever row was already there wins — **this defect** |

Scoped to credential tables the app's own migrations `CREATE`, so pragma
is asked about `app_config` and last-loop-lepin about
`admin_credentials`, neither about the other's. A guard that fires on
schemas it does not apply to is a guard somebody deletes. `ALTER TABLE`
does not count as creating one, so an app inheriting a cloned schema is
not asked to re-decide.

**The limit, stated:** the table-name list is hand-maintained. An app that
names its credential table something else escapes the guard until the name
is added. A regex was rejected because it would fire on `config`,
`configuration`, and every table with `auth` in it — noise is what gets a
guard removed.

**Sibling defects swept:** last-loop-lepin's clone already blocklisted
`admin_credentials` (commit `a6177d7`, PR #40) after the same class of
question was asked of it, so both existing configs satisfy the new guard
and no template changes. `auth_attempt` remains blocklisted on pragma —
rate-limit state, not data.

## See also

- [`docs/adr/0009-pragma-previews-clone-production.md`](../adr/0009-pragma-previews-clone-production.md)
  — the decision to clone at all, and the consent it rests on.
- [`docs/knowledge/dsql-clone-from-prod.md`](../knowledge/dsql-clone-from-prod.md)
  — the clone contract in full.
- [`fresh-prod-bootstrap-503.md`](./fresh-prod-bootstrap-503.md) — the 503
  the replace window briefly reproduces, and why it is the safe failure.
- [`a-gate-that-reported-success-while-measuring-nothing.md`](./a-gate-that-reported-success-while-measuring-nothing.md)
  — the same shape one layer up: a step that did everything asked of it
  and nothing anyone wanted.

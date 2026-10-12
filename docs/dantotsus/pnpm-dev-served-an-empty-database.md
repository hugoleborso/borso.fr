---
date: 2026-10-02
introduced-at: implementation
detected-at: local
severity: medium
related-pr: "#107"
fix-pr: "#119"
fix-commits: [a28ffcf, 75d966d, 40af66d]
eradication-level: 2
time-to-detect: weeks
tags: [pragma, banana-rush, local-dev, dsql, gates, pre-commit]
---

# `pnpm dev` served an empty database, and the next app copied it

## Symptom

The visual validation of PR #107 started pragma with `pnpm dev`, the
command the `/visual-validation` skill spawns. Every API call answered 500:

```
PostgresError: relation "member_credential" does not exist
```

The validator could not sign in, seed, or reach a single screen behind the
login. The session spent six tool calls finding out that the dev database
had never had a schema, then applied the migrations by hand through
`test/setup-postgres.ts`.

## Root-cause chain

1. **Why did every route answer 500?** The dev database had no tables.
2. **Why no tables?** pragma's `dev:db` script was
   `../../scripts/local-postgres.sh start pragma dev`. It boots the cluster
   and creates the database. It applies nothing.
3. **Why did nobody notice?** A developer who had once run the back-e2e
   suite against the same cluster, or applied migrations by hand, had
   tables, and kept them, because nothing ever wiped that database. The
   defect only shows on a cluster nobody has prepared, which is exactly
   what a validator or a fresh checkout gets.
4. **Why did a second app have it?** banana-rush was scaffolded from
   pragma, scripts included, and inherited the same `dev:db`.
   last-loop-lepin, the oldest app, has a `dev-db.sh` that does migrate;
   the copy was taken from the app that did not.

**Root cause:** thought booting the dev cluster was the dev database's
whole setup, actually the schema only ever existed on machines where
something else had already written it.

## Detection failure causes

- **CI:** CI never runs `pnpm dev`. The back-e2e suite migrates through its
  own global setup, so the suite is green whatever `dev:db` does.
- **Code review:** the script is one line and reads correctly; the missing
  half is invisible without knowing what last-loop-lepin's does.
- **Functional validation locally:** the author's own database had tables
  from earlier runs, so `pnpm dev` worked for the only person who tried it.

## Countermeasure

- **Code:** commit `a28ffcf` points pragma's `dev:db` at
  `test/dev-database.setup.ts`, which replays every migration through
  `test/setup-postgres.ts` and seeds the preview fixture, so a fresh
  checkout signs in as `hugo` / `pragma-preview`. Commit `75d966d` does the
  same for banana-rush, which has no fixture and only migrates. Both were
  verified from an emptied `public` schema: tables come back, the command
  exits 0, and pragma's sign-in answers 200.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — DevX check)

**Reference:** commits `a28ffcf`, `75d966d`, `40af66d`

**The actual fix:** `scripts/check-app-registration.sh`, which already
fails an app missing its path filter or commitlint scope, now fails an app
that owns `api/src/database/migrations/` while its `dev:db` neither runs
`test/dev-database.setup.ts` nor `dev-db.sh`:

```diff
+  if [ -d "${app_directory}api/src/database/migrations" ]; then
+    dev_database_script=$(node -e "…scripts?.['dev:db'] ?? ''")
+    if ! printf '%s' "$dev_database_script" | grep -qE 'test/dev-database\.setup\.ts|dev-db\.sh'; then
+      echo "[check-app-registration] $slug owns migrations but its dev:db does not apply them." >&2
```

Verified both ways: green on the tree, and red with that message when
pragma's `dev:db` is put back to the bare cluster start. A fourth
full-stack app scaffolded the old way now fails its first commit.

**Sibling defects swept:** banana-rush (`75d966d`). last-loop-lepin's
`dev-db.sh` already migrates and is accepted by the check as it is.

## See also

- [`driving-pragma-auth-from-a-validator.md`](../knowledge/driving-pragma-auth-from-a-validator.md)
- [`local-postgres-without-docker.md`](../knowledge/local-postgres-without-docker.md)

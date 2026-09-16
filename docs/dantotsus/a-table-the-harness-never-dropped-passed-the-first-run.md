---
date: 2026-09-16
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#104'
fix-pr: '#105'
fix-commits: []
eradication-level: 2
time-to-detect: minutes
tags: [testing, postgres, dsql, migrations, harness, pragma]
---

# A table the harness never dropped, and the second run that found it

## Symptom

The back-e2e suite passed. Run again, unchanged, and it died before a single
test body ran:

```
Serialized Error: { severity: 'ERROR', code: '42P07',
  query: 'CREATE TABLE "outreach_template" (...)' }
```

The same command, the same tree, green then red.

## Root-cause chain

1. **Why did the second run fail where the first passed?**
   The table already existed. `CREATE TABLE` without `IF NOT EXISTS` is
   42P07 against a table that is already there.
2. **Why did it already exist?**
   The first run created it and nothing dropped it afterwards.
3. **Why did nothing drop it?**
   `apps/pragma/test/setup-postgres.ts` drops a hard-coded list of tables
   before replaying every migration. `outreach_template` was added to the
   migrations and to `test/database-utils.ts`, whose list is truncated
   between cases, but not to the setup file's list.
4. **Why were two lists written and only one updated?**
   They look like the same list and are not: one is dropped before the
   schema is rebuilt, the other is truncated between cases. A developer who
   finds one by grepping for the table name beside its neighbours has no
   signal that a second exists.
5. **Why did the gate not catch it?**
   Nothing compared the tables the migrations create against the tables the
   harness knows. Both files read correctly on their own.

**Root cause:** thought the harness reset the schema, actually it drops a
hand-maintained list of tables, so a table absent from that list survives the
reset and collides with its own `CREATE TABLE` on the next run.

## Detection failure causes

- **Typing:** the lists are string arrays; no type relates them to the schema.
- **Linter / static analysis:** no rule reads SQL.
- **Functional validation locally:** the first run passed, which is the whole
  trap. A defect that needs two runs is invisible to a developer who runs once
  and pushes.
- **CI:** every CI job starts from an empty Postgres service, so CI is
  permanently in the "first run" state and can never see this class of defect.
- **Code review:** the diff added a table and updated a list; the missing
  second list is an absence, and absences do not appear in diffs.

## Countermeasure

The table was added to `test/setup-postgres.ts`'s `TRACKED_TABLES` during
PR #104, which restored the reset.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit gate)

**Reference:** PR #105

**The actual fix:** `scripts/check-coupled-lists.sh` gained a fourth section
that reads every `CREATE TABLE` out of each application's migrations and
requires the name in both harness files:

```diff
+for migrations_dir in apps/*/api/src/database/migrations; do
+  created_tables=$(grep -ho 'CREATE TABLE[[:space:]]*"[a-z_]*"' "$migrations_dir"/*.sql | ...)
+  while IFS= read -r table; do
+    if ! grep -qE "(^|[^a-z_])$table([^a-z_]|$)" "$setup_file"; then
+      fail "$migrations_dir creates '$table' and $setup_file does not list it. ..."
```

The check was verified against the original defect: deleting
`'outreach_template'` from the setup file reproduces the failure at commit
time rather than on the second test run. One harness names its tables in a
quoted array and the other inside a single `DROP TABLE` statement, so the
comparison is on the name rather than on a spelling.

**Sibling defects swept:** the same check now covers `last-loop-lepin`, whose
harness lists its tables in a different shape and agreed.

## See also

- [`two-copies-that-had-to-agree-and-nothing-made-them.md`](./two-copies-that-had-to-agree-and-nothing-made-them.md) — the same class, which is why this check lives in the same script.
- [`the-test-suite-wiped-the-database-the-dev-server-was-reading.md`](./the-test-suite-wiped-the-database-the-dev-server-was-reading.md) — the other half of what this harness's reset reaches.

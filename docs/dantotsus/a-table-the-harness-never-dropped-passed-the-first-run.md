---
date: 2026-09-16
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#104'
fix-commits: [60fcd964e8]
eradication-level: 2
eradication-paths: [scripts/check-coupled-lists.sh]
time-to-detect: minutes
tags: [testing, postgres, dsql, migrations, harness, pragma]
zone: apps/pragma/test/setup-postgres.ts
---

# A table the harness never dropped, and the second run that found it

## User impact

The users are the developers running pragma's back-e2e suite. It passed.
Run again, unchanged, it died before a single test body ran:

```
Serialized Error: { severity: 'ERROR', code: '42P07',
  query: 'CREATE TABLE "outreach_template" (...)' }
```

| | Seen | Expected |
| --- | --- | --- |
| Second run of the same suite on the same tree | 42P07 before any test | the same green as the first run |

## Causal chain

- The second run failed where the first passed.
  - Migration 0006 ran `CREATE TABLE "outreach_template"` on a database
    where the table already existed, which is 42P07.
    - The harness did not drop it before replaying the migrations. It drops a
      list kept by hand:

      ```ts
      await sql.unsafe(`DROP TABLE IF EXISTS ${TRACKED_TABLES.join(', ')} CASCADE`);   // ← drops only the listed tables
      ```

      - Commit f3447d969 (PR #104, an agent session) added the migration and
        added the table to `test/database-utils.ts`'s `ALL_TABLES`, the list
        truncated between cases. It did not add it to
        `test/setup-postgres.ts`'s `TRACKED_TABLES`, the list dropped before
        the schema is rebuilt.
        - The harness resets through two lists that look alike, live in two
          files, and name nothing that points from one to the other.
          **Machine.**

## Root cause of occurrence

*Thought the harness rebuilt the schema from the migrations, so a new table
needed only its migration and the truncate list, actually it drops a second
hand-kept list first, and a table absent from that list survives the reset
and collides with its own `CREATE TABLE` on the next run.* **Machine:** two
copies of the same fact, with nothing linking them.

`apps/pragma/test/setup-postgres.ts`, read this session: the drop runs
`TRACKED_TABLES` only, then replays every migration statement.

## Detection failure causes

- **Typing:** the lists are string arrays. No type relates them to the
  schema.
- **Linter:** no rule reads SQL.
- **Local validation:** the first run passed. A defect that needs two runs is
  invisible to a developer who runs once and pushes.
- **CI:** every CI job starts from an empty Postgres service, so CI is always
  in the first-run state and can never see this class.
- **Review:** the diff added a table and updated a list. The second list was
  an absence, and absences do not appear in diffs.

## Countermeasure

Commit 7bf4a7029, in PR #104, added the table to `TRACKED_TABLES`, which
restored the reset.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`60fcd964e`](https://github.com/hugoleborso/borso.fr/commit/60fcd964e8).
`scripts/check-coupled-lists.sh` gained a section that reads every
`CREATE TABLE` out of each application's migrations and requires the name in
both harness files. It runs in pre-commit when a migration or a harness file
changes, and in CI.

```diff
+  created_tables=$(
+    grep -ho 'CREATE TABLE[[:space:]]*"[a-z_]*"' "$migrations_dir"/*.sql |
+      sed 's/.*"\(.*\)"/\1/' | sort -u
+  )
```

It holds with a gap. The pattern misses `CREATE TABLE IF NOT EXISTS`, the
spelling of most pragma migrations since 0015. Six live tables created that
way are absent from `TRACKED_TABLES`: `assistant_client`, `assistant_grant`,
`assistant_authorization_code`, `vapid_key_pair`, `realtime_connection` and
`gear_item`. The check still prints "the coupled lists agree" (measured
2026-11-27). Those tables do not collide on a second run, because of
`IF NOT EXISTS`. They survive the reset with whatever shape and rows the last
run left.

**Proposed:** remove both lists. `setup-postgres.ts` would run
`DROP SCHEMA public CASCADE; CREATE SCHEMA public` before replaying the
migrations, and `database-utils.ts` would truncate every table that
`pg_tables` lists in `public`. The harness then cannot miss a table, however
its migration spells `CREATE TABLE`, and the coupled-lists section can be
deleted. This holds only because the harness runs on its own sandbox
Postgres, which `pnpm --filter @borso-app/pragma run test` boots
(`setup-postgres.ts` refuses to run without `DATABASE_URL`). The schema drop
must never reach the database the dev server reads, the trap of
[the-test-suite-wiped-the-database-the-dev-server-was-reading](./the-test-suite-wiped-the-database-the-dev-server-was-reading.md).

**Proof it can fail:** deleting `'outreach_template'` from the setup file
made the check fail at commit time, when the entry was written.

**Similar instances:** the same check covers `last-loop-lepin`, whose
harness names its tables inside one `DROP TABLE` statement.
`grep -n 'CREATE TABLE IF NOT EXISTS' apps/*/api/src/database/migrations/*.sql` lists
the migrations the pattern does not read.

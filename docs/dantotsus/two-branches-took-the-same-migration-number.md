---
date: 2026-09-16
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#100'
fix-pr: '#102'
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [dsql, pragma, gates, pre-commit, ci, git]
---

# Two branches took the same migration number, and git had no objection

## Symptom

Merging `main` into the tasks-and-compos branch produced a migrations
folder with two files numbered `0006`:

```
0005_song_release_id.sql
0006_deezer_identifiers.sql        ← from main, PR #101
0006_tasks_and_song_origin.sql     ← from this branch, PR #100
0007_spotify_track_id.sql
```

Git reported no conflict. Both files were new, neither touched the
other, and the merge was clean. The collision was visible only to
somebody who listed the directory and read the numbers.

## Root-cause chain

1. **Why were there two `0006` files?**
   Both branches were open at the same time. Each read the tree, saw
   `0005` as the highest number, and took the next one.
2. **Why did neither branch see the other's number?**
   Because neither branch contained the other's commit. A migration
   number is a claim on a shared sequence, but it is expressed as a
   filename in a working tree that knows only its own side.
3. **Why did git not flag it?**
   Git detects a conflict when two sides change the same bytes. Two
   files with different names are two additions, and additions merge.
   The sequence lives in the names, and nothing reads the names.
4. **Why is a shared number harmful?**
   The runner applies migrations in filename order and records each
   applied *name* in a table. Two files sharing a number both run, and
   their relative order is decided by whatever character follows the
   number. Here `0006_deezer_…` ran before `0006_tasks_…` because `d`
   sorts before `t`. Nothing chose that; it is a coin toss that landed
   the right way up.
5. **Why is a coin toss dangerous when both migrations are additive?**
   It is not, for these two. It is dangerous for the next pair, where
   one adds a column the other backfills, and the order that was never
   chosen is suddenly the order that matters.

**Root cause:** thought the migration number was a property of the file
being added, actually it is a claim on a sequence shared with every
other open branch, and the only thing that could notice a double claim
is something that reads the whole directory at once.

## Detection failure causes

- **Typing:** a filename carries no type.
- **Linter / static analysis:** ESLint does not lint SQL, and no rule
  looks at sibling filenames.
- **Functional validation locally:** the back-e2e suite drops and
  re-applies every migration in filename order, so it exercised the
  arbitrary order and passed under it. It would have passed under the
  other order too — which is exactly why passing proved nothing.
- **CI:** `check-migration-sql-dsql-compat.sh` reads each file's
  statements and never compares two files.
- **Code review:** the collision is two lines apart in a directory
  listing that nobody has a reason to open during a feature review.
- **Staging monitoring:** the preview database applied both, in the
  lucky order, and reported success.

## Countermeasure

The second migration was renumbered to `0008_tasks_and_song_origin.sql`
in the merge commit, which is free while a migration has only ever run
against a preview database: the runner keys its applied table on the
filename, so the renamed file runs once more under its new name, and
every statement in it is `IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS`.
It stops being free the moment the number reaches prod's applied table
under the other file's name.

- **Code:** commit `13f1a84` — renamed the file and said why in the
  merge message, so the next reader knows the rename was deliberate.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** PR #102 · commit on this branch adding
`scripts/check-migration-numbering.sh`

**The actual fix:**

```diff
+for migrations_dir in apps/*/api/src/database/migrations; do
+  duplicates="$(
+    find "$migrations_dir" -maxdepth 1 -name '*.sql' -printf '%f\n' |
+      sed -n 's/^\([0-9][0-9]*\)_.*/\1/p' |
+      sort | uniq -d
+  )"
+  for number in $duplicates; do
+    failed=1
+    echo "[check-migration-numbering] $migrations_dir: ${number} is taken twice:" >&2
```

Wired into `.husky/pre-commit` beside the DSQL-compat scan, on the same
condition (a staged migration), and into `ci.yml` so a push made with
hooks skipped still gets caught.

The commit hook alone would not have caught this one: neither branch
committed a second `0006`, the merge did. CI is the half that matters
here, because the merge commit is the first tree that holds both files
— which is also the first moment the collision is fixable for free.

**Sibling defects swept:** `apps/last-loop-lepin` has its own migrations
folder and the check walks every `apps/*/api/src/database/migrations`,
so it is covered without naming it.

## See also

- [`dsql-alter-table-only-add-column.md`](./dsql-alter-table-only-add-column.md)
  — the other thing about a migration that only a script can see, and the
  reason every statement here is re-runnable, which is what made the
  rename free.
- [`a-rebase-cannot-see-what-a-merge-decided.md`](../knowledge/a-rebase-cannot-see-what-a-merge-decided.md)
  — the neighbouring case where the information a merge holds is lost
  by replaying commits one at a time.

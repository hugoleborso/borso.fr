---
date: 2026-09-16
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#100'
fix-commits: [948204d50a, 4154b33a23]
eradication-level: 4
eradication-paths: [scripts/check-numbered-sequences.sh, .github/workflows/ci.yml]
time-to-detect: hours
tags: [dsql, pragma, gates, pre-commit, ci, git]
zone: apps/pragma/api/src/database/migrations
recurs: none (first occurrence of a shared sequence number guessed from a local tree)
---

# Two branches took the same migration number, and git had no objection

## User impact

No pragma user saw a failure. The defect is an order nobody chose between two
schema changes, which decides the outcome the day both touch one table.
Merging `main` into the tasks-and-compos branch on 2026-09-16 produced
(listed in that session):

| | Seen | Expected |
| --- | --- | --- |
| `apps/pragma/api/src/database/migrations` after the merge | `0006_deezer_identifiers.sql` (main, PR #101) and `0006_tasks_and_song_origin.sql` (this branch, PR #100) | one file per number |
| What git said | a clean merge, no conflict | a signal that both branches claimed `0006` |

## Causal chain

- The migrations folder held two files numbered `0006`, and git merged them cleanly.
  - Git conflicts only when both sides change the same path. Two new files with different names are two additions.
    - PR #100 added `0006_tasks_and_song_origin.sql` while PR #101 added `0006_deezer_identifiers.sql`, both open at once.
      - Each branch read its own tree, saw `0005_song_release_id.sql` as the highest, and named its file with the next number. ← the faulty line is the file name
        - The repository's convention makes the number the order: the runner applies files in filename order and records each applied name. The number is a claim on a sequence every open branch shares, yet it is picked from one branch's tree (Machine).
  - The runner then applied `0006_deezer_…` before `0006_tasks_…`, because `d` sorts before `t`. Both are additive, so this order happened to be harmless.

## Root cause of occurrence

*Thought the migration number was a property of the file being added, actually
it is a claim on a sequence shared with every other open branch, and only
something that reads the whole merged folder can see a double claim.*
**Machine:** the numbering convention asks the writer to allocate a shared id
from a local view. No tool allocates it.

`scripts/check-numbered-sequences.sh:9-12`, read this session: "Two branches
open at once each read the tree, each see the highest number, each take the
next one. The files have different names, so git merges them cleanly and the
duplicate reaches main without a conflict."

## Detection failure causes

- **Typing and linter:** a filename carries no type, and no rule looked at sibling filenames.
- **Local validation:** the back-e2e suite drops and re-applies every migration in filename order. It passed under the arbitrary order, and would have passed under the other one.
- **CI:** `check-migration-sql-dsql-compat.sh` reads each file's statements and never compares two files.
- **Review:** each branch's diff held one new file with a plausible number.
- **Staging:** the preview database applied both, in the lucky order, and reported success.

## Countermeasure

The branch's migration was renamed `0008_tasks_and_song_origin.sql` in merge
commit `13f1a84`, whose message says why. The rename is free while a
migration has only run on a preview database. The runner keys its applied
table on the filename, so the renamed file runs once more, and every
statement in it is `IF NOT EXISTS`.

## Eradication

**Type:** detection (level 4)

**Reference:** PR #102 shipped `scripts/check-migration-numbering.sh`.
Commit `4154b33a23` merged it with its sibling into
`scripts/check-numbered-sequences.sh`
(see [the-loop-shipped-the-same-gate-twice.md](./the-loop-shipped-the-same-gate-twice.md)).
It runs in `.husky/pre-commit` (line 372, on a staged migration or ADR) and
in `ci.yml` (line 86).

```bash
duplicates="$(find "$migrations_dir" -maxdepth 1 -name '*.sql' -printf '%f\n' |
  sed -n 's/^\([0-9][0-9]*\)_.*/\1/p' | sort | uniq -d)"
```

**Proof it can fail:** on a scratch copy of today's migrations folder, a
planted `0006_bar_owner.sql` beside `0006_deezer_identifiers.sql` exits 1:

```
[check-numbered-sequences] apps/pragma/api/src/database/migrations: 0006 is claimed by more than one migration:
  0006_bar_owner.sql
  0006_deezer_identifiers.sql
```

**Why level 4 and not 2:** the gate sees the duplicate only in a tree that
holds both files.

- Neither branch commits a duplicate, so pre-commit never fires on either.
- A clean `git merge` runs no `pre-commit` hook, and `.husky/` has no
  `pre-merge-commit` (listed this session).
- CI on `pull_request` tests the branch merged with `main` as it was when the
  run started (`ci.yml:17-20`). Two pull requests that each passed CI before
  the other merged both reach `main`.
- `main` has no protection rule and no ruleset (`gh api
  repos/hugoleborso/borso.fr/branches/main/protection` answers 404 and
  `.../rules/branches/main` answers `[]`, both run this session).
- So the class is caught before the merge only when someone merges `main`
  into the branch first, and otherwise by `main`'s own CI run, after the
  merge.

**Proposed:** check the merged tree before the merge. The merge hook already
finds the `main` commits no CI run tested beside the branch, and lets the
merge through when no file changed on both sides
(`scripts/hooks/checks/merge-deploys-prod.core.ts:209-217`). That is exactly
the migration case. On that path, build the merged tree with `git merge-tree
--write-tree origin/main <head>` (git 2.43 here) and run the sequence check on
its file list (`git ls-tree -r --name-only <tree>`), refusing on a duplicate.
That makes a duplicate number impossible to merge from a session (level 2).
The level-1 fix needs repository settings: require branches to be up to date
before merging, or a merge queue. That is an operator-backlog row, not yet
written. A timestamp id, as the ADRs moved to, would not help: the order still
matters, and a timestamp only swaps the alphabet's arbitrary order for an
arbitrary time order.

**Similar instances:** the gate walks every `apps/*/api/src/database/migrations`
and `docs/adr/`, so `apps/last-loop-lepin` is covered. The same collision
recurred the same day in
[two-branches-that-both-claimed-migration-0006.md](./two-branches-that-both-claimed-migration-0006.md),
and for an ADR number in
[an-adr-number-goes-to-whoever-writes-it-first.md](./an-adr-number-goes-to-whoever-writes-it-first.md).

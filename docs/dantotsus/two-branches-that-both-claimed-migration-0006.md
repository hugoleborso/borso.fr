---
date: 2026-09-16
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#104'
fix-pr: '#105'
fix-commits: []
eradication-level: 2
time-to-detect: days
tags: [migrations, git, dsql, pragma, meta]
---

# Two branches that both claimed migration 0006

## Symptom

Merging `main` into a feature branch produced a migrations folder with two
`0006`, two `0007` and two `0008`:

```
0006_bar_owner.sql        0006_deezer_identifiers.sql
0007_member_contact...    0007_spotify_track_id.sql
0008_bar_concert_mood...  0008_tasks_and_song_origin.sql
```

Git reported no conflict. Every file was new on its own side.

## Root-cause chain

1. **Why did git not conflict?**
   Two different filenames added to one directory is a clean merge. A
   conflict needs the same path on both sides.
2. **Why did both branches pick 0006?**
   Each read the folder when it started and took the next free number. Both
   were right at the time they looked.
3. **Why did nothing fail afterwards?**
   The runner tracks applied migrations by filename, not by number, so each
   file still ran exactly once. Nothing was skipped and nothing re-ran.
4. **Why is it a defect at all then?**
   Because the number is the only thing that orders one migration against
   another, and a shared number orders nothing: the sort falls back to the
   slug, so `0006_bar_owner` runs before `0006_deezer_identifiers` because
   "b" precedes "d". That is not a decision anybody made, and the day two
   same-numbered migrations touch the same table it is the alphabet that
   decides the outcome.
5. **Why did no gate see it?**
   Each branch's own commits were fine. The collision exists only in the
   merged tree, which is the moment nobody is reading migration numbers.

**Root cause:** thought a migration number was allocated, actually it is
guessed from the folder's current state, so two branches open at once guess
the same one and the merge keeps both.

## Detection failure causes

- **Typing:** filenames are not typed.
- **Linter / static analysis:** no rule reads the migrations folder.
- **CI:** CI applies migrations to an empty database, where any order works.
- **Code review:** the reviewer of each branch saw one new file with a
  plausible number.
- **Production monitoring:** would only surface if two same-numbered
  migrations depended on each other, which is the rare case this prevents.

## Countermeasure

The later branch's three migrations were renumbered 0009, 0010 and 0011
during the merge, and the merge commit records why.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit gate)

> **Superseded mechanism.** The script this entry shipped was merged into
> [`scripts/check-numbered-sequences.sh`](../../scripts/check-numbered-sequences.sh),
> which covers every folder where the leading number is the order rather than
> migrations alone. Two gates existed for this one subject for a day; see
> [`the-loop-shipped-the-same-gate-twice.md`](./the-loop-shipped-the-same-gate-twice.md).

**Reference:** PR #105

**The actual fix:** `scripts/check-migration-numbers.sh`, wired into
pre-commit, refuses a folder where a number is claimed twice:

```diff
+  duplicates=$(find "$migrations_dir" -maxdepth 1 -name '*.sql' -printf '%f\n' |
+      sed -n 's/^\([0-9][0-9]*\)_.*/\1/p' | sort | uniq -d)
+  ... "$migrations_dir: ${number} is claimed by more than one migration"
```

It fires on the commit that resolves a merge, which is the first moment both
files exist in one tree and therefore the first moment the collision is
observable. Verified by reproducing the original pair: restoring
`0006_bar_owner.sql` beside `0006_deezer_identifiers.sql` fails the check.

## See also

- [`a-generated-file-cannot-contain-its-own-commit.md`](./a-generated-file-cannot-contain-its-own-commit.md) — another defect that only exists once two branches meet.

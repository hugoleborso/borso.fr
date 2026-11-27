---
date: 2026-09-16
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#104'
fix-commits: [60fcd964e8, 4154b33a23]
eradication-level: 4
eradication-paths: [scripts/check-numbered-sequences.sh, .github/workflows/ci.yml]
time-to-detect: days
tags: [migrations, git, dsql, pragma, meta]
zone: apps/pragma/api/src/database/migrations
recurs: [two-branches-took-the-same-migration-number]
---

# Two branches that both claimed migration 0006

## User impact

No pragma user saw a failure. The defect is an order nobody chose between
schema changes. Merging `main` into the branch of PR #104 on 2026-09-16
produced (listed in that session):

| | Seen | Expected |
| --- | --- | --- |
| The migrations folder after the merge | two `0006`, two `0007` and two `0008`: `0006_bar_owner.sql` beside `0006_deezer_identifiers.sql`, `0007_member_contact…` beside `0007_spotify_track_id.sql`, `0008_bar_concert_mood…` beside `0008_tasks_and_song_origin.sql` | one file per number |
| What git said | a clean merge, no conflict | a signal that both sides claimed the same numbers |

## Causal chain

- The merged folder held three numbers claimed twice, and git merged it cleanly.
  - Every file was new on its own side, and a conflict needs the same path on both.
    - PR #104 named its three migrations `0006`, `0007` and `0008` while `main` gained its own `0006` to `0008`. ← the faulty file names
      - The branch read the folder when it started and took the next free numbers. `main` moved after that.
        - The convention makes the writer allocate a shared sequence number from one branch's tree (Machine), the cause recorded the same day in [two-branches-took-the-same-migration-number.md](./two-branches-took-the-same-migration-number.md).
  - The runner tracks applied migrations by filename, so each file still ran once, and the sort fell back to the slug: `0006_bar_owner` before `0006_deezer_identifiers`, because `b` precedes `d`.

## Root cause of occurrence

*Thought a migration number was allocated, actually it is guessed from the
folder's current state, so two branches open at once guess the same one and
the merge keeps both.* **Machine:** no tool allocates the number, and the
convention puts the order in it.

`scripts/check-numbered-sequences.sh:9-12`, read this session: "Two branches
open at once each read the tree, each see the highest number, each take the
next one."

## Detection failure causes

- **Typing and linter:** filenames carry no type, and no rule read the migrations folder.
- **CI:** CI applies migrations to an empty database, where any order works. No step compared two filenames yet.
- **Review:** each branch's reviewer saw new files with plausible numbers. The collision exists only in the merged tree.
- **Monitoring:** would surface only if two same-numbered migrations depended on each other.

## Countermeasure

The branch's three migrations were renumbered `0009`, `0010` and `0011`
during the merge, and the merge commit records why. They are still there
today (`ls apps/pragma/api/src/database/migrations`, this session).

## Eradication

**Type:** detection (level 4)

**Reference:** commit `60fcd964e8` shipped `scripts/check-migration-numbers.sh`.
Commit `4154b33a23` merged it with its same-day twin into
`scripts/check-numbered-sequences.sh`, which runs in `.husky/pre-commit`
(line 372) and `ci.yml` (line 86)
(see [the-loop-shipped-the-same-gate-twice.md](./the-loop-shipped-the-same-gate-twice.md)).

**Proof it can fail:** a planted `0006_bar_owner.sql` beside
`0006_deezer_identifiers.sql` on a scratch copy exits 1 with
"0006 is claimed by more than one migration" (run this session).

**The earlier claim was wrong.** This entry said the gate "fires on the
commit that resolves a merge". A clean `git merge` runs no `pre-commit`, and
`.husky/` has no `pre-merge-commit`. A pull request merged on GitHub makes no
local commit at all. CI on `pull_request` tests `main` as it was when the run
started (`ci.yml:17-20`), and `main` has no protection rule and no ruleset
(404 and `[]`, run this session). Two migration pull requests that each passed
CI can still merge as a duplicate, caught only by `main`'s own CI run after
the merge. Hence level 4.

**Proposed:** run the sequence check on the merged tree before the merge,
from the merge hook's no-overlap path
(`scripts/hooks/checks/merge-deploys-prod.core.ts:209-217`), with `git
merge-tree --write-tree origin/main <head>`. The full proposal, and the
operator setting that would make it level 1, are in
[two-branches-took-the-same-migration-number.md](./two-branches-took-the-same-migration-number.md).

**Similar instances:** the gate covers every `apps/*/api/src/database/migrations`
and `docs/adr/`. Another defect that only exists once two branches meet is
[a-generated-file-cannot-contain-its-own-commit.md](./a-generated-file-cannot-contain-its-own-commit.md).

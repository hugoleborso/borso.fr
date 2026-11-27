---
date: 2026-11-15
introduced-at: conception
detected-at: local
severity: low
related-pr: '#347'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/check-coupled-lists.sh, scripts/check-adr-numbers-resolve.sh, .claude/skills/after-task-kaizen/SKILL.md, .claude/skills/adr/SKILL.md]
time-to-detect: days
tags: [agents, git, self-improvement-loop, process]
zone: docs/quality/feature-cost.md
recurs: [two-merges-sixteen-seconds-apart-one-untested-main]
---

# Every sweep appended to the same three lists

## User impact

The operator approved one merge of PR #347, and it took four merge attempts and three CI runs.

| | Seen | Expected |
| --- | --- | --- |
| PR #347, 2026-11-15 | `merge-on-moved-base` refused the merge three times, each after another kaizen pull request (#346, #340, #344) landed. Each time the branch merged `main` and waited for CI again (measured, this session) | The merge runs once CI is green |
| The last 25 kaizen merges on `main` | 25 edited `docs/quality/feature-cost.md`, 19 edited `docs/knowledge/README.md`, 9 edited `docs/adr/README.md` (measured, `git show --name-only` over `git log --grep='^docs: lessons from PR' -n 25`) | Two sweeps share a file only when they change the same thing |

## Causal chain

- The merge of a kaizen pull request is refused, and the branch waits for another CI run.
  - `merge-on-moved-base` (`scripts/hooks/checks/merge-deploys-prod.core.ts`) refuses when `main` moved after CI started and both sides changed one file name.
    - PR #347 shared exactly one file with each of #346, #340 and #344, `docs/quality/feature-cost.md` (measured, `git show --name-only` on the four merge commits). Every sweep changed the same lists, because each one appended a row to a hand-kept list.
      - `/after-task-kaizen` told each sweep to add an index line to the knowledge README and a cost row to one table. `/adr` told each record to add a row to the ADR README. `check-coupled-lists.sh` and `check-adr-numbers-resolve.sh` refused an entry missing from its list.
        - Commit `5e229e433` (2026-05-03) wrote "Add a one-line entry to `docs/knowledge/README.md` index." into the sweep skill. Commit `8f077e11b` (2026-10-29, PR #228) wrote "Add one row to `docs/quality/feature-cost.md`". Each list was added while the corpus was small and one session wrote at a time (inferred from the dates).

## Root cause of occurrence

*Thought a list in a README helps a reader find an entry, actually the files already name themselves and the list made every writer edit one file.* (Method)

The process told every sweep to write to one shared file, so parallel sweeps collided by design. The `merge=union` rule in `.gitattributes` was the earlier countermeasure for the cost table and the ADR index. GitHub does not apply it, and the merge hook compares file names, so neither the conflict nor the refusal went away. The coordinating session's message of 2026-11-15 said the same: "GitHub ignores the `merge=union` rule in `.gitattributes`".

## Detection failure causes

- **Sweeps:** each sweep met the collision once, merged `main` in, and recorded nothing, because a clean local merge looked like no defect.
- **Hook:** `merge-on-moved-base` held the guarantee it was built for. It cannot tell an appended row from a real overlap, and should not have to.

## Countermeasure

Remove the lists, as the operator ruled on 2026-11-15: "We never need to keep lists in readme. We just need to let the agents know how to find info. Lists go stale and cause conflicts."

- `docs/knowledge/README.md` and `docs/adr/README.md` lose their indexes and say how to find an entry with `grep`. Each knowledge entry already has a `summary:`, and each ADR already has its title and status in its first lines (measured, all 68 records carry a `Status:` line).
- `check-coupled-lists.sh` no longer demands an index line, and `check-adr-numbers-resolve.sh` no longer demands an index row.
- A sweep writes its cost row to `docs/features/meta/lessons-from-pr-<N>/cost.md`, its own folder. `docs/quality/feature-cost.md` keeps the targets and the rows up to 2026-11-15, with the command that reads every row.
- The `merge=union` rules are gone from `.gitattributes`, because no list is left to append to.

Property dropped: a one-page list of every knowledge entry and every ADR, grouped by topic, readable on GitHub without a command.

## Eradication

**Type:** structural impossibility (level 1), for hand-kept lists only

No instruction or gate asks two sweeps to edit a shared list, so the three lists no longer collide.

The wider class is open. Sweeps still edit the same instruction files. Of the 19 kaizen merges on `main` since 2026-11-16, 9 edited `CLAUDE.md` and 9 edited `.claude/skills/after-task-kaizen/SKILL.md` (measured, `git log --since=2026-11-16 --grep='^docs: lessons from PR' --name-only`). `merge-on-moved-base` compares file names, so two sweeps that change different lines of one file are refused like a real overlap. That cause is Machine: the repository merges with no queue that tests the merged tree, so the gate serializes pull requests by hand, one CI run per collision.

**Reference:** the commit adding this file, `8230bcebe` (PR #352), which removed both instructions.

```diff
-4. Add a one-line entry to `docs/knowledge/README.md` index.
-Add one row to `docs/quality/feature-cost.md`, by the sources its *Targets*
+Write `docs/features/meta/lessons-from-pr-<N>/cost.md`, one row under the
+header of `docs/quality/feature-cost.md`, by the sources its *Targets* table
```

**Proposed:** turn on GitHub's merge queue for `main`. It is a repository setting, so it needs an operator backlog file under `docs/operator-backlog/`. The queue tests the merged tree and merges one pull request at a time. `merge-on-moved-base` and the hand-run merge, push and wait loop could then be deleted, for every pull request. Two sweeps that edit different lines of one file would then cost no extra CI round.

**Similar instances:** `git log --grep='^docs: lessons from PR' --name-only` over the merges since 2026-11-16 finds `CLAUDE.md` and the sweep skill as the remaining shared files.

See also [two-merges-sixteen-seconds-apart-one-untested-main](two-merges-sixteen-seconds-apart-one-untested-main.md), which built the refusal this entry kept meeting.

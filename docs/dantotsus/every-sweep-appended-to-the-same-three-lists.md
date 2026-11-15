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
  - `merge-on-moved-base` refuses when `main` moved after CI started and both sides changed one file.
    - Every sweep changes the same files, because each one appends a row to a hand-kept list.
      - `/after-task-kaizen` told each sweep to add a cost row to one table and an index line to the knowledge README, and `/adr` told each record to add a row to the ADR README. `check-coupled-lists.sh` and `check-adr-numbers-resolve.sh` refused an entry missing from its list.

## Root cause of occurrence

*Thought a list in a README helps a reader find an entry, actually the files already name themselves and the list made every writer edit one file.*

The `merge=union` rule in `.gitattributes` was the earlier countermeasure for the cost table and the ADR index. GitHub does not apply it, and the merge hook compares file names, so neither the conflict nor the refusal went away. The coordinating session's message of 2026-11-15 said the same: "GitHub ignores the `merge=union` rule in `.gitattributes`".

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

**Type:** structural impossibility (level 1)

No instruction or gate asks two sweeps to edit a shared list, so two sweeps share a file only when they change the same content.

**Reference:** commit `self`

```diff
-4. Add a one-line entry to `docs/knowledge/README.md` index.
-Add one row to `docs/quality/feature-cost.md`, by the sources its *Targets*
+Write `docs/features/meta/lessons-from-pr-<N>/cost.md`, one row under the
+header of `docs/quality/feature-cost.md`, by the sources its *Targets* table
```

See also [two-merges-sixteen-seconds-apart-one-untested-main](two-merges-sixteen-seconds-apart-one-untested-main.md), which built the refusal this entry kept meeting.

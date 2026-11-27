---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#216'
fix-commits: [bff04a955]
eradication-level: 2
eradication-paths: [scripts/check-named-paths-exist.sh, .github/workflows/ci.yml]
time-to-detect: days
tags: [gates, pre-commit, ci, harness, pragma]
zone: apps/pragma/scripts/task-metrics/run-task-metrics.sh
recurs: none (the named-paths gate read prose and backticks; this is the first call by path it missed)
---

# The runner called a script main had deleted

## User impact

The pragma task-metrics harness, which the operator uses to measure a change, could not run at all. Nothing said so when `main` was merged into the branch of PR #216. A reviewer found it two hours later.

| | Seen | Expected |
| --- | --- | --- |
| `run-task-metrics.sh` after `main` was merged into PR #216 | Every run failed: `scripts/argent.sh` was gone | The harness signs in and measures the task |

`review6`, 2026-10-29 10:07: "The task-metrics harness (run-task-metrics.sh, --screen-rule included) cannot run since #224 removed scripts/argent.sh and the argent binary it calls for sign-in taps." The repair, commit `6dd6eac9` on PR #216, replaced argent with agent-browser and a CDP touch adapter.

## Causal chain

- Every run of the task-metrics harness failed on PR #216's branch.
  - The runner called a script that no longer existed.

    ```bash
    # apps/pragma/scripts/task-metrics/run-task-metrics.sh, lines 34 and 39, before 6dd6eac9
    scripts/argent.sh start   # ❌ deleted on main by c54e32da7
    scripts/argent.sh stop
    ```

    - The merge of `main` into the branch brought in the deletion.
      - Commit `c54e32da7` (PR #224, 2026-10-29, written by an agent) deleted `scripts/argent.sh` while cutting harness cost. It updated every caller on `main`: `CLAUDE.md`, the visual-validator agent, the harness README and `harness-path.sh` (measured with `git grep argent.sh c54e32da7^`). No caller lived under `apps/` on `main`.
        - The only code caller lived on #216's unmerged branch. From `main`, where #224 was written and checked, a caller on another branch cannot be seen. (Machine)

## Root cause of occurrence

*Thought `scripts/argent.sh` had no caller left once every reference on `main` was updated, actually a caller existed on an open branch, and it would meet the deletion only at that branch's next merge of `main`.*

Machine. A deletion is checked against the tree it is made in. Callers on open branches are outside that tree, so the first place the deletion and its caller meet is the merge into the branch.

## Detection failure causes

- **Named-paths gate:** `check-named-paths-exist.sh` read `docs/*.md` citations in scripts and backticked paths in instruction files. It did not read a script calling another script by path. `apps/*/scripts/` held no shell script when its surfaces were chosen.
- **Git hooks at the merge:** the merge of `main` completed without a conflict. A clean merge runs `pre-merge-commit`, not `pre-commit`, and `.husky/` has no `pre-merge-commit` (measured: `ls .husky` lists `commit-msg`, `pre-commit` and `pre-push`).
- **CI:** the harness runs on demand, never in CI, so only a person running it could notice.

## Countermeasure

Commit `6dd6eac9` on PR #216 replaced the argent calls with agent-browser and a CDP touch adapter.

## Eradication

**Type:** DevX check (level 2). An existing gate gains a surface.

**Reference:** commit [`bff04a955`](https://github.com/hugoleborso/borso.fr/commit/bff04a955) (PR #233).

```diff
-SURFACES=('scripts/*' '.husky/*' '.github/*' 'plugins/*' 'CLAUDE.md' '.claude/*')
+SURFACES=('scripts/*' '.husky/*' '.github/*' 'plugins/*' 'CLAUDE.md' '.claude/*' 'apps/*/scripts/*')
+# 3. A script that a shell script or a workflow calls by its path.
```

Every `scripts/…{sh,ts,mjs,js,py}` that a shell script, a hook or a workflow calls must resolve from the repository root, from the app holding the caller, or from the caller's folder. The gate runs in `.husky/pre-commit` with `--staged` and in `.github/workflows/ci.yml` on the whole tree.

On this entry's case, CI on the branch fails once the merge is pushed. No local hook refuses the merge itself, which is why the level stays at 2 with a gap.

**Proposed:** add `.husky/pre-merge-commit` that runs `scripts/check-named-paths-exist.sh` on the whole tree, as CI does. A clean merge that brings a deletion onto a branch still calling the deleted script would then be refused at the merge, before any push.

**Proof it can fail:** on a scratch worktree at `6dd6eac9^`, the tree just before the repair (recorded by the first version of this entry):

```text
[check-named-paths-exist] apps/pragma/scripts/task-metrics/run-task-metrics.sh:34: calls scripts/argent.sh, which is not there
[check-named-paths-exist] apps/pragma/scripts/task-metrics/run-task-metrics.sh:39: calls scripts/argent.sh, which is not there
exit 1
```

The gate as it was before passed the same tree. In `--staged` mode, staging the deletion of `scripts/lint-staged-files.sh` was refused with `.husky/pre-commit:142: calls scripts/lint-staged-files.sh, which is not there`.

**Similar instances:** none were broken on `main` when the surface was added. [`a-deleted-file-broke-the-records-that-named-it.md`](./a-deleted-file-broke-the-records-that-named-it.md) is the same deletion seen from the dantotsu corpus.

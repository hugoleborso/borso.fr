---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#216'
fix-pr: none (opened by the kaizen pull request for #216 and #231)
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-named-paths-exist.sh]
time-to-detect: days
tags: [gates, pre-commit, ci, harness, pragma]
zone: apps/pragma/scripts/task-metrics/run-task-metrics.sh
recurs: none (the named-paths gate read prose and backticks; this is the first call by path it missed)
---

# The runner called a script main had deleted

## Symptom

`review6`, 2026-10-29 10:07: "The task-metrics harness (run-task-metrics.sh,
--screen-rule included) cannot run since #224 removed scripts/argent.sh and the
argent binary it calls for sign-in taps." Every run failed. Nothing had said so
when `main` was merged into the branch two hours earlier, and the repair took
commit `6dd6eac9` on PR #216, which replaced argent with agent-browser and a CDP
touch adapter.

## Root-cause chain

1. **Why did the runner break silently?** It ran `scripts/argent.sh start` and
   `scripts/argent.sh stop`. PR #224 deleted that file on `main`, and the merge
   brought the deletion into the branch.
2. **Why did no gate fail?** `check-named-paths-exist.sh` exists for this
   question, a path the repository names that it does not have. It read
   `docs/*.md` citations in scripts and backticked paths in instruction files.
   It did not read a script calling another script by path.
3. **Why not that surface?** Its surfaces were the folders where a path had
   rotted before. `apps/*/scripts/` held no shell script then.

**Root cause:** thought the named-paths gate covered every path a script names,
actually it covered only the two kinds that had broken before.

## Detection failure causes

- **Linter / static analysis:** no surface read shell calls.
- **CI (tests / build):** the task-metrics harness runs on demand, never in CI,
  so only a person running it could notice.
- **Code review:** #224 deleted 300 lines of `argent.sh`; its caller lived on an
  unmerged branch.

## Countermeasure

- **Code:** commit `6dd6eac9` on PR #216 replaced the argent calls.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — an existing gate gains a surface)

**Reference:** the kaizen pull request for #216 and #231 · this commit

**The actual fix:** a third surface in `scripts/check-named-paths-exist.sh`. Every
`scripts/…{sh,ts,mjs,js,py}` that a shell script, a hook or a workflow calls
must resolve from the repository root, from the app or plugin holding the
caller, or from the caller's folder. `apps/*/scripts/*` joins the surfaces that
`--staged` searches for a removed name, so the commit or merge that deletes a
called script is the one refused.

```diff
-SURFACES=('scripts/*' '.husky/*' '.github/*' 'plugins/*' 'CLAUDE.md' '.claude/*')
+SURFACES=('scripts/*' '.husky/*' '.github/*' 'plugins/*' 'CLAUDE.md' '.claude/*' 'apps/*/scripts/*')
+# 3. A script that a shell script or a workflow calls by its path.
```

Proved once. On a scratch worktree at `6dd6eac9^`, the tree just before the
repair:

```text
[check-named-paths-exist] apps/pragma/scripts/task-metrics/run-task-metrics.sh:34: calls scripts/argent.sh, which is not there
[check-named-paths-exist] apps/pragma/scripts/task-metrics/run-task-metrics.sh:39: calls scripts/argent.sh, which is not there
exit 1
```

The gate as it was on `main` passed the same tree. In `--staged` mode, staging
the deletion of `scripts/lint-staged-files.sh` was refused with
`.husky/pre-commit:142: calls scripts/lint-staged-files.sh, which is not there`.
The gate checks 167 calls on today's tree, all resolved, in about 0.1 s.

**Sibling defects swept:** none were broken on `main`.

## See also

- [`a-deleted-file-broke-the-records-that-named-it.md`](./a-deleted-file-broke-the-records-that-named-it.md), the same deletion seen from the dantotsu corpus
- [`the-link-checker-skipped-the-folder-it-was-trusted-for.md`](./the-link-checker-skipped-the-folder-it-was-trusted-for.md)

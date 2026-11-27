---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#243'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-shared-checkout-switch.core.ts, scripts/hooks/checks/gh-pr-create.core.ts, scripts/hooks/checks/merge-deploys-prod.core.ts]
time-to-detect: minutes
tags: [hooks, harness, git, agents]
zone: scripts/hooks/checks/merge-deploys-prod.core.ts
recurs: [the-reset-guard-read-the-wrong-checkout]
---

# The pull-request hooks read the checkout

## User impact

On PR #243 two local sessions shared the main folder of the repository. Three
things went wrong within half an hour (measured in the session).

| | Seen | Expected |
| --- | --- | --- |
| Commit | Three commits landed on the other session's branch, and the push sent an empty `fix/pragma-notification-title` | The commits land on `fix/pragma-notification-title` |
| `gh pr create --head fix/pragma-notification-title` | Refused with "this branch commits no archive", though the branch carried the friction-log archive | Accepted |
| `gh pr merge 243` | "Applications this merge deploys: none" | `pragma`, which the merge deployed |

The operator, who reads the merge notice before a production deploy, was told
nothing would deploy. Hosted sessions, one per container, were not affected.

## Causal chain

- The commits landed on another branch.
  - `git commit` wrote to the main folder's HEAD, and the other session had
    run `git switch` to its own branch in that folder.
    - Every local session the operator opens without a worktree works in the
      same folder.
- The two hooks misreported the pull request.
  - Both diffed `origin/main...HEAD` in `$CLAUDE_PROJECT_DIR`, whose HEAD was
    `main`, while the command named the pull request by `--head` or by number.
    The faulty line, in `.claude/hooks/pretool-merge-deploys-prod.sh`:

    ```bash
    # diffs the shared folder's HEAD, not the pull request the command names
    APPS=$(cd "$REPO_ROOT" && "$TSX" "$FANOUT" "origin/$BASE_BRANCH" HEAD 2>/dev/null)
    ```

    - Commit `02c715dc5` (the sweep of PR #199, written in a hosted session)
      wrote this line and the same `origin/main...HEAD` diff in
      `pretool-gh-pr-create.sh`.
      - The hook environment hands each hook `$CLAUDE_PROJECT_DIR` as its one
        directory, and in a hosted container that directory always holds the
        session's own branch (Machine).

## Root cause of occurrence

*Thought the project checkout's HEAD is this session's pull request, actually
on a laptop the main folder is shared by every local session and its HEAD
belongs to whoever switched it last.* (Machine)

The hook environment gives a hook `$CLAUDE_PROJECT_DIR` and nothing that names
the session's branch. In the hosted container where `02c715dc5` was written and
tried, that directory and the session's branch are the same thing, so the
belief held on every run the author saw (inferred from the commit's session
trailer and its hosted-only hooks).

## Detection failure causes

- **Hooks tests:** every case ran with the pull request checked out in the
  project folder, the only setup a hosted session produces. The reset guard
  hit the same blind spot in
  [the-reset-guard-read-the-wrong-checkout](./the-reset-guard-read-the-wrong-checkout.md).
- **Harness:** nothing told a session that another one shared its folder.
  [two-agents-in-one-working-tree](../knowledge/two-agents-in-one-working-tree.md)
  covers concurrent edits, not a moved HEAD.
- **Hook runner:** today `scripts/hooks/hook-runner.adapter.ts:34` runs every
  check's commands with `cwd: PROJECT_DIRECTORY`, and `HookInput.cwd`
  (`check.core.ts:15`) reaches only the checks that read it. A new check that
  types a bare `'HEAD'` reads the shared folder by default.

## Countermeasure

The two hooks read the pull request the command names. The commits were
cherry-picked onto a fresh worktree branch and PR #243 was rebuilt from it.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, `b507ea56d`. The shell hooks were
rewritten as TypeScript checks under `scripts/hooks/checks/` in `458e886c4`,
which kept each behaviour below.

A PreToolUse check refuses a branch switch in a local main checkout. A linked
worktree has its own HEAD and a hosted session owns its container, so both
pass (`no-shared-checkout-switch.core.ts`). `gh-pr-create.core.ts` and
`api-change-needs-validation.core.ts` diff `origin/<--head>` when the command
names one. `merge-deploys-prod.core.ts` diffs a numbered pull request's head
commit, read from the GitHub API, and says "unknown" when it cannot read it.

```diff
-  APPS=$(cd "$REPO_ROOT" && "$TSX" "$FANOUT" "origin/$BASE_BRANCH" HEAD 2>/dev/null) \
+  APPS=$(cd "$REPO_ROOT" && "$TSX" "$FANOUT" "origin/$BASE_BRANCH" "$COMPARED_HEAD" 2>/dev/null) \
```

**Proof it can fail:** proved by hand on the shell hooks with
`KAIZEN_LOG_REFUSALS=0` (measured).

- The switch guard exits 2 for `git switch -c foo origin/main`,
  `git checkout -b foo` and `git checkout main` in the main folder, and for
  `cd <main> && git switch main` or `git -C <main> switch main` from a
  worktree. It exits 0 for `git checkout -- file.ts`, a switch inside a
  worktree, `git worktree add`, a commit message quoting `git switch`, and
  `CLAUDE_CODE_REMOTE=true`.
- With the main folder on `main`, `gh pr merge 238` printed
  `Applications this merge deploys: none` before the fix and
  `pragma — only these applications have changed paths` after it.
- `gh pr create --head main` from a worktree whose own branch carried an
  archive was refused, because `origin/main...origin/main` holds none.

**Similar instances:** `grep -n "HEAD" scripts/hooks/checks/*.core.ts` finds
the class still open. `agent-after-route.core.ts:22` diffs
`origin/main...HEAD` in the project folder. `gh-pr-create.core.ts:95`,
`api-change-needs-validation.core.ts:27` and `merge-deploys-prod.core.ts:56`
each fall back to `HEAD` in their own way. The level holds for the three
checks above, not for the class.

**Proposed:** make `HookWorld` in `scripts/hooks/check.core.ts` resolve the
compared head once, from `--head`, a pull-request number or `input.cwd`, and
hand it to every check. Remove the project-folder `run` from checks that read
git, so no check can type a bare `'HEAD'` and read a checkout the command does
not touch. The same resolver would serve
[the-reset-guard-read-the-wrong-checkout](./the-reset-guard-read-the-wrong-checkout.md).

---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#243'
fix-pr: none (opened by the kaizen pull request for #243)
fix-commits: [self]
eradication-level: 2
eradication-paths: [plugins/borso-harness/hooks/pretool-no-shared-checkout-switch.sh, plugins/borso-harness/hooks/pretool-gh-pr-create.sh, .claude/hooks/pretool-merge-deploys-prod.sh]
time-to-detect: minutes
tags: [hooks, harness, git, agents]
zone: .claude/hooks/pretool-merge-deploys-prod.sh
recurs: [the-reset-guard-read-the-wrong-checkout]
---

# The pull-request hooks read the checkout

## Symptom

On PR #243 two local sessions shared the main folder of the repository. Three
things went wrong within half an hour, and the same belief sat under each one.

- The other session ran `git switch` to its own branch in the main folder.
  This session's next three commits landed on that branch, not on
  `fix/pragma-notification-title`, and its push sent an empty branch.
- `gh pr create --head fix/pragma-notification-title`, run from a worktree
  whose branch carried the friction-log archive, was refused with "this branch
  commits no archive". The hook had diffed the main folder's HEAD, which was
  `main`.
- `gh pr merge 243` printed "Applications this merge deploys: none" for a
  merge that deployed pragma. The hook had diffed the main folder's HEAD
  again.

## Root-cause chain

1. **Why did the commits land on another branch?** `git commit` writes to
   whatever HEAD the folder has, and another session had moved it.
2. **Why could another session move it?** Every local session the operator
   opens without a worktree works in the same folder, and nothing refused a
   branch switch there.
3. **Why did the two hooks misreport?** Both computed "this pull request's
   diff" as `origin/main...HEAD` in `$CLAUDE_PROJECT_DIR`. The command named
   the pull request, by `--head` or by number, and the hooks ignored it.
4. **Why did they assume HEAD was the pull request?** They were written for
   hosted sessions, where one container holds one session on one branch.

**Root cause:** the hooks thought the project checkout's HEAD is this
session's branch, but on a laptop the main folder is shared by every local
session and its HEAD belongs to whoever switched it last.

## Detection failure causes

- **Hooks:** nothing tested a pull request whose branch is not checked out in
  the project folder. The reset guard hit the same blind spot in
  [the-reset-guard-read-the-wrong-checkout](./the-reset-guard-read-the-wrong-checkout.md).
- **Harness:** nothing told a session that another one shared its folder.
  [two-agents-in-one-working-tree](../knowledge/two-agents-in-one-working-tree.md)
  covers concurrent edits, not a moved HEAD.

## Countermeasure

The two hooks read the pull request the command names. The commits were
cherry-picked onto a fresh worktree branch and PR #243 was rebuilt from it.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** kaizen pull request for #243 · commit [self]

**The actual fix:**

A new PreToolUse hook refuses a branch switch in a local main checkout. A
linked worktree has its own HEAD and a hosted session owns its container, so
both pass.

```diff
+OWN_GIT_DIR="$(git -C "$TARGET" rev-parse --path-format=absolute --git-dir 2>/dev/null || true)"
+SHARED_GIT_DIR="$(git -C "$TARGET" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
+if [[ -z "$OWN_GIT_DIR" || "$OWN_GIT_DIR" != "$SHARED_GIT_DIR" ]]; then exit 0; fi
+echo "[no-shared-checkout-switch] $TARGET is the main checkout, and other local sessions work in it too." >&2
```

`pretool-gh-pr-create.sh` diffs `origin/<--head>` when the command names one:

```diff
+  PULL_REQUEST_HEAD="$(sed -nE 's/.*--head[ =]([^ ]+).*/\1/p' <<<"$COMMAND_TO_RUN")"
+  COMPARED_HEAD="${PULL_REQUEST_HEAD:+origin/$PULL_REQUEST_HEAD}"
-  ARCHIVED_HERE="$(git -C "$REPO_ROOT" diff --name-only origin/main...HEAD 2>/dev/null \
+  ARCHIVED_HERE="$(git -C "$REPO_ROOT" diff --name-only "origin/main...${COMPARED_HEAD:-HEAD}" 2>/dev/null \
```

`pretool-merge-deploys-prod.sh` diffs a numbered pull request's head commit,
read with `gh pr view --json headRefOid`, and says "unknown" when it cannot
read it:

```diff
+  PULL_REQUEST_HEAD=$(cd "$REPO_ROOT" && gh pr view "$PR" --json headRefOid --jq .headRefOid 2>/dev/null || true)
-  APPS=$(cd "$REPO_ROOT" && "$TSX" "$FANOUT" "origin/$BASE_BRANCH" HEAD 2>/dev/null) \
+  APPS=$(cd "$REPO_ROOT" && "$TSX" "$FANOUT" "origin/$BASE_BRANCH" "$COMPARED_HEAD" 2>/dev/null) \
```

Proved by hand with `KAIZEN_LOG_REFUSALS=0` (measured).

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

**Sibling defects swept:** `pretool-no-discarding-reset.sh` already reads the
command's own directory since
[the-reset-guard-read-the-wrong-checkout](./the-reset-guard-read-the-wrong-checkout.md).
`rtk-rewrite.sh` reads the hook's `cwd`. No other hook reads
`$CLAUDE_PROJECT_DIR`'s HEAD.

## See also

- [two-sessions-one-branch](./two-sessions-one-branch.md): two sessions on
  one remote branch, the same race one level up.
- [two-agents-in-one-working-tree](../knowledge/two-agents-in-one-working-tree.md)

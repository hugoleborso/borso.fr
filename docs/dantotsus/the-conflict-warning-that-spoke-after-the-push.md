---
date: 2026-11-03
introduced-at: conception
detected-at: local
severity: low
related-pr: '#252'
fix-pr: '#255'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.husky/pre-push]
time-to-detect: minutes
tags: [ci, git, github-actions, hooks, gates]
zone: .husky/pre-push
weak-point: none
recurs: [the-entry-existed-and-i-lost-the-hour-anyway]
---

# The hook knew the branch conflicted, and let the push through anyway

## User impact

PR #252 waited for CI that GitHub would never start. Main moved under it with
PR #251, which also changed `SetlistOrderList.tsx` and its test. A conflicted
pull request gets no workflow run at all, so the pull request sat with no
checks until the session merged `origin/main` in and pushed a second time.

| | Seen | Expected |
| --- | --- | --- |
| The push of `77fa071` | every gate ran, the push landed, then a warning said the branch conflicts | the push refused before any gate, with the merge command |
| CI on PR #252 | none until merge commit `8cc28ea` | a run on the first push of a mergeable branch |

Measured from the merged session's log and PR #252's commit list.

## Causal chain

- PR #252 had no checks after a push.
  - The branch conflicted with `origin/main` on `SetlistOrderList.tsx`.
    - `.husky/pre-push` detected the conflict, but only printed it, and only at
      the end, after the gates had run and with exit status 0.
      - PR #71 shipped the check as a warning, the lowest rung that would
        surface `a-conflicted-pull-request-gets-no-checks.md` at push time.

## Root cause of occurrence

*Thought a warning at push time is enough to make the session merge main,
actually a warning printed after a successful push reads as a footnote to a
success.*

`docs/dantotsus/the-entry-existed-and-i-lost-the-hour-anyway.md` chose
"DevX check (level 2, pre-push warning)". The hook placed it after
`wait_for_gates`, inside the `claude/*` reminder block, so it ran last and could
not change the exit status.

## Detection failure causes

- **Pre-push:** the check had the right answer and no power to act on it.
- **Kaizen sweeps:** nothing counted how many pushes landed on a conflicted
  branch after the warning. PR #252 is the first one logged.

## Countermeasure

The conflict check moves to just after the hook fetches `origin/main`, before
the range, the install and the gates, and exits 1. A push of a conflicted
branch now costs one `git fetch` and one `git merge-tree` instead of the full
gate run, and it does not land.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [self] in [PR #255](https://github.com/hugoleborso/borso.fr/pull/255)

```diff
 git fetch --quiet origin main 2>/dev/null || true
+if git rev-parse --verify --quiet origin/main >/dev/null; then
+  merge_base=$(git merge-base HEAD origin/main 2>/dev/null || true)
+  if [ -n "$merge_base" ] &&
+    git merge-tree "$merge_base" HEAD origin/main 2>/dev/null | grep -q '^+<<<<<<<'; then
+    echo "[pre-push] this branch conflicts with origin/main, so GitHub would run no CI on it." >&2
+    ...
+    exit 1
+  fi
+fi
```

The old warning block at the end of the hook is removed.

**Proof it can fail:** a scratch worktree at `origin/main^` with
`block() {` renamed in `pretool-no-swallowed-push.sh`, a line main's last
commit rewrote. Fed to the new hook, it printed the following and exited 1
before any gate started.

```text
[pre-push] this branch conflicts with origin/main, so GitHub would run no CI on it.
  Merge main in, resolve, then push again:
    git merge origin/main
```

The first attempt planted a line that main did not touch, and the hook passed
it, which is the correct answer for a clean merge.

**Similar instances:** `grep -n 'printf .*WARN\|⚠️' .husky/pre-push` finds the
review-thread reminder and the actionlint skip. Neither knows of a failure it
could refuse on. The reminder is advice, and the actionlint skip already
refuses when a workflow changed.

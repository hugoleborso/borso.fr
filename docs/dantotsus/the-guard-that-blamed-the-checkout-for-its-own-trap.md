---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#216'
fix-pr: none (opened by the kaizen pull request for #216 and #231)
fix-commits: [self]
eradication-level: 1
eradication-paths: [plugins/borso-harness/hooks/pretool-no-discarding-reset.sh]
time-to-detect: days
tags: [hooks, harness, git, agents]
zone: plugins/borso-harness/hooks/pretool-no-discarding-reset.sh
recurs: none (the hook refused for the reason it exists; only its message was wrong)
---

# The guard that blamed the checkout for its own trap

## Symptom

Three agents on PR #216 logged the same wall, and the hook logged itself five
times as "ran a discarding git command on a checkout the hook could not read":

- `fix-all`: "pretool-no-discarding-reset fails on a plain literal git -C
  <repo> checkout -- <files>, saying it cannot read the checkout, so restoring
  files needed a stash".
- `harness-repair`: "fails on a plain 'git checkout -- <tracked file>' in the
  main checkout, even with git -C and a literal path, so restoring one file
  needs git show HEAD:path redirected".

This sweep hit it too, on `git checkout -- README.md` in a dirty tree.

## Root-cause chain

1. **Why "cannot read the checkout" for a literal path?** The message came from
   the hook's `ERR` trap, not from the path check.
2. **Why did the trap fire?** The hook asks `git diff --quiet`, which exits 1
   when the tree has changes. It wrapped the call in `set +e`, but an `ERR`
   trap fires on any failing simple command whatever `set -e` says.
3. **So what did it do?** On a clean tree the hook let the command through. On
   a dirty one, the only state where it has something to say, it printed the
   wrong refusal. The real one, which lists the files at stake and offers a
   commit or a stash, never showed.
4. **Why did agents keep retrying?** The wrong message told them to name the
   checkout with a literal path, which they already had.

**Root cause:** thought `set +e` keeps a failing command from the `ERR` trap,
actually only an `||` or an `if` does.

## Detection failure causes

- **Functional validation locally:** the proof runs on the hook's own PR fed it
  a dirty tree and read only the exit code, 2, which is right in both branches.
- **Code review:** `set +e … set -e` reads as the standard way to read an exit
  status.

## Countermeasure

- **Code:** this commit.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — the exit status no longer reaches the trap)

**Reference:** the kaizen pull request for #216 and #231 · this commit

**The actual fix:**

```diff
-  set +e
-  git -C "$TARGET_DIRECTORY" diff --quiet 2>/dev/null
-  DIFF_STATUS=$?
-  set -e
+  DIFF_STATUS=0
+  git -C "$TARGET_DIRECTORY" diff --quiet 2>/dev/null || DIFF_STATUS=$?
```

Proved once, with `KAIZEN_LOG_REFUSALS=0` and one modified file. Before:

```text
[no-discarding-reset] cannot tell whether this discards uncommitted work: the hook itself failed while reading the checkout.
```

After:

```text
[no-discarding-reset] `git checkout -- README.md` discards tracked changes that are not committed in .:
[no-discarding-reset]     README.md
```

A clean tree still passes. The advice it prints now reads `git add <those
paths>` instead of `git add -A`, which CLAUDE.md forbids while agents run.

**Sibling defects swept:** no other hook or script combines an `ERR` trap with
`set +e`.

## See also

- [`a-warning-that-had-to-become-a-gate.md`](./a-warning-that-had-to-become-a-gate.md)
- [`../knowledge/destructive-git-with-uncommitted-verification-work.md`](../knowledge/destructive-git-with-uncommitted-verification-work.md)

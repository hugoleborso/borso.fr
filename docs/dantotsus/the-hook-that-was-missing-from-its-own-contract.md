---
date: 2026-10-02
introduced-at: implementation
detected-at: local
severity: low
related-pr: "#107"
fix-pr: "#119"
fix-commits: [9703c82, 1b060da]
eradication-level: 2
time-to-detect: weeks
tags: [hooks, harness, gates, pre-commit]
---

# The hook that was missing from its own contract

## Symptom

During the PR #107 kaizen session, `pretool-no-swallowed-push.sh` refused
the same harmless shape three times:

```sh
git commit -q -F msg.txt > commit.log 2>&1; grep -B3 "failed" commit.log | head
```

The commit's status was intact, redirected to a file. The pipe belonged to
the `grep` after the `;`. Each refusal cost a rewritten command, and one of
the rewrites led to a commit that swept in files staged by an earlier
refused attempt.

## Root-cause chain

1. **Why was it refused?** The hook matched
   `git commit([[:space:]][^|]*)?\|`, and `[^|]*` crosses `;` and `&&`, so
   any pipe later on the line counted as the commit's.
2. **Why was an over-broad match never caught?** `check-hook-decisions.sh`
   holds every hook to two halves: a command it must refuse and a mention
   it must let through. This hook had no row in that table at all.
3. **Why no row?** The table was written for the two hooks whose bugs
   prompted it, and nothing required the others to join. Two more
   refusing hooks, `gh-pr-create` and `no-discarding-reset`, had no row
   either.

**Root cause:** thought the contract table covered the hooks, actually it
covered the hooks someone had remembered to add.

## Detection failure causes

- **Pre-commit:** the contract check ran green, because it checked only
  the rows it had.
- **Local:** each refusal looked like the agent's own mistake, which is the
  usual reason to rewrite a command rather than question the hook.

## Countermeasure

- **Code:** commit `9703c82` splits the command on `;` and `&&` before
  matching, so only a pipe in the git command's own pipeline counts. `||`
  still counts, because the status of `a || b` is b's when a fails.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — DevX check)

**Reference:** commits `9703c82`, `1b060da`

**The actual fix:** `check-hook-decisions.sh` now walks
`.claude/hooks/pretool-*.sh` and fails on any hook that can exit 2 without
an allow row, and without a block row unless declared state-dependent with
its reason:

```diff
+for hook_path in "$HOOK_DIR"/pretool-*.sh; do
+  grep -q 'exit 2' "$hook_path" || continue
+  if ! grep -q "^run_case $hook_name allow " "$0"; then
```

Rows now exist for all three missing hooks. Run against the previous
`no-swallowed-push`, the table fails on exactly the two shapes it wrongly
refused; with `gh-pr-create`'s rows removed, the completeness rule fails on
both halves. A new refusing hook cannot ship without its contract.

**Sibling defects swept:** `pretool-gh-pr-create.sh` and
`pretool-no-discarding-reset.sh`, the latter declared state-dependent
because it refuses only on a dirty tree, which the table cannot set up.

## See also

- [`the-hook-that-refused-the-page-explaining-it.md`](./the-hook-that-refused-the-page-explaining-it.md)
- [`a-push-that-failed-and-reported-success.md`](./a-push-that-failed-and-reported-success.md)

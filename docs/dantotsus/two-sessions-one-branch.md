---
date: 2026-10-15
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#118'
fix-pr: none (shipped by the kaizen pull request that adds this entry)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.husky/pre-push]
time-to-detect: minutes
tags: [git, gates, agents, pre-push]
zone: .husky/pre-push
recurs: [a-force-push-re-gated-everything-main-had-merged]
---

# Two sessions, one branch

## Symptom

Two Claude sessions drove PR #118 at once: the one that wrote it, and one the
operator started later to finish the merge work. Twice on 2026-10-12, both
merged main into the branch within minutes of each other. Each time the second
push ran the full pre-push wave, more than ten minutes of tests and mutation,
and then git rejected it as non-fast-forward. Each time the session that lost
had to throw away its merge, take the other one, and reapply its own commit by
hand.

## Root-cause chain

1. **Why did the push run its gates at all?** Git calls pre-push before it
   checks for a fast-forward, and the hook does not know a rejection is coming.
2. **Why did the hook not notice?** It reads the remote's current commit from
   stdin. When that commit was missing from the local object store, the hook
   fell into its last branch, labelled "no remote ref for this branch yet",
   and gated the whole branch since main.
3. **Why was the commit missing?** Another session had pushed it. A commit on
   the remote branch that this checkout never fetched can only come from
   another writer.

**Root cause:** the hook treated "remote commit unknown here" as "branch not
on the remote yet", but on a branch that exists upstream it means someone else
pushed, and both possible outcomes are bad: a plain push is rejected after the
gates, and a force push discards their work.

## Detection failure causes

- **Hook:** the unknown-commit case had a label but no test, and the label
  described a different situation (a new branch arrives with all zeros, which
  the loop already handles).
- **Harness:** nothing tells a session that another session holds the same
  branch.

## Countermeasure

Pre-push stops before any gate when the remote branch sits on a commit this
checkout has never fetched, and prints the two commands that bring the other
session's work in.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** the kaizen pull request for PR #118 · commit [self]

**The actual fix:**

```diff
+if [ -n "$push_base" ] && ! git cat-file -e "$push_base^{commit}" 2>/dev/null; then
+  echo "[pre-push] origin/$pushed_ref is at $push_base, a commit this checkout has never fetched:" >&2
+  echo "  another session pushed to this branch. Bring its work in, then push again:" >&2
+  echo "    git fetch origin $pushed_ref && git merge origin/$pushed_ref" >&2
+  exit 1
+fi
```

Exercised by hand both ways: an unknown remote commit exits 1 in under a
second, and a known one goes on to the gates. A force push after
`git checkout -B <branch> origin/main` is unaffected, because its remote
commit is one this checkout has fetched.

**Sibling defects swept:** none. Pre-commit has no remote to compare against.

## See also

- [a-force-push-re-gated-everything-main-had-merged](./a-force-push-re-gated-everything-main-had-merged.md):
  the branch of this hook that handles a deliberate rewrite.
- [two-agents-in-one-working-tree](../knowledge/two-agents-in-one-working-tree.md):
  the same race inside one checkout.

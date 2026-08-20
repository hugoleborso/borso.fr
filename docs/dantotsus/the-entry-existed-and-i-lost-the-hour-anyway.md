---
date: 2026-08-20
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#63'
fix-pr: '#63'
fix-commits: [9b2ff2b]
eradication-level: 2
time-to-detect: 1 hour
tags: [ci, github-actions, git, knowledge-corpus, tooling]
---

# The entry existed, and I lost the hour anyway

## Symptom

A push to PR #63 produced no workflow runs. Not failed ones — none. The preview
stayed on a commit from before the feature had been rewritten, and the operator
noticed before any gate did: *"Preview was not redeployed"*.

An hour went into it. Theories tested and discarded in order: the draft state
(no workflow filters on it, and `ready_for_review` is not even a trigger);
Actions being disabled or out of quota (other pull requests ran fine in the same
minutes); the identity of the pusher not being allowed to trigger workflows
(closing and reopening through the API, as the repository owner, also produced
nothing). The answer was `mergeable_state: "dirty"` — the branch conflicted with
`main`, GitHub could not build `refs/pull/<n>/merge`, and so dispatched nothing.

**All of which was already written down.** `docs/knowledge/a-conflicted-pull-request-gets-no-checks.md`
had been committed two days earlier, from PR #62, and describes the symptom, the
field to read, the local `git merge-tree` equivalent, a reading order for
exactly this triage, and — in as many words — that closing and reopening changes
nothing because the conflict is still there.

## Root-cause chain

1. **Why was the hour lost?**
   The triage was re-derived from scratch instead of read.

2. **Why was it re-derived?**
   The entry was never opened. It was not found, not recalled, not suggested.

3. **Why was it not found?**
   Nothing searched for it. The failure presented as *"my push did nothing"*,
   and the corpus was not consulted, because at no point did the problem
   announce itself as one somebody might already have hit.

4. **Why did the problem not announce itself?**
   Because its signature is an absence. A red check invites a search; an empty
   checks list invites a refresh. There is no error string to grep the corpus
   for, no stack trace, no failing job name — the one useful token,
   `mergeable_state`, is the answer rather than the question.

5. **Why did no mechanism surface it?**
   Because the corpus is pull-only. Ninety-eight dantotsus and seventy-five
   knowledge entries sit in `docs/`, indexed and cross-linked, and every one of
   them waits to be looked up. Nothing pushes an entry in front of the person
   about to need it.

**Root cause:** thought *writing the entry is what stops the next person losing
the hour*, actually *an entry only helps somebody who thinks to look for it, and
a failure whose signature is silence gives nobody a reason to look*. Capture is
not eradication. The knowledge ladder puts knowledge at level 5 for exactly this
reason, and PR #62 stopping there is why PR #63 paid again.

## Detection failure causes

- **Typing / linter / CI:** all inapplicable — the branch was locally perfect.
  Every gate passed, which is part of what made the silence so confusing.
- **Functional validation locally:** nothing local can observe a ref GitHub
  computes. `git status` was clean, the branch was level with its own remote,
  and every test passed.
- **Code review:** the conflict is invisible in a diff.
- **The corpus itself:** the layer that should have caught this, and the only
  one that ever could have. It held the answer and had no way to offer it.

## Countermeasure

- **Code:** commit `9b2ff2b` — `main` merged into the branch, resolving a
  rename/rename collision across three files and a directory move of every
  source file into `site/src/`. Dispatch resumed on the next push.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-push warning)

**Reference:** [PR #63](https://github.com/hugoleborso/borso.fr/pull/63) ·
kaizen PR for this entry

**The actual fix:**

```diff
+    if git rev-parse --verify --quiet origin/main >/dev/null; then
+      merge_base=$(git merge-base HEAD origin/main 2>/dev/null || true)
+      if [ -n "$merge_base" ] &&
+        git merge-tree "$merge_base" HEAD origin/main 2>/dev/null | grep -q '^+<<<<<<<'; then
+        printf '⚠️  [pre-push] this branch CONFLICTS with origin/main.\n' >&2
+        printf '   GitHub builds no merge ref for a conflicted pull request, so it\n' >&2
+        printf '   will create no workflow run at all — no CI, no preview, no red\n' >&2
+        printf '   check to tell you why. Merge origin/main in and push again.\n' >&2
+        printf '   See docs/knowledge/a-conflicted-pull-request-gets-no-checks.md\n\n' >&2
+      fi
+    fi
```

Added to `.husky/pre-push`, inside the `claude/*` arm that already warns about
unresolved review threads. It is the knowledge entry's own local check, run
automatically at the one moment it matters — the push that is about to vanish —
and it names the entry, so the reader who wants the reasoning has it.

It warns rather than blocks: a conflicted branch is legitimate to push, and a
diagnostic that refuses the push would be worse than the silence it explains.
It is also best-effort about `origin/main` being absent, so a shallow clone or a
fresh worktree skips it rather than failing.

**One trap, caught before shipping and worth recording**, because it is the same
class of defect as the rest of this pull request: the first version matched
`'^<<<<<<<'`, and `git merge-tree` prints its conflict hunks *as a diff*, so
every marker carries a `+` prefix and the anchored pattern matched nothing. The
gate would have installed cleanly, passed every commit, and never once fired —
reading as a green check forever. Verified against real `merge-tree` output on a
constructed conflict before landing: `^+<<<<<<<` matches once, and this branch
against `main` matches zero times.

**Sibling defects swept:** the same pull request shipped
`scripts/check-tailwind-arbitrary-variants.sh`, which was likewise proven by
re-introducing the regression and watching it fail, rather than by assuming the
pattern was right. Both are gates written from an assumption about output that
was checked before it was trusted.

## See also

- [`../knowledge/a-conflicted-pull-request-gets-no-checks.md`](../knowledge/a-conflicted-pull-request-gets-no-checks.md)
  — the entry that already existed, now cited by the hook that fires in its
  place.
- [`a-tailwind-variant-that-compiled-to-nothing.md`](./a-tailwind-variant-that-compiled-to-nothing.md)
  — the other thing in this pull request that compiled to nothing and said so
  to nobody.
- [`prose-the-seal-never-asked-anyone-to-read.md`](./prose-the-seal-never-asked-anyone-to-read.md)
  — the same shape in the review loop: a reviewer was named for a file nothing
  ever handed them.

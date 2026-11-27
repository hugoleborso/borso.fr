---
date: 2026-08-18
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#24'
fix-commits: [866e0cbb11]
eradication-level: 5
eradication-paths: [scripts/check-branch-context.sh]
time-to-detect: 3 months
tags: [harness, gates, meta, git, self-improvement-loop]
zone: scripts/check-branch-context.sh
recurs: [designated-branch-was-a-merged-pr-head]
---

# A warning that fired on every first commit

## User impact

The session that fixed PR #60 opened on a branch created seconds earlier,
carrying no commits at all. SessionStart printed:

```
⚠️  [branch-context] "claude/setlist-creation-bug-025jld" is fully merged into origin/main.
   Every commit on this branch already shipped, which usually
   means the orchestrator routed you to a branch whose PR is
   already closed. Confirm with the user that this is the
   intended work surface BEFORE committing …
```

| | Seen | Expected |
| --- | --- | --- |
| Session start on a new `claude/*` branch | A warning to stop and confirm with the user | Silence, because there is no work to orphan yet |

Every agent session that started on a fresh `claude/*` branch saw it, from
2026-05-21 to 2026-08-18 (inferred from the commit dates). Sessions on `main`
or on a branch with unmerged commits did not. A warning that fires on every
task teaches the reader to skip it, including on the session where it is
right.

## Causal chain

- SessionStart printed "fully merged" on a branch with no commits.
  - `git rev-list --count origin/main..HEAD` returned zero on that branch,
    which was created from `main` seconds earlier. The same command returns
    zero on a head whose every commit merged.
    - `scripts/check-branch-context.sh` warned on that count alone:

      ```bash
      unmerged_count=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
      # ❌ zero for a merged head and for a fresh branch alike
      if [[ "$unmerged_count" -eq 0 ]]; then
        printf '\n⚠️  [branch-context] "%s" is fully merged into origin/main.\n' "$current_branch"
      ```

      - Commit `9199b11e7` (2026-05-21, the kaizen of PR #24) wrote it, for
        the incident in
        [`designated-branch-was-a-merged-pr-head`](./designated-branch-was-a-merged-pr-head.md).
        The same commit wrote a header that says *"a freshly-branched-from-main
        branch with no new commits … [is] NOT flagged"*. The agent named the
        case and ran the script only on the merged head (Man).

## Root cause of occurrence

*The agent thought no commit ahead of `main` means the work already shipped,
actually it means that or that no work exists yet, and the two are told apart
by where the tip sits, not by the count.* (Man)

The fresh-branch case was in the agent's context: it wrote it into the header
of the same file. So no document was missing. The prior that a zero count
means "merged" won, and the only run was on the case the check was written for.
A merged head is an ancestor of `origin/main`, behind the merge commit. A fresh
branch is `origin/main` itself (`git rev-parse HEAD` equals
`git rev-parse origin/main`).

## Detection failure causes

- **Typing and linter:** shell, and nothing checks a script against its own
  header.
- **Local validation:** the script was run on the merged head, which it
  handles. The fresh-branch case was written as excluded and never run.
- **CI:** a SessionStart script does not run in CI, and the script has no test
  file (`ls scripts/check-branch-context.test.ts` finds none today).
- **Code review:** the header asserts the exclusion. A reviewer reading header
  then code sees an intent and an implementation that look alike.
- **Monitoring:** a false positive fails by being ignored, which stays
  invisible until the true positive arrives.

## Countermeasure

Commit [`866e0cb`](https://github.com/hugoleborso/borso.fr/commit/866e0cb)
([PR #62](https://github.com/hugoleborso/borso.fr/pull/62)) compares the tip
before the count:

```diff
+# A branch sitting exactly on origin/main is a fresh start, not a
+# shipped one: there is no work to be orphaned yet.
+if [[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]]; then
+  exit 0
+fi
+
 if [[ "$unmerged_count" -eq 0 ]]; then
```

Verified both ways at the time: silent on a branch just created from `main`,
and still warning on `claude/setlist-creation-bug-025jld` once PR #60 had
shipped it. The header now explains the discriminator instead of asserting an
exclusion.

## Eradication

**Type:** knowledge (level 5). Nothing structural holds.

**Reference:** none. The countermeasure, commit `866e0cb`, fixes this
instance. Nothing refuses a change that brings the false positive back.

The root cause is Man: the fresh-branch case was in the agent's context, in
the header it wrote. Under the agentic 4M rule a document cannot eradicate
that cause, because the document was already there. So the knowledge entry
[`the-shell-gates-are-only-ever-run-where-they-pass`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md),
whose `triggers:` match `scripts/check-*.sh`, is not this entry's eradication.
It only reaches the next agent that edits the script.

**Proposed:** add `scripts/check-branch-context.test.ts`, a vitest suite on
the model of `scripts/check-vocabulary-paths.test.ts`, which exists. It builds
a scratch repository with a remote `main`, then asserts silence on a fresh
`claude/*` branch and the warning on a merged head. CI then runs both cases on
every change, so a script that warns on a fresh branch, or stops warning on a
merged one, cannot merge. That is a gate that holds when the prior wins
(level 4), and it is the eradication this entry waits for.

**Proof it can fail:** none yet. The proposed suite would carry it.

**Similar instances:** `git grep -n "rev-list --count" -- scripts .husky`
finds only this script, so no other gate branches on a commit count.

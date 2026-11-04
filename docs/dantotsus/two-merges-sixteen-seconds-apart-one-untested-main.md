---
date: 2026-11-04
introduced-at: code-review
detected-at: operator-deploy
severity: low
related-pr: '#257'
fix-pr: none (opened by the kaizen pull request for #257)
fix-commits: [self]
eradication-level: 4
eradication-paths: [.claude/hooks/pretool-merge-deploys-prod.sh]
time-to-detect: minutes
tags: [ci, github-actions, deploy, agents, hooks]
zone: .claude/hooks/pretool-merge-deploys-prod.sh
recurs: [green-said-of-a-run-still-going]
---

# Two merges sixteen seconds apart, one untested main

## User impact

PR #257 went to production as a combination no CI run had tested. Main's own
`ci` run on `20eaa66` later passed (run 41748626420, measured), so nothing
broke. The operator noticed that the merge read `mergeable_state: unknown`.

| | Seen | Expected |
| --- | --- | --- |
| Merge of #257 at 00:40:48 | merged with the CI of 00:32, run against main `c73518aa` | told that #249 had merged at 00:40:32, after that CI started |
| Main's `ci` on `e523fbe2` (#249) | cancelled by #257's push (run 41748592331) | a verdict on #249 alone |

## Causal chain

- Main `20eaa66` deployed without a pre-merge test of #249 and #257 together.
  - The #257 session merged 16 seconds after another session merged #249.
    - Its last `pull_request_read get` at 00:40:39 returned `mergeable_state:
      unknown`, because GitHub was recomputing after the base moved.
      - Nothing the session read named #249, and the merge hook said
        nothing about the base.
        - Both PRs edited `docs/knowledge/README.md` and
          `docs/quality/feature-cost.md`, and git merged them textually.

## Root cause of occurrence

*Thought green checks on the head mean the merged main is tested, actually a
`pull_request` run tests the branch merged with main as main was when the run
started.*

Two kaizen sessions ran in parallel, as CLAUDE.md intends. The repository has
no merge queue and no "branch must be up to date" rule, and the sweep of PR
#253 left that setting to the operator (inventory row 08 of
`lessons-from-pr-253`).

## Detection failure causes

- **Merge hook:** it named the deploy fan-out and not the base. It did not
  even fetch `origin/main`.
- **Session:** `mergeable_state: unknown` reads as "not dirty". The knowledge
  corpus explains `dirty` and says nothing about `unknown`.
- **Repeat:** #253 merged while its CI still ran (row 08 of the #253 sweep).
  That was the first untested main in two merges.

## Countermeasure

The merge hook now fetches main, reads when the head's Actions checks started,
and lists every first-parent main commit since then that the head does not
contain, with the files both sides changed. It tells the session to tell the
operator, and how to test first. It still never blocks: the operator's
instruction is the gate, as the hook's contract says.

Replay on PR #257, measured in this session:

```
[merge-on-moved-base] main moved after this pull request's CI started (2026-11-04T00:32:19Z).
These merged since, and no run tested them beside this branch:
    e523fbe2 docs: lessons from PRs #246 and #247 (#249)
Files both sides changed:
    docs/knowledge/README.md
    docs/quality/feature-cost.md
```

The old hook printed nothing on the base. The replay skips the PR's own
squash commit, which a replay after the merge would otherwise list.

A level 1 fix exists: require branches to be up to date, or a merge queue.
That is a repository setting and a trade (every parallel merge then re-runs
CI), so it stays the operator's call.

## Eradication

**Type:** detection (level 4)

**Reference:** commit `[self]` on the kaizen branch for PR #257

```diff
+    UNSEEN=$(cd "$REPO_ROOT" && git log --first-parent --since="$CI_STARTED" --format=%H "origin/$BASE_BRANCH" 2>/dev/null \
+      | while read -r COMMIT; do
+        git merge-base --is-ancestor "$COMMIT" "$COMPARED_HEAD" 2>/dev/null && continue
+        git log -1 --format=%s "$COMMIT" | grep -qF "(#$PR)" || printf '%s\n' "$COMMIT"
+      done)
```

See also [`the-merge-hook-asked-the-one-api-the-proxy-refuses`](./the-merge-hook-asked-the-one-api-the-proxy-refuses.md):
the same hook could not read the head in a hosted session, so this check
needed that fix first.

---
date: 2026-05-21
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#24'
fix-commits: [9199b11e70]
eradication-level: 5
eradication-paths: [scripts/check-branch-context.sh]
time-to-detect: hours
tags: [harness, orchestrator, conception, hooks]
zone: .claude/skills/tech-lead-orchestrator
---

# Orchestrator routed me to a branch that was already merged

## User impact

The operator's kaizen follow-up to PR #23 never reached its pull request.
The agent pushed two commits to PR #23's own head, merged on 2026-05-15.
Meanwhile PR #24, the open kaizen pull request where the work belonged,
gathered merge conflicts against `main`.

| | Seen | Expected |
| --- | --- | --- |
| Two commits (SPA fallback for `StaticSite`) | pushed to `claude/fix-dnf-validation-NIGKH`, a merged head with no open pull request | pushed to `claude/lessons-from-pr-23`, PR #24 |

The operator caught it two turns later: *« Non mais tu devrais dev dans
lessons-from-pr-23 »* (no, you should work in lessons-from-pr-23).

## Causal chain

- The commits landed on a branch whose pull request was already merged.
  - The agent checked out `claude/fix-dnf-validation-NIGKH`, committed and pushed.
    - The session's system prompt designated that branch: *"Develop on branch `claude/fix-dnf-validation-NIGKH`"*, with *"NEVER push to a different branch without explicit permission"*.
      - The branch was PR #23's head. The session was a kaizen follow-up to PR #23, whose open pull request was #24 on `claude/lessons-from-pr-23`.
  - PR #25 had landed on `main` in the interim, so PR #24 now conflicted with it in `auth.controller.ts`.

## Root cause of occurrence

*Thought the branch the system prompt designates is a live work surface,
actually it can be the head of a pull request that already merged, and
nothing in the prompt says which.*

Tag: **Material** (agentic rule). Seen from the agent's workstation, the
system prompt is the input it was handed. The fact that the branch was
already merged was in no document or tool output in its context when it
committed.

## Detection failure causes

- **`pre-push`:** it checks code, not whether the branch's pull request is still open, so the push to a merged head passed.
- **CI:** it ran on the push and passed. CI judges commits, not the state of the pull request.
- **Operator review:** with no open pull request on that branch, there was nothing to review until the operator asked.

## Countermeasure

The two commits were cherry-picked onto `claude/lessons-from-pr-23`,
rebased onto `origin/main` to clear the PR #25 conflict, and force-pushed
with `--force-with-lease`. They merged with PR #24.

## Eradication

**Type:** knowledge (level 5).

**Reference:** commit [`9199b11e70`](https://github.com/hugoleborso/borso.fr/commit/9199b11e70)
added `scripts/check-branch-context.sh`. `scripts/install-repo-deps.sh:227`
runs it at session start. It has since changed: it now warns when a
`claude/*` branch has no commit outside `origin/main` and its tip is not
`origin/main` itself.

What holds today does not hold the class. The check asks the commit
graph, and a squash-merged head is never an ancestor of `main`. `main`
has had no merge commit since PR #141 on 2026-10-06, and 235 squash
subjects ending in `(#<n>)` have landed since June (measured, `git log
origin/main --merges -1` and `git log origin/main --no-merges
--since=2026-06-01 --format=%s | grep -cE '\(#[0-9]+\)$'`). The check
cannot fire on the case it exists for, and it only warns. So the level is
the floor, not the level 2 the original entry claimed.

**Proof it can fail:** none on today's merge method, as shown above.

**Proposed:** ask GitHub instead of the commit graph. A `PreToolUse`
check under `scripts/hooks/checks/`, on `git push` and `git commit` in
`Bash`, would call `gh api -X GET search/issues` with `repo:<owner>/<repo>
is:pr is:merged head:<branch>` and refuse when it finds one.
`one-pull-request-per-session.core.ts` already calls `gh api` from a hook,
so the pattern exists. No commit could then land on a merged head, whatever
the merge method and whatever the prompt designates.
`scripts/check-branch-context.sh` could then be deleted.

**Similar instances:**
[`orchestrator-shipped-with-stale-pr-description`](./orchestrator-shipped-with-stale-pr-description.md)
is the same shape: state handed to the agent that it did not verify.
[`pushed-without-reading-pr-review-comments`](./pushed-without-reading-pr-review-comments.md)
is the next anchor along the push.

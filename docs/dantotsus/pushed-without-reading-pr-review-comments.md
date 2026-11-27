---
date: 2026-05-21
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#24'
fix-commits: [9199b11e70, 9fd111029]
eradication-level: 5
eradication-paths: [.claude/skills/open-pr/SKILL.md, .husky/pre-push]
time-to-detect: hours
tags: [harness, github, hooks, pre-push, workflow]
zone: CLAUDE.md
---

# Pushed two commits to a PR branch without reading any review thread

## User impact

The operator reviewed PR #24 and left eight threads. Three were unresolved, and
they gave direct guidance on the areas the agent was about to touch
(library search, sanitiser claims, the custom-script justification). The agent
pushed two commits that ignored all three. The operator had to ask:

> *« Est-ce que tu avais correctement lu les commentaires sur la PR au fait ? »*

| | Seen | Expected |
| --- | --- | --- |
| Next push on PR #24 | two commits on the SPA fallback, threads untouched | commits that answer the three unresolved threads |

## Causal chain

- The agent pushed two commits that answered none of the three unresolved
  threads.
  - The agent wrote both commits from the local task, the SPA fallback.
    - The review threads were not in the agent's context when it wrote them. It
      never called `mcp__github__pull_request_read get_review_comments` before
      the push (transcript of the session).
      - In May 2026 a session learned of a review only by fetching it. The
        channel that
        pushes PR events into a session, `subscribe_pr_activity`, entered
        `/open-pr` on 2026-09-16 (9fd111029).

## Root cause of occurrence

*Thought the local task drives the next commit, actually on a branch with an
open PR the reviewer's unresolved threads drive it.* (Material)

The writer was an agent. The document that held the right answer, the
operator's review, was absent from its context at the moment it wrote the
commits. No tool or channel brought it there. The agent fetched the threads
only after the operator's question, and the follow-up commit
[`2a4ecfc`](https://github.com/hugoleborso/borso.fr/commit/2a4ecfc) answered
them.

## Detection failure causes

- **Pre-push hook:** it ran `pnpm exec knip` only, and asked GitHub nothing
  about the PR's threads.
- **CI:** it runs on the push, after the gap.
- **Review:** the operator caught it, one push cycle late.

## Countermeasure

The agent fetched the threads, classified the three unresolved ones, and shipped
the fixes in [`2a4ecfc`](https://github.com/hugoleborso/borso.fr/commit/2a4ecfc),
on the next push of the same PR.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit 9199b11e70 ([PR #28](https://github.com/hugoleborso/borso.fr/pull/28))
and commit 9fd111029.

What holds today:

- `/open-pr` step 7 calls `subscribe_pr_activity` once the PR opens. From then
  on, every review comment arrives in the session as an event, so the threads
  reach the agent's context without it having to think of fetching them. The
  step is a written instruction in a skill, so it holds only when the skill is
  followed.
- `.husky/pre-push` prints a reminder on every `claude/*` push: "address any
  unresolved review thread written by hugoleborso". It is a written instruction
  printed at push time. It fires whether or not a thread exists.

The 2026-05-21 entry rejected a hard gate because "the hook can't see prior MCP
calls". The gate does not need to. It can ask GitHub.

**Proposed:** turn the reminder into a refusal. In `.husky/pre-push`, on a
`claude/*` branch, find the open PR for the branch with
`gh api repos/hugoleborso/borso.fr/pulls?head=hugoleborso:<branch>`, read
`GET /repos/hugoleborso/borso.fr/pulls/<n>/ccr/review_threads`, and refuse the
push while a thread by `hugoleborso` is unresolved and newer than the remote
head. That makes a push over an unread thread impossible. The printed reminder
is then deleted. Measured on 2026-11-27: GraphQL is refused from a session
("GitHub GraphQL is not available from Claude Code sessions"), and the REST
route `ccr/review_threads` answered for PR #24 with `resolved` per thread.
Whether the route answers from the operator's own laptop is unverified.

**Proof it can fail:** not run, since no gate exists.

**Similar instances:** the same flow's other anchors are
[`designated-branch-was-a-merged-pr-head.md`](./designated-branch-was-a-merged-pr-head.md),
before the commit, and
[`post-merge-deploy-and-kaizen-reminder.md`](./post-merge-deploy-and-kaizen-reminder.md),
after the merge.

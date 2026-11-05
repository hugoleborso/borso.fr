---
date: 2026-11-04
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#245'
fix-pr: none (opened by the kaizen pull request for #257)
fix-commits: [self]
eradication-level: 4
eradication-paths: [.claude/hooks/pretool-merge-deploys-prod.sh]
time-to-detect: days
tags: [hooks, harness, github-actions, deploy, agents]
zone: .claude/hooks/pretool-merge-deploys-prod.sh
weak-point: gate-measures-nothing
recurs: [the-pull-request-hooks-read-the-checkout]
---

# The merge hook asked the one API the proxy refuses

## User impact

The operator relies on the merge hook to say which apps a merge deploys to
production. In a hosted session it said nothing useful.

| | Seen | Expected |
| --- | --- | --- |
| Merge of PR #257, hosted session | `Applications this merge deploys: unknown — the head commit of pull request 257 could not be read` (replayed with the old hook, measured) | `none`, and `shared-deploy` not owed |
| Merge of any numbered PR from a hosted session since PR #245 | the same two `unknown` lines | the app list `deploy-fanout.ts` computes |

The #257 session answered the `shared-deploy` question by reading the PR's
10-file list itself, so no deploy was missed this time (transcript of
`session_01K69KnCC1GwhF77rMwHPkuZ`, 00:40:59).

## Causal chain

- The hook printed `unknown` for the apps and the `shared-deploy` dispatch.
  - `PULL_REQUEST_HEAD` came back empty, so `COMPARED_HEAD` was cleared.
    - `gh pr view "$PR" --json headRefOid` asks GitHub's GraphQL API.
      - The hosted session's proxy answers every GraphQL call with
        `HTTP 403: GitHub GraphQL is not available from Claude Code sessions;
        use the REST API` (measured 2026-11-04).
        - `2>/dev/null || true` turned the refusal into an empty string.

## Root cause of occurrence

*Thought `gh` works the same in every session, actually the hosted proxy serves
REST only.*

PR #245 (`b507ea56`) added the `gh pr view` call to fix
[`the-pull-request-hooks-read-the-checkout`](./the-pull-request-hooks-read-the-checkout.md).
That defect was found in a local Desktop session, where `gh` has a real token
and GraphQL works. The fix was proved there and nowhere else.

## Detection failure causes

- **Hook contract:** the hook always exits 0 and reports what it cannot read as
  `unknown`. That is right for a notice, and it also made a permanent failure
  look like a one-off.
- **No test:** shell hooks have no tests here
  ([`the-shell-gates-are-only-ever-run-where-they-pass`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md)).
- **Knowledge:** [`what-a-hosted-session-cannot-do-on-github`](../knowledge/what-a-hosted-session-cannot-do-on-github.md)
  measured `gh api` working but never named GraphQL as refused.

## Countermeasure

The hook reads the head over REST with `gh api repos/$OWNER/$REPO/pulls/$PR
--jq .head.sha`, taking owner and repo from the tool input. It also fetches
`origin/main` first, so the fan-out compares against the real base.

Verified on PR #257, measured in this session. The old hook prints
`unknown — the head commit of pull request 257 could not be read`. The new one
prints the fan-out, and on open PR #248 it prints
`banana-rush, talos — only these applications have changed paths`.

The knowledge entry now says GraphQL is refused and triggers on that error.

## Eradication

**Type:** detection (level 4)

**Reference:** commit `[self]` on the kaizen branch for PR #257

```diff
-  PULL_REQUEST_HEAD=$(cd "$REPO_ROOT" && gh pr view "$PR" --json headRefOid --jq .headRefOid 2>/dev/null || true)
+  PULL_REQUEST_HEAD=$(cd "$REPO_ROOT" && gh api "repos/$OWNER/$REPO/pulls/$PR" --jq .head.sha 2>/dev/null || true)
```

`scripts/preflight-preview-schema-budget.sh` also calls `gh pr view`. It runs
in `preview.yml` on a GitHub runner, where GraphQL works, so it stays.

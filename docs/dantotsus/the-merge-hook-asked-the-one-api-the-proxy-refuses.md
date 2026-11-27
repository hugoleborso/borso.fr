---
date: 2026-11-04
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#245'
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/hooks/checks/merge-deploys-prod.core.ts, scripts/hooks/checks/merge-deploys-prod.core.test.ts, docs/knowledge/what-a-hosted-session-cannot-do-on-github.md]
time-to-detect: days
tags: [hooks, harness, github-actions, deploy, agents]
zone: scripts/hooks/checks/merge-deploys-prod.core.ts
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
    - The faulty line asked GitHub's GraphQL API and swallowed its error:

      ```bash
      PULL_REQUEST_HEAD=$(cd "$REPO_ROOT" && gh pr view "$PR" --json headRefOid --jq .headRefOid 2>/dev/null || true)
      ```

      - The hosted session's proxy answers every GraphQL call with
        `HTTP 403: GitHub GraphQL is not available from Claude Code sessions;
        use the REST API` (measured 2026-11-04). `2>/dev/null || true` turned
        the refusal into an empty string.
        - PR #245 (`b507ea56`) wrote the line to fix
          [`the-pull-request-hooks-read-the-checkout`](./the-pull-request-hooks-read-the-checkout.md).
          That defect was found in a local Desktop session, where `gh` has a
          real token and GraphQL works, and the fix was run there only.

## Root cause of occurrence

*Thought `gh` works the same in every session, actually the hosted proxy serves
REST only.*

**M: Method.** The fix was proved by running it in the one kind of session
where it was found. Nothing in the process ran a hook under hosted conditions
before it shipped. The input was also thin (Material): the knowledge entry
[`what-a-hosted-session-cannot-do-on-github`](../knowledge/what-a-hosted-session-cannot-do-on-github.md)
then measured `gh api` working and did not name GraphQL as refused.

## Detection failure causes

- **Hook contract:** the hook always exits 0 and reports what it cannot read as
  `unknown`. That is right for a notice, and it also made a permanent failure
  look like a one-off.
- **Tests:** shell hooks had no tests then
  ([`the-shell-gates-are-only-ever-run-where-they-pass`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md)),
  so no case fed the hook a refused `gh` call.

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

**Reference:** the commit adding this file shipped the REST call in the shell
hook. Commit `458e886c4` (PR #411) moved the hook into
`scripts/hooks/checks/merge-deploys-prod.core.ts`, which keeps the REST call,
and gave it a test.

```ts
const head = world.run('gh', [
  'api',
  `repos/${owner}/${repository}/pulls/${pullRequest}`,
```

`scripts/hooks/checks/merge-deploys-prod.core.test.ts` asserts the call made:

```ts
expect(calls).toContain('gh api repos/{owner}/{repo}/pulls/412 --jq .head.sha');
```

The knowledge entry triggers on the proxy's `GitHub GraphQL is not available`
output and on a `gh pr (view|checks|status|list)` command.

**Proof it can fail:** a version of the check that calls `gh pr view` no longer
makes the asserted call, so the test above fails (inferred from the assertion,
not planted this session).

The test holds this check only. Every check reaches the outside world through
`HookWorld.run(command, args)` in `scripts/hooks/check.core.ts`, a free-form
call, so the next check can still ask GraphQL. This is not eradicated.

**Proposed:** replace the free-form `run('gh', …)` in `HookWorld` with a typed
`githubRest(path)` member that only takes a REST path. A check could then not
express a GraphQL call at all (level 1). Every `gh` call a check makes today,
listed by `grep -n "run('gh'" scripts/hooks/checks/*.core.ts`, already uses
`gh api`, so the change moves no behaviour.

**Similar instances:** `grep -rn "gh pr view" scripts/hooks` finds only test
inputs. `scripts/preflight-preview-schema-budget.sh` also calls `gh pr view`.
It runs in `preview.yml` on a GitHub runner, where GraphQL works, so it stays.

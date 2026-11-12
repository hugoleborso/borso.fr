---
date: 2026-11-12
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#298'
fix-pr: none (the kaizen pull request for PRs #293 and #298 that adds this file)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-api-change-needs-validation.sh, .claude/settings.json]
time-to-detect: hours
tags: [hooks, harness, validation, preview, gates]
zone: .claude/hooks/pretool-api-change-needs-validation.sh
recurs: none (the first entry on the api-validation gate; the-validator-opened-a-checkout-holding-only-the-plan shares three tags and is about what a validator reads, not about when it runs)
---

# The review spent to buy a preview

## User impact

The operator merged PR #298 on a FAIL verdict, with two fixes no review had
read. Counted on the three reports under
`docs/features/pragma/cold-start-sweep/validation/` and on the commit list.

| | Seen | Expected |
| --- | --- | --- |
| Round 1, 20:17 UTC | It read two changed lines of code, one lever of the spec's five, and failed on 9 blocking findings that each said a lever was not shipped yet | A review of the finished change |
| Round 2, 23:28 UTC | The first read of the three other levers. It failed on 2 blocking findings | The confirmation of round 1's fixes |
| Merge, 00:19 UTC | Both findings fixed after round 2, "with no third round to confirm" (the pull request body) | A PASS on the code that merged |

## Causal chain

- PR #298 merged with FAIL as its last verdict.
  - No round was left to read the two fix commits. A branch gets two.
    - Round 1 had been spent at 20:17 UTC on a diff of two lines.
      - The session ran it to open the pull request, not to review the work.
        The log says so: "technical validation was run on a one-line diff only
        so the api-validation hook would let the pull request open".
        - The hook refused `create_pull_request` at 20:08 UTC. The diff touched
          `apps/pragma/api/` and held no report.
        - The session needed the pull request before the work existed. A
          preview deploys for a pull request only, and each lever was measured
          on the preview.
          - The hook asked for the report when the pull request is created:

```sh
HEAD_BRANCH="$(jq -r '.tool_input.head // empty' <<<"$INPUT")"
if [[ -z "$HEAD_BRANCH" ]]; then
  COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
  ...
  grep -qE '...gh[[:space:]]+pr[[:space:]]+create\b' <<<"$COMMAND" || exit 0
```

## Root cause of occurrence

*Thought a pull request opens once the change is done, so the moment it opens
is the moment a review can exist. Actually a pull request is also the only way
to get a preview, and work that is measured on a preview needs it first.*

`CLAUDE.md` states the belief: "Once a change is done, front-end above all,
open its pull request without asking." `.github/workflows/preview.yml` states
the fact. Its only trigger is:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
```

## Detection failure causes

- **Local, when the hook was written:** the sweep of PR #274 proved the hook on
  one case, a finished branch with no report. No case had a branch that needs
  its preview before its report can mean anything.
- **Review, round 1:** the validator graded the four missing levers blocking,
  as its procedure says. It reads the spec and the diff, and nothing told it
  the work had not started (its log line of 20:17 UTC).
- **The round budget:** `/technical-validation` allows two rounds and no third,
  so a round spent early cannot be bought back.

## Countermeasure

The gate moves from the moment the pull request exists to the moment it can
be merged. A draft opens without a report. The call that marks it ready meets
the same check. A draft still deploys its preview: `preview.yml` and `ci.yml`
hold no condition on `draft` (`grep -n draft .github/workflows/*.yml` prints
nothing). Measured on PR #310, the pull request of this entry, opened as a
draft at 01:34 UTC: the five `deploy (<app>)` jobs of `preview` and the jobs of
`ci` had started 15 seconds later. GitHub refuses to merge a draft (its
documented behaviour, not tried here, because trying it is a merge call).

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit that adds this file.

```diff
+case "$TOOL" in
+  mcp__github__create_pull_request)
+    [[ "$DRAFT" == "true" ]] && exit 0
+    ;;
+  mcp__github__update_pull_request)
+    [[ "$DRAFT" == "false" ]] || exit 0
+    HEAD_BRANCH="$(head_of_pull_request "$(jq -r '.tool_input.pullNumber // empty' <<<"$INPUT")")"
+    ;;
```

The refusal now names the way through: "If the work is not finished and its
preview is what you need next, open the pull request as a draft".

**Proof it can fail:** on a scratch worktree holding one commit that changes
`apps/pragma/api/src/main.ts` and no report, the hook was fed each call:

| Call | Exit |
| --- | --- |
| `create_pull_request`, no `draft` | 2 |
| `create_pull_request`, `draft: true` | 0 |
| `create_pull_request`, `draft: false` | 2 |
| `update_pull_request`, body only | 0 |
| `update_pull_request`, `draft: false` | 2 |
| `update_pull_request`, `draft: true` | 0 |
| `gh pr create` | 2 |
| `gh pr create --draft` | 0 |
| `gh pr ready 298` | 2 |
| `gh pr ready 298 --undo` | 0 |
| a commit message that mentions `gh pr ready` | 0 |
| `create_pull_request`, no `draft`, after a report is committed | 0 |
| `update_pull_request`, `draft: false`, after a report is committed | 0 |

**Similar instances:** `.claude/settings.json` registers two other hooks on
`mcp__github__create_pull_request`. `pretool-one-pull-request-per-session.sh`
reads the base and the session. `pretool-github-pr-body.sh` reads the body's
markup. Neither asks for finished work, so neither stands between a session
and its preview.

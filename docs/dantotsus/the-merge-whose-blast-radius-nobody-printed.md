---
date: 2026-10-27
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#95'
fix-commits: [self, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/check-settings.ts, scripts/hooks/settings-hooks.core.ts, scripts/hooks/checks/merge-deploys-prod.core.ts, scripts/pr/deploy-fanout.core.ts]
time-to-detect: 2 months
tags: [hooks, deploy, gates, meta, github-actions]
zone: scripts/hooks/checks/merge-deploys-prod.core.ts
weak-point: gate-measures-nothing
recurs: [a-warning-that-had-to-become-a-gate]
---

# The merge whose blast radius nobody printed

## User impact

PR #199 was merged with `gh pr merge 199 --squash --delete-branch`.

| | Seen | Expected |
| --- | --- | --- |
| Before the merge call | nothing printed | the hook's list of applications this merge deploys |
| The pull request's body | "deploys pragma, last-loop-lepin and banana-rush" | the six applications `deploy.yml` deployed |

Both halves were wrong in the same direction, and neither contradicted the
other out loud.

## Causal chain

- Six applications deployed to production with no warning printed.
  - Branch 1: the merge hook did not run.
    - The merge went through the Bash tool, and
      `.claude/hooks/pretool-merge-deploys-prod.sh` was registered on the
      matcher `mcp__github__merge_pull_request` and on nothing else. A hook
      matched to an MCP tool name never sees a shell command.
      - Commit `5d140956d` (PR #95) registered it on that one matcher, in a
        session that merged through the GitHub MCP server. The same file
        already held a Bash hook for `gh pr create`
        (`git show 5d140956d^:.claude/settings.json`).
  - Branch 2: the body named three applications.
    - Its author read the diff and named the applications under `apps/`. The
      diff also touched `infra/cdk/**`, and `deploy.yml` fans that out to every
      application.
      - The fan-out rule was written in two places, `deploy.yml`'s `compute`
        step and the hook's own shell, and the hook did not run.

## Root cause of occurrence

*Thought a hook guards an action, actually a hook guards a tool shape. The one
piece of code that knew the real blast radius was matched to the shape that was
not used.*

**M: Machine.** Claude Code routes a hook by tool name, and the settings file
let a hook's matcher and the shapes its script parses be written apart. The
writer was an agent that had a Bash `gh pr create` hook in the file it edited,
so the second way to reach GitHub was in its context (inferred, transcript not
read). The gate that now holds is a Machine change, which fits either reading.

## Detection failure causes

- **Typing:** a matcher string in `settings.json` had no type that related it
  to the commands a hook can parse.
- **CI:** `check-hook-decisions.sh` held each hook to its contract, but its
  loops walked the plugin's hooks only. This hook lived in `.claude/hooks/`,
  outside every loop, with no row of its own.
- **Review:** the body's application list reads as a fact about the diff, and
  checking it means knowing `deploy.yml`'s fan-out rule by heart.
- **Monitoring:** the deploy succeeded. Six green jobs are not an alert.

## Countermeasure

The hook answers both tool shapes and stops computing the application list
itself. `scripts/pr/deploy-fanout.core.ts` mirrors `deploy.yml`, so the hook
and a pull-request body read one answer. Run against PR #199's own merge commit
it prints the six applications that actually deployed.

## Eradication

**Type:** DevX check (level 2)

**Reference:** PR #202 shipped the shell fix, the commit adding this file.
Commit `458e886c4` (PR #411) deleted the shell hooks and `check-hook-decisions.sh`.
What holds today:

- `scripts/hooks/checks/merge-deploys-prod.core.ts` names both shapes:
  `tools: /^(mcp__github__merge_pull_request|Bash)$/u`.
- `listToolsNoMatcherReaches` in `scripts/hooks/settings-hooks.core.ts`, run by
  `scripts/hooks/check-settings.ts` in pre-commit and CI, refuses a tool a
  check reads that no matcher of its event lets through:

  ```ts
  (pair) => `  ${pair}: a check reads this tool and no matcher of its event lets it through`,
  ```

So a check that reads the Bash shape cannot be left unregistered for it.

**Proof it can fail:** `scripts/hooks/settings-hooks.core.test.ts` holds the
unreached-tool cases. Not replanted this session.

Two gaps remain. A new check that names only the MCP merge tool passes the
gate, because the gate checks registration, not which shapes an action has.
And the fan-out rule still has two copies: `deploy-fanout.core.ts` and the
shell in `deploy.yml`'s `compute` step, whose comment says the script
"predicts with it". This is not eradicated.

**Proposed:** have `deploy.yml`'s `compute` step call `scripts/pr/deploy-fanout.ts`
instead of its own shell. The prediction the hook prints and the deploy that
runs would then be one computation and could not disagree.

**Similar instances:** `grep -n "tools:" scripts/hooks/checks/*.core.ts` lists
every check's tool shapes. `gh-pr-create` and `github-pr-body` split the pull
request's two shapes across two checks.

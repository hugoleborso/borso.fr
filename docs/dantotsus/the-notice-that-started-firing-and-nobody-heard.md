---
date: 2026-10-28
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#202'
fix-commits: [self, 458e886c4]
eradication-level: 1
eradication-paths: [scripts/hooks/check.core.ts, scripts/hooks/check.core.test.ts]
time-to-detect: 1 day
tags: [hooks, harness, gates, meta, deploy]
zone: scripts/hooks/checks/merge-deploys-prod.core.ts
weak-point: gate-measures-nothing
recurs: [the-merge-whose-blast-radius-nobody-printed]
---

# The notice that started firing and nobody heard

## User impact

PR #202 fixed a hook that names what a merge deploys. Registered on the GitHub
MCP call alone, it had stayed silent through a `gh pr merge` while six
applications went to production. The fix made it match the Bash shape.

| | Seen | Expected |
| --- | --- | --- |
| One day later, the same session ran `gh pr merge 202` | nothing | the hook's list of applications the merge deploys |
| The hook run by hand on that exact command | exit 0, the blast radius printed | the same |

## Causal chain

- The session merged PR #202 and saw no deploy notice.
  - The hook ran and wrote its notice to plain stdout. A PreToolUse hook's
    plain stdout reaches the debug log, not the model.
    - The faulty lines, in `pretool-merge-deploys-prod.sh`:

      ```bash
      cat <<NOTE
      [merge-deploys-prod] merging pull request $PR into $BASE_BRANCH deploys to production.
      ```

      - Commit `5d140956d` (PR #95) wrote the notice for a person watching a
        terminal.
        - PR #202's fix (`02c715dc5`) kept that channel. It made the decisions
          table in `check-hook-decisions.sh` accept the needle in the hook's
          `additionalContext` or its stdout:

          ```bash
          spoken="$context
          $output"
          ```

          - Its writer had CLAUDE.md's rule in context and read it as being
            about another hook. The rule was the last clause of the bullet
            describing `knowledge-triggers.sh`: "plain stdout from either
            reaches no model, so every hook that informs answers with
            `additionalContext`" (`git show 02c715dc5^:CLAUDE.md`, line 95).

## Root cause of occurrence

*Thought a notice a hook prints is a notice the model reads, actually a
PreToolUse hook's plain stdout goes to the debug log, and only
`additionalContext` reaches the model.*

**M: Man.** The writer was an agent, and the rule was in CLAUDE.md, loaded in
every session. Its place under one hook's bullet let the prior win: the rule
read as that hook's detail. Per the agentic 4M, the fix is a gate or a shape
that holds when the prior wins, not one more line of rule text.

## Detection failure causes

- **Linter:** nothing related a hook's output channel to what the harness
  forwards.
- **CI:** `check-hook-decisions.sh` ran and passed, because its assertion
  accepted both channels. The tolerance was written so one existing hook could
  keep its shape.
- **Review:** the hook's output is correct text. Nothing on the page says where
  it goes.
- **The operator:** a hook that says nothing and a hook whose notice is
  discarded look the same from the chat.

## Countermeasure

PR #217 (`8d6962194`) made the notice an `additionalContext` answer, and the
table accepted nothing else.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `458e886c4` (PR #411) replaced the shell hooks and the
decisions table. A check now returns a `Verdict`, and `renderOutcome` in
`scripts/hooks/check.core.ts` chooses the channel. A `context` verdict is always
sent as `additionalContext`:

```ts
| { readonly kind: 'context'; readonly text: string }
…
stdout: JSON.stringify({
  hookSpecificOutput: { hookEventName: event, ...updatedInput, additionalContext },
}),
```

A check has no way to say "print this to stdout". The merge notice is a
`context` verdict of `scripts/hooks/checks/merge-deploys-prod.core.ts`.

**Proof it can fail:** `scripts/hooks/check.core.test.ts` holds the rendering of
each verdict kind. Not replanted this session.

One way around remains. Checks live under `scripts/`, where `.oxlintrc.json`
turns `no-console` off, so a check could still call `console.log` (inferred
from the config, not tried).

**Proposed:** turn `no-console` on for `scripts/hooks/checks/**`. A check that
writes to stdout itself would then fail lint at commit.

**Similar instances:** every informing check returns a `context` verdict
(`grep -ln "kind: 'context'" scripts/hooks/checks/*.core.ts`). None writes to
stdout (`grep -ln "console\.\|process\.stdout" scripts/hooks/checks/*.core.ts`
finds nothing, measured on 2026-11-27).

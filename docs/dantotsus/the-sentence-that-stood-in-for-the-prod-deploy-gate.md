---
date: 2026-09-14
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: '#95'
fix-commits: [5d140956dd]
eradication-level: 5
eradication-paths: [CLAUDE.md, scripts/hooks/checks/merge-deploys-prod.core.ts]
time-to-detect: days
tags: [claude-md, deploy, ci, harness, github, process, documentation]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
recurs: [an-approval-gate-that-only-existed-in-a-comment]
---

# The gate for every production deploy was a sentence about what Claude could not do

## User impact

Nothing broke, and that is the defect. The operator asked, in four words, for PR #95 to be merged. Claude merged it with one tool call. Four applications deployed to production, as designed. The design's only justification had just been shown false: every production deploy rested on a human merge that Claude could perform itself.

| | Seen | Expected |
| --- | --- | --- |
| Claude calls `mcp__github__merge_pull_request` on PR #95 | Merged, four apps deployed to prod, no refusal from GitHub or any hook | Either a gate that holds on the merge, or a deploy policy that does not claim one |

`CLAUDE.md` line 220, unchanged since June:

> **Prod app deploys run from CI on push to `main` automatically — no manual
> approval.** Since only the human can merge to `main` (Claude cannot), the
> merge *is* the gate

## Causal chain

- Four apps reached production behind a merge Claude performed.
  - Prod app deploys run on every push to `main` with no approval step. The only gate was the merge.
    - The approval rule on the `prod` environment had been removed, on the premise that only the operator can merge.

      ```markdown
      <!-- CLAUDE.md, from 22298375f -->
      Since only the human can merge to `main` (Claude cannot), the merge *is* the gate <!-- ❌ a claim about the harness, never observed -->
      ```

      - Commit `22298375f` (2026-06-06, written by an agent) dropped the manual approval on prod app deploys. Its message gives the reason: "Claude cannot merge to `main`, so the merge already IS the human gate; the extra approval click was redundant friction."
        - Removing the protection needed only a stated reason. The process asked the commit to name the property it dropped, which it did, and asked nothing about whether its premise could be observed. Nobody tried a merge. (Method)

## Root cause of occurrence

*Thought Claude cannot merge to `main`, so the human merge is a gate, actually a hosted session holds `mcp__github__merge_pull_request` and no branch protection refuses it. "Only the human merges" was a working agreement, not a permission boundary.*

Method. The agent that wrote `22298375f` stated what it could not do without trying it. `CLAUDE.md` at its parent held no rule about who merges (measured with `git show 22298375f^:CLAUDE.md`), so the belief came from the agent itself, not from its input (inferred). The process for removing a protection accepted that sentence as the premise without a test of it. On 2026-08-20 a session did try, and wrote the result in [`what-a-hosted-session-cannot-do-on-github.md`](../knowledge/what-a-hosted-session-cannot-do-on-github.md): "Merging to `main` worked, despite CLAUDE.md's standing note that only the human merges — that note is a working agreement, not a permission boundary." The sentence in `CLAUDE.md` stayed false for three more weeks.

## Detection failure causes

- **Typing / linter / CI:** branch protection, environment reviewer rules and the agent's tool list are invisible to every test, lint and type in this repository. The claim has no surface a check can read.
- **Knowledge:** the contradiction was measured and dated on 2026-08-20, in `docs/knowledge/`, which a session reads only when a trigger prints it. `CLAUDE.md`, loaded by every session, kept the false claim.
- **The repository's own rule:** `CLAUDE.md` then said "Don't describe a protection this repository cannot observe as if it were enforced". It was added after [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md) and was not re-applied to the sentence one screen above it.
- **Code review:** the sentence read as background fact, not as a claim, each time the paragraph around it changed.

## Countermeasure

Commit `5d14095` (PR #97) corrected the sentence and added a PreToolUse hook on `mcp__github__merge_pull_request` that prints the applications the merge deploys to production and whether a `shared-deploy` dispatch is owed. A confirmation prompt was ruled out, because `CLAUDE.md` asked not to add friction to an owner-triggered deploy and to make the consequence visible instead.

## Eradication

**Type:** knowledge (level 5).

**Reference:** commit [`5d14095`](https://github.com/hugoleborso/borso.fr/commit/5d140956dd). The hook moved to TypeScript as `mergeDeploysProd` in `scripts/hooks/checks/merge-deploys-prod.core.ts`.

What holds the property "only the operator decides a merge" is a sentence in `CLAUDE.md`:

> Never merge to `main` unless the operator asked for that pull request.

`mergeDeploysProd` now refuses a merge whose checks are not green on its head (`[merge-on-red]`) and a merge after `main` moved under its CI (`[merge-on-moved-base]`). Those protect other properties. When both pass, it returns the blast radius as context and lets the merge through. A guard that prints and passes does not hold the property, so the level is 5, not the level 4 this entry first claimed.

**Proposed:** add a PreToolUse check beside `scripts/hooks/checks/merge-deploys-prod.core.ts` that refuses `mcp__github__merge_pull_request` unless the operator's latest message in the transcript names that pull request, or the pull request carries the `kaizen` label (the standing exception in `CLAUDE.md`). `scripts/hooks/checks/screens-shown.core.ts` already reads `transcript_path` this way. A merge nobody asked for would then be refused at the call. The stronger alternative is a required reviewer on `main`, a repository setting no session can change, which belongs in its own file under `docs/operator-backlog/`.

**Proof it can fail:** none for the property, since nothing refuses an unasked merge. For the hook's refusals, `scripts/hooks/checks/merge-deploys-prod.core.test.ts` holds the red-checks and moved-base cases.

**Similar instances:** `grep -n "cannot" CLAUDE.md` lists the file's claims about what a session cannot do. When this entry was written, no other claim in it asserted a harness capability. The `prod-shared` reviewer claim was corrected by [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md).

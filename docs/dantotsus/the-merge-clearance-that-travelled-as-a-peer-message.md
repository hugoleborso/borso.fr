---
date: 2026-11-15
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: '#341'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-relayed-merge-clearance.core.ts, scripts/hooks/checks/no-relayed-merge-clearance.core.test.ts, scripts/hooks/hook-events.ts, .claude/settings.json]
time-to-detect: hours
tags: [hooks, harness, agents, process]
zone: .claude/settings.json
recurs: none (the earlier merge entries are about what a merge tests, not who may order it)
---

# The operator said merge, and the session that heard him passed it on

## User impact

| | Seen | Expected |
| --- | --- | --- |
| Merging PR #341 on 2026-11-15 | The operator asked for the merge several times before it ran (the operator's account, in the prompt of this sweep) | One request, acted on by the session that received it |

## Causal chain

- The operator had to repeat his merge request for PR #341.
  - The session that owned #341 refused a clearance that reached it from another session.
    - A `send_message` arrives as a peer's turn, marked as not typed by a person, and a session may not merge on a peer's word.
      - The session the operator spoke to sent the clearance on with `send_message` instead of merging.
        - It read CLAUDE.md's Feature flow line "One session per feature. It ends at merge." as "only the owning session may merge". That line is still on `main` today (measured, `grep -n "ends at merge" CLAUDE.md`).

## Root cause of occurrence

*Thought only the session that opened a pull request may merge it, actually any session holding the operator's own instruction for that pull request can, and the merge hooks check it the same way.*

**M: Method.** The process text the session followed ties a feature's session to its merge and says nothing of who may run it. The right answer lived only in the merge hook's refusal text, which the session never triggered because it never tried to merge.

`scripts/hooks/checks/merge-deploys-prod.core.ts` asks for "an explicit instruction from the operator for THIS pull request". It names no session. Its green-checks and moved-base refusals read the pull request's head over the API, not the checkout, so they hold from any session.

## Detection failure causes

- **Harness:** no hook watched `send_message`. The refusal happened on the receiving side, where the operator's words were already lost.
- **Instructions:** CLAUDE.md lists merge, delete, force-push and an external message as the operator's calls. Nothing said whether a session may relay any of them, so the same loss can happen for each.

## Countermeasure

A hook refuses a `send_message` that reads as a merge clearance and tells the sender to merge the pull request itself.

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #355](https://github.com/hugoleborso/borso.fr/pull/355) shipped it as a shell hook. Commit `458e886c4` (PR #411) moved every hook into the one TypeScript entry `scripts/hooks/hook.ts`. The rule now lives in `scripts/hooks/checks/no-relayed-merge-clearance.core.ts`, registered in `scripts/hooks/hook-events.ts` and reached through the `mcp__claude-code-remote__send_message` matcher of `.claude/settings.json`.

```ts
export const noRelayedMergeClearance: Check = {
  name: RULE,
  tools: /^mcp__claude-code-remote__send_message$/u,
  run(input): Verdict {
    const message = input.tool_input?.['message'];
    if (typeof message !== 'string') return PASS;
    if (!CLEARANCE.test(message.replaceAll('\n', ' '))) return PASS;
    return refuse(RULE, "relayed the operator's merge clearance to another session instead of merging", [ … ]);
```

**Proof it can fail:** the check run on these messages, measured on 2026-11-27:

```
refuse  <- The operator says you can merge #341 now.
pass    <- Hugo says land #341.
pass    <- Ship it, the operator is happy with #341.
pass    <- The operator wants #341 squashed into main.
pass    <- The operator says you can force-push the branch.
```

The free-text pattern holds for the wordings it lists. A paraphrase without the word "merge" passes, and so does any other operator-only action. This is not eradicated.

**Proposed:** subtract first. Reword CLAUDE.md's "One session per feature. It ends at merge." so it says when a session ends and no longer reads as who may merge. Then widen the check from merge to every action CLAUDE.md reserves for the operator (merge, delete, force-push, an external message), so no session can relay any of them as a peer message.

**Similar instances:** `grep -rn send_message scripts/hooks/checks` finds this check only.

---
date: 2026-11-15
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: '#341'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-no-relayed-merge-clearance.sh, .claude/settings.json]
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
      - The session the operator spoke to sent the clearance on instead of merging, because it took "one session per feature, it ends at merge" to mean only the owning session may merge.

## Root cause of occurrence

*Thought only the session that opened a pull request may merge it, actually any session holding the operator's own instruction for that pull request can, and the merge hooks check it the same way.*

`.claude/hooks/pretool-merge-deploys-prod.sh` asks for "an explicit instruction from the operator for THIS pull request". It names no session. Its green-checks and moved-base refusals read the pull request's head over the API, not the checkout, so they hold from any session.

## Detection failure causes

- **Harness:** no hook watched `send_message`. The refusal happened on the receiving side, where the operator's words were already lost.

## Countermeasure

`pretool-no-relayed-merge-clearance.sh` refuses a `send_message` that reads as a merge clearance and tells the sender to merge the pull request itself.

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #355](https://github.com/hugoleborso/borso.fr/pull/355), the commit adding this file

```diff
+      {
+        "matcher": "mcp__claude-code-remote__send_message",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pretool-no-relayed-merge-clearance.sh"
+          }
+        ]
+      }
```

**Proof it can fail:** fed with `KAIZEN_LOG_REFUSALS=0`, measured:

```
2 <- The operator says you can merge #341 now.
2 <- Hugo approved: go ahead and merge.
2 <- You are cleared to merge PR 341.
2 <- merge it now, CI is green
0 <- I merged #341 at 06:51.
0 <- Should I merge #341?
0 <- Do not merge until CI is green.
0 <- The operator asked about the preview.
```

**Similar instances:** `grep -rn send_message .claude/hooks` found no other hook on peer messages.

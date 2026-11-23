---
date: 2026-11-23
introduced-at: self-validation
detected-at: review
severity: low
related-pr: '#389'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/stop-screens-shown-not-described.py]
time-to-detect: hours
tags: [harness, hooks, agents, visual-validation, screenshots]
zone: .claude/skills/open-pr/SKILL.md
recurs: [the-screens-described-instead-of-shown]
---

# A screen pushed without its picture

## User impact

On PR #389 the operator asked for screenshots five times in one day, each
after a pushed change to a screen: "Remet les screenshots" at 11:58, "screenshots
please" at 13:10 and 15:31, "Et des screenshots ?" at 15:53, and "Est-ce que tu
as posté les sreenshots dans la PR ????" at 16:25 (UTC, read from the shipping
session's transcript). The bid default had changed from a dash to 0 in
`f6e2a7a`, and the Screenshots comment gained the folder `2026-11-23-1610` only
after the fifth ask.

| | Seen | Expected |
| --- | --- | --- |
| After the push of `f6e2a7a` | The Screenshots comment still on the earlier folders | A folder showing the bid at 0 |

## Causal chain

- The operator could not see the change without opening the preview.
  - The session pushed and replied without uploading a screenshot.
    - `/open-pr` step 5b uploads screenshots when the pull request opens.
      Later pushes refresh the comment from the folders already uploaded,
      so a new screen state appears only when somebody uploads it.

## Root cause of occurrence

*Thought the Screenshots comment follows every push, actually it lists only
the folders uploaded so far.* `/open-pr` step 5b: "Every later push to the
pull request refreshes the comment on its own."

## Detection failure causes

- **Hooks:** `stop-screens-shown-not-described.py` read the turn's text for a
  comparison claim, and this turn made none.

## Countermeasure

The same Stop hook now reads the turn's tool calls too. A turn that ran
`git push` over a range touching `apps/*/site/src/`, on a branch already
pushed, and uploaded no screenshot is blocked once with the reason.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
+    inputs = "\n".join(turn_inputs(turn))
+    if not PUSH.search(inputs) or SCREENSHOTS_TAKEN.search(inputs):
+        return False
+    moves = git("reflog", "--format=%H", "-n", "2", "@{upstream}").split()
+    return len(moves) == 2 and bool(VISIBLE_SOURCE.search(git("diff", "--name-only", moves[1], moves[0])))
```

**Proof it can fail:** in a scratch clone pushed twice, the second push
changing `apps/x/site/src/A.tsx`, a turn whose only tool call is `git push`:

```
{"decision": "block", "reason": "[screens-shown] This turn pushed a change to a screen and posted no new screenshot. ..."}
```

The same turn with an `aws s3 cp ... screenshots/pr-1/...` call printed
nothing, and so did a run with `stop_hook_active`.

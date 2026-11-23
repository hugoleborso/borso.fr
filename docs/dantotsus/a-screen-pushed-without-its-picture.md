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

On PR #389 the bid default changed from a dash to 0 and was pushed. The
operator had to ask whether screenshots were posted (friction log, 2026-11-23
16:26). The Screenshots comment then gained the folder `2026-11-23-1610`.

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

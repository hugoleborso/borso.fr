---
date: 2026-11-04
introduced-at: self-validation
detected-at: review
severity: medium
related-pr: '#249'
fix-pr: none (the kaizen pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 2
eradication-paths: [plugins/borso-harness/hooks/stop-screens-shown-not-described.py, plugins/borso-harness/hooks/hooks.json]
time-to-detect: hours
tags: [harness, hooks, agents, visual-validation, screenshots]
zone: plugins/borso-harness/hooks/hooks.json
recurs: [described-screenshot-without-checking-pixels]
---

# The screens described instead of shown

## User impact

The operator approved React Aria on one condition, that pragma's screens do not
change. The migration report that answered that condition held no image. Six
hours later the operator wrote "SCREENSHOTS !!!!!", and only then saw the
before and after pairs.

| | Seen | Expected |
| --- | --- | --- |
| Report at 2026-11-03 18:20 | "differ only by anti-aliasing on a few edges, at most 41/255 on one pixel channel… they are identical by eye", no image, no link | the pairs, with the verdict beside them |
| Subagent hand-back at 18:08 | `after-<id>.png` and `sbs-<id>.png` paths in the scratchpad, which the operator cannot open | images the operator can open |

## Causal chain

- The operator could not check the one condition they had set.
  - The report gave a verdict on screens in words.
    - The evidence existed. Two subagents had taken 16 before shots and the
      matching after shots, and built side-by-sides.
      - The subagents returned paths, and the main session summarised them.
        Nothing between the hand-back and the reply asks whether the reader can
        see what is being claimed.

## Root cause of occurrence

*Thought a measured pixel difference is the evidence, actually the evidence is
the picture the operator would have judged.* The operator's condition was
"present the differences that seem acceptable", a judgement only they could
make. A number such as 41/255 decides nothing for them. The same session had
shown the library gallery as an artifact at 15:44, so the means was known.
The habit failed at the second report because no step asked for it.

## Detection failure causes

- **Hooks:** none reads the reply. The knowledge triggers match tool output
  and paths, and a subagent's hand-back is neither.
- **Visual validation:** `/visual-validation` would have published screenshots
  to the previews CDN, but the migration ran inside a kaizen pull request and
  no validation was dispatched.
- **Earlier entry:** `described-screenshot-without-checking-pixels` fixed
  the reverse failure, an agent describing a picture it never looked at, with a
  level-5 note.

## Countermeasure

The main session built a 377 KB page of the pairs and published it as an
artifact at 00:14, then logged the friction.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit that adds this file.

```diff
+    "Stop": [
+      { "hooks": [ { "type": "command",
+        "command": "\"${CLAUDE_PLUGIN_ROOT}\"/hooks/stop-screens-shown-not-described.py" } ] }
+    ]
```

The Stop hook reads the turn that is ending. When the reply claims a visual
comparison ("by eye", "side by side", "pixel diff", "visible differences",
"screens match") and the turn published no Artifact, sent no file and embedded
no image, it blocks the stop once and asks for the images. A second stop in a
row passes, so a false match costs one extra sentence.

**Proof it can fail:** fed a transcript whose reply is the 18:20 sentence, the
hook printed `{"decision": "block", "reason": "[screens-shown] This turn
describes how screens compare but shows none of them…"}`. The same reply with
an Artifact call, an unrelated reply, and a second stop all passed.

**Similar instances:** `grep -il screenshot docs/dantotsus/*.md` lists ten
entries. `described-screenshot-without-checking-pixels` is the only one about
the report itself.

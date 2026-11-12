---
date: 2026-11-12
introduced-at: self-validation
detected-at: local
severity: low
related-pr: '#302'
fix-pr: none (the kaizen pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 1
eradication-paths: [.claude/hooks/stop-screens-shown-not-described.py]
time-to-detect: minutes
tags: [harness, hooks, agents, self-improvement-loop]
zone: .claude/hooks/stop-screens-shown-not-described.py
recurs: [the-screens-described-instead-of-shown]
---

# The guard that read "before and after" as screens

## User impact

The session that shipped PR #302 had three turns blocked by the
screens-shown stop hook, and none of them described a screen. Each block cost
a turn and a reply that restated the result. The session's attempt to narrow
the hook was refused by auto mode as self-modification, so the misfire could
not be fixed where it was felt.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-12 00:26 | blocked: a turn that compared probe outputs before and after a fix | the turn ends |
| 2026-11-12 00:38 | blocked again: a bare "before and after" about probe text | the turn ends |
| 2026-11-12 01:13 | blocked: "before and after" inside a quoted kaizen prompt, in a blockquote | the turn ends |

Source: lines `00:26 main`, `00:38 main` and `01:13 main` of PR #302's friction
log and the sweep prompt.

## Causal chain

- A turn about probe output was blocked as a visual claim.
  - `VISUAL_CLAIM` matched `before[- ]and[- ]after` on its own.
    - The phrase was added in PR #249's sweep because the report that went
      unshown spoke of before and after pairs. It names a comparison, not a
      screen, and agents compare text, timings and spans before and after a
      fix all the time.
  - The third block came from a blockquote.
    - `QUOTED_SPAN` skipped `"…"`, `“…”` and `` `…` `` spans, not `>` lines,
      so a quoted prompt counted as the turn's own claim.

## Root cause of occurrence

*Thought "before and after" marks a screen comparison, actually it marks any
comparison.*

`.claude/hooks/stop-screens-shown-not-described.py` before this change:

```python
r"\b(by eye|side[- ]by[- ]side|before[- ]and[- ]after|pixel (diff|channel|difference)s?"
```

The report it was written against, quoted in
[`the-screens-described-instead-of-shown.md`](./the-screens-described-instead-of-shown.md),
said "identical by eye" and "41/255 on one pixel channel". Two other terms
already caught it. The third term caught only what was not a screen.

## Detection failure causes

- **Hook authoring:** the hook shipped with one proof, a planted turn that
  should block. No planted turn checked that a non-visual comparison passes.
- **Self-modification guard:** auto mode refused the one-line narrowing in the
  session that hit it, so the fix waited for a fresh session.

## Countermeasure

Remove `before[- ]and[- ]after` from `VISUAL_CLAIM`, and skip blockquote lines
as quoted text. Verified by feeding three planted transcripts to the old and
the new hook in the scratch folder:

| Turn text | Old hook | New hook |
| --- | --- | --- |
| "identical by eye, at most 41/255 on one pixel channel" | block | block |
| "compared the probe outputs before and after the fix" | block | pass |
| `> Check the screens before and after, the screens match.` | block | pass |

## Eradication

**Type:** structural impossibility (level 1). The phrase is no longer a term,
so no turn can be blocked for it, and no quoted line can be read as a claim.

**Reference:** the commit adding this file, on the `claude/lessons-from-pr-302`
branch.

```diff
-    r"\b(by eye|side[- ]by[- ]side|before[- ]and[- ]after|pixel (diff|channel|difference)s?"
+    r"\b(by eye|side[- ]by[- ]side|pixel (diff|channel|difference)s?"
-QUOTED_SPAN = re.compile(r'"[^"\n]*"|“[^”\n]*”|`[^`\n]*`')
+QUOTED_SPAN = re.compile(r'"[^"\n]*"|“[^”\n]*”|`[^`\n]*`|^[ \t]*>.*$', re.MULTILINE)
```

**Proof it can fail:** the first row of the table above. The PR #249 report
text still blocks with the new hook.

**Similar instances:** `grep -n 're.compile' .claude/hooks/*.py` finds this
hook as the only one that reads the agent's prose for a claim. The other
Python hooks strip heredocs, code and quoted strings from commands.

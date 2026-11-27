---
date: 2026-11-12
introduced-at: self-validation
detected-at: local
severity: low
related-pr: '#302'
fix-commits: [self, 458e886c4]
eradication-level: 4
eradication-paths: [scripts/hooks/checks/screens-shown.core.ts, scripts/hooks/checks/screens-shown.core.test.ts]
time-to-detect: minutes
tags: [harness, hooks, agents, self-improvement-loop]
zone: .claude/hooks/stop-screens-shown-not-described.py
recurs: [the-screens-described-instead-of-shown]
---

# The guard that read "before and after" as screens

## User impact

The session that shipped PR #302 had three turns blocked by the
screens-shown stop hook, and none of them described a screen. Each block cost
a turn and a reply that restated the result. Auto mode refused the session's
attempt to narrow the hook as self-modification, so the misfire could not be
fixed where it was felt.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-12 00:26 | blocked: a turn that compared probe outputs before and after a fix | the turn ends |
| 2026-11-12 00:38 | blocked again: a bare "before and after" about probe text | the turn ends |
| 2026-11-12 01:13 | blocked: "before and after" inside a quoted kaizen prompt, in a blockquote | the turn ends |

Source: lines `00:26 main`, `00:38 main` and `01:13 main` of PR #302's friction
log and the sweep prompt.

## Causal chain

- A turn about probe output was blocked as a visual claim.
  - `VISUAL_CLAIM` matched `before[- ]and[- ]after` on its own:

```python
VISUAL_CLAIM = re.compile(
    r"\b(by eye|side[- ]by[- ]side|before[- ]and[- ]after|pixel (diff|channel|difference)s?"
```

    - Commit `d7fb6df89`, PR #249's sweep, added the phrase. The report that went unshown there spoke of before and after pairs, and the agent writing the sweep turned that phrase into a term.
  - The third block came from a blockquote.
    - `QUOTED_SPAN` skipped `"…"`, `“…”` and `` `…` `` spans, not `>` lines, so a quoted prompt counted as the turn's own claim. The same commit wrote it.

## Root cause of occurrence

*Thought "before and after" marks a screen comparison, actually it marks any
comparison, and agents compare text, timings and spans before and after a fix
all the time.* (Man)

The report the hook was written against was in the agent's context. It is
quoted in [`the-screens-described-instead-of-shown.md`](./the-screens-described-instead-of-shown.md),
and said "identical by eye" and "41/255 on one pixel channel". Two other terms
already caught it. The prior that a phrase from one report names the class
won, so the third term caught only what was not a screen.

Below that sits a Method choice. The hook classifies the agent's prose with a
vocabulary list, and any natural phrase in such a list also matches text that
is not about screens.

## Detection failure causes

- **Hook authoring:** the hook shipped with one proof, a planted turn that should block. No planted turn checked that a non-visual comparison passes.
- **Self-modification guard:** auto mode refused the one-line narrowing in the session that hit it, so the fix waited for a fresh session.

## Countermeasure

Remove `before[- ]and[- ]after` from `VISUAL_CLAIM`, and skip blockquote lines
as quoted text. Three planted transcripts were fed to the old and the new hook
(measured on 2026-11-12):

| Turn text | Old hook | New hook |
| --- | --- | --- |
| "identical by eye, at most 41/255 on one pixel channel" | block | block |
| "compared the probe outputs before and after the fix" | block | pass |
| `> Check the screens before and after, the screens match.` | block | pass |

## Eradication

**Type:** detection (level 4)

**Reference:** commit `458e886c4` (#411) ported the hook to
`scripts/hooks/checks/screens-shown.core.ts`. The port keeps the blockquote
skip and no longer lists "before and after", "by eye" or "side by side":

```ts
const VISUAL_CLAIM = new RegExp(
  `${WORD_START}(pixel (diff|channel|difference)s?` +
    `|visible differences?|screens? (match|are identical|look the same|unchanged))${WORD_END}`,
  'iu',
);
```

`screens-shown.core.test.ts` pins the blockquote skip ("skips a claim in
quotes, in backticks, in curly quotes or in a blockquote"). No test pins that
a non-visual comparison passes.

**What stays possible:** the list is pruned by hand. "visible differences" and
"screens match" are still in it, and each also matches prose that is not about
a screen. A list kept by hand is not an eradication.

**Proposed:** delete `VISUAL_CLAIM`, `QUOTED_SPAN` and `shouldShowScreens` from
`screens-shown.core.ts`, and keep only the triggers that read facts: a push of
`apps/*/site/src` with no screenshot posted (`hasPushedAScreenUnshown`), and
files left in `.pending-upload/` (`hasLeftScreenshotsUnpublished`). With no
vocabulary left, no turn can be blocked for a phrase. It also stops the hook
from blocking a turn that describes screens without pushing one, which is
what [`the-screens-described-instead-of-shown.md`](./the-screens-described-instead-of-shown.md)
added it for. That loss is the operator's call.

**Proof it can fail:** not replanted this session.

**Similar instances:** `grep -ln transcript scripts/hooks/checks/*.core.ts`
finds two checks that read the transcript. `agent-after-route.core.ts` matches
skill invocations, not prose. This is the only check that reads the agent's
own words for a claim (measured 2026-11-27).

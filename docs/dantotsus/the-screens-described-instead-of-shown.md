---
date: 2026-11-04
introduced-at: self-validation
detected-at: review
severity: medium
related-pr: '#249'
fix-commits: [d7fb6df89]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/screens-shown.core.ts, scripts/hooks/hook-events.ts]
time-to-detect: hours
tags: [harness, hooks, agents, visual-validation, screenshots]
zone: .claude/settings.json
recurs: [described-screenshot-without-checking-pixels]
---

# The screens described instead of shown

## User impact

The operator approved React Aria on one condition, that pragma's screens do not change. The migration report that answered that condition held no image. Six hours later the operator wrote "SCREENSHOTS !!!!!", and only then saw the before and after pairs.

| | Seen | Expected |
| --- | --- | --- |
| Report at 2026-11-03 18:20 | "differ only by anti-aliasing on a few edges, at most 41/255 on one pixel channel… they are identical by eye", no image, no link | The pairs, with the verdict beside them |
| Subagent hand-back at 18:08 | `after-<id>.png` and `sbs-<id>.png` paths in the scratchpad, which the operator cannot open | Images the operator can open |

## Causal chain

- The operator could not check the one condition they had set.
  - The 18:20 report gave a verdict on screens in words, a pixel difference and "identical by eye", with no image.
    - The evidence existed. Two subagents had taken 16 before shots and the matching after shots, and built side-by-sides.
      - The subagents handed back paths in the scratchpad, which the operator cannot open. The main session turned them into a sentence. ❌ the report
        - In this session's process, evidence travelled from subagent to main session to reply as scratchpad paths. The one step that publishes screenshots where the operator can open them is `/visual-validation`, and a kaizen pull request does not dispatch it. (Method)

## Root cause of occurrence

*Thought a measured pixel difference is the evidence, actually the evidence is the picture the operator would have judged.*

Method. The operator's condition was "present the differences that seem acceptable", a judgement only they could make. A number such as 41/255 decides nothing for them. The same session had published the library gallery as an artifact at 15:44, so the means was known. The process the migration followed had no step, outside `/visual-validation`, that turns a subagent's screenshots into something the operator can open.

## Detection failure causes

- **Hooks:** none read the reply. The knowledge triggers match tool output and paths, and a subagent's hand-back is neither.
- **Visual validation:** `/visual-validation` would have published screenshots to the previews CDN, but the migration ran inside a kaizen pull request and no validation was dispatched.
- **Earlier entry:** [`described-screenshot-without-checking-pixels.md`](./described-screenshot-without-checking-pixels.md) fixed the reverse failure, an agent describing a picture it never looked at, with a level-5 note.

## Countermeasure

The main session built a 377 KB page of the pairs and published it as an artifact at 00:14, then logged the friction.

## Eradication

**Type:** DevX check (level 2).

**Reference:** commit [`d7fb6df89`](https://github.com/hugoleborso/borso.fr/commit/d7fb6df89) (PR #260) added a Stop hook in Python. It moved to TypeScript as `screensShown` in `scripts/hooks/checks/screens-shown.core.ts` in `458e886c4` (PR #411), registered as `Stop: [screensShown]` in `scripts/hooks/hook-events.ts`.

```ts
// scripts/hooks/checks/screens-shown.core.ts
const VISUAL_CLAIM = new RegExp(
  `${WORD_START}(pixel (diff|channel|difference)s?` +
    `|visible differences?|screens? (match|are identical|look the same|unchanged))${WORD_END}`,
  'iu',
);
const SHOWING_TOOLS = new Set(['Artifact', 'SendUserFile']);
```

The check reads the turn that is ending. When the reply claims a visual comparison and the turn published no Artifact, sent no file and embedded no image, it blocks the stop once and asks for the images. A second stop in a row passes, so a false match costs one extra sentence. It has since grown to refuse a push to a screen with no new screenshot, and a push while validation screenshots wait in `.pending-upload/`.

The level is 2 with a gap. The check matches wordings of a claim, one phrase at a time. A reply that describes screens in other words passes, and so does a subagent hand-back that carries only scratchpad paths.

**Proposed:** refuse the hand-back, not the reply. Add `SubagentStop` to `HookEvent` in `scripts/hooks/check.core.ts`, and a check registered under it in `scripts/hooks/hook-events.ts`. It would refuse a subagent report that names a scratchpad image path with no Artifact or previews-CDN URL beside it. Unviewable evidence could then not reach the main session, whatever words describe it.

**Proof it can fail:** on 2026-11-04, fed a transcript whose reply is the 18:20 sentence, the Python hook printed `{"decision": "block", "reason": "[screens-shown] This turn describes how screens compare but shows none of them…"}`. The same reply with an Artifact call, an unrelated reply, and a second stop all passed. The TypeScript check carries its cases in `scripts/hooks/checks/screens-shown.core.test.ts`.

**Similar instances:** `grep -il screenshot docs/dantotsus/*.md` lists the entries about screenshots. `described-screenshot-without-checking-pixels` is the other one about the report itself, and [`a-screen-pushed-without-its-picture.md`](./a-screen-pushed-without-its-picture.md) the one behind the push branch of the check.

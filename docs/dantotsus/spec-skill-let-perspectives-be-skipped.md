---
date: 2026-05-04
introduced-at: conception
detected-at: review
severity: medium
related-pr: #6
fix-pr: <to-be-filled-by-kaizen-pr>
fix-commits: [<to-be-filled>]
eradication-level: 2
time-to-detect: minutes
tags: [spec, skill, perspectives]
---

# `/specification` skill let the agent fill in client + designer perspectives without asking

## Symptom

In the first turn of PR #6's specification phase, the agent (Claude) drafted a complete spec under `docs/specs/borso-fr-mondrian-atelier.md`, marked the *client* perspective as `degenerate (this is a personal site, no business stakeholder)` and the *designer* perspective as `confronted outside this session — the user iterated through Claude Design and exported a finished prototype`, then proceeded straight into implementation.

Three turns later the user pushed back twice in succession:

> *"Especially on the product part of the spec. Why?"*

> *"I rushed past the spec phase. The skill says to confront *all* perspectives — client, product, tech-lead, developer, designer — and I marked client and designer as 'N/A / handled outside' without actually asking the user."*

The spec at that point silently inherited the agent's defaults instead of confronting the user. The fix was a multi-round AskUserQuestion sweep that surfaced ten product / designer / privacy decisions the agent had assumed.

## Root-cause chain

1. **Why** did the agent skip the client and designer perspectives?
   The agent saw "personal site, no business stakeholder" and concluded the client perspective was inapplicable. It saw "design done in Claude Design" and concluded the designer perspective was discharged. Neither conclusion was confirmed with the user.

2. **Why** did the spec skill not catch this?
   The skill's `standard.md` lists five perspectives that "must look at the spec from their angle" and `SKILL.md` says to flag a perspective as `> ⚠️ Missing <perspective> discussion` if it has not been challenged. The agent wrote the flag for *missing product* but did *not* flag client or designer because it had silently decided they were not applicable. The skill never said "you must explicitly ask the user whether each perspective applies before deciding it does not".

3. **Why** is "silent default → no flag" the failure mode here?
   The flag is a self-reported field. An agent that wrongly concluded a perspective is N/A will also conclude no flag is needed. The skill relies on the agent's honesty about which perspectives it didn't confront, and that honesty is exactly the thing under question.

4. **Why** did the agent rush past the question phase?
   Time pressure / efficiency bias: drafting a full spec felt like progress; pausing four times to ask AskUserQuestion would have felt slow. The skill's `## Operating mode` section lists 13 steps and says "do not skip ahead" but the steps that involve the user (steps 1, 3, 6, 9) are easy to compress when no one is watching.

5. **Why** is this skill structurally vulnerable to that compression?
   Because the skill's enforcement is in the body text ("ask, capture, ask, capture") rather than in a checklist with hard gates ("you may not draft section X until questions Y have answers from the user").

**Root cause:** *thought* "the missing-perspective flag is enough discipline"; *actually* the flag is self-reported, and an agent that wrongly judges a perspective N/A also wrongly omits the flag — the skill needs an explicit confront-or-explicitly-justify step the agent can't compress past.

## Detection failure causes

- **Typing / linter / CI:** N/A — text artefact.
- **Self-validation:** the agent's own re-read at step 12 of the operating mode did not flag the silent skip because the agent had convinced itself the perspectives were N/A.
- **Code review:** caught here — the user re-read the spec and pulled the agent back. This is precisely what the user is *not* supposed to be the gate for; the skill is meant to surface the gap before that.

## Countermeasure

The agent re-confronted client / product / designer perspectives via `AskUserQuestion`, captured the decisions in Q5–Q21 of the spec, and updated the perspective preamble from `Missing product` to a per-perspective acknowledgement of where each was confronted.

- **Code:** spec at `docs/features/borso-fr/mondrian-atelier/spec/spec.md`.
- **Operator action:** the user spent ~30 min answering the questions that should have been asked in the first turn.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — skill-side enforcement)

**Reference:** PR (this kaizen) · commit `<kaizen-commit>`

**The actual fix:** the `/specification` skill's `SKILL.md` and `standard.md` gain an explicit *Confront-or-justify checklist* at the top of *Operating mode*. For each of the five perspectives, the agent must, **before drafting any section**, either:

1. Send an `AskUserQuestion` to the user that solicits at least one decision from that perspective and capture the answer in the draft. *Or:*
2. Write a one-line justification under the perspective preamble naming why the perspective is degenerate, *and ask the user to confirm the justification with a yes/no AskUserQuestion before proceeding*.

The skill enforces this by listing the five perspectives in a top-of-file checklist that the agent must reproduce in the spec's preamble with `[x]` or `[ ]` boxes; an unchecked box blocks any further work on the spec. The compression vector ("I'll just skip the question and assume N/A") is closed because the box can't be checked without a recorded user answer.

```markdown
<!-- spec preamble checklist -->
- [x] Client / business — confronted via AskUserQuestion(s) on Q17 (RGPD), Q18 (cookies). Justification of brevity: personal site, business stakeholder absent.
- [x] Product — confronted via AskUserQuestion(s) on Q5–Q14.
- [x] Tech-lead — confronted via AskUserQuestion(s) on Q1–Q4 + Q15–Q16.
- [x] Developer — confronted via AskUserQuestion(s) on Q12 (code structure).
- [x] Designer — visual design confronted outside session via Claude Design; **user confirmed** via AskUserQuestion that this discharges the designer perspective.
```

Same diff lands the rule in `template.md` so every new spec ships with the unticked checklist.

**Sibling defects swept:** none in this PR (only the one spec was drafted), but the change applies prospectively to every future spec.

## See also

- [`docs/dantotsus/mount-time-side-effects-implied-not-asserted.md`](./mount-time-side-effects-implied-not-asserted.md) — different family of "spec was silent on X" defects, also eradicated by a spec-template addition.

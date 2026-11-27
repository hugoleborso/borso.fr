---
date: 2026-05-04
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#6'
fix-commits: [88b1178cf6]
eradication-level: 5
eradication-paths: [.claude/skills/specification/template.md, .claude/skills/specification/SKILL.md]
time-to-detect: minutes
tags: [spec, skill, perspectives]
zone: .claude/skills/specification
---

# `/specification` skill let the agent fill in client + designer perspectives without asking

## User impact

The operator read a finished spec for PR #6 and found two of its five perspectives answered by the agent alone.

| | Seen | Expected |
| --- | --- | --- |
| Spec preamble, first turn | *Client* marked `degenerate (this is a personal site, no business stakeholder)`. *Designer* marked `confronted outside this session`. Implementation already started. | A question to the operator from each perspective, or his confirmation that it does not apply |
| Afterwards | A multi-round `AskUserQuestion` sweep surfaced ten product, designer and privacy decisions the agent had assumed (Q5 to Q21 of the spec, measured in `docs/features/borso-fr/mondrian-atelier/spec/spec.md`) | Those questions asked in the first turn |

The operator asked: *"Especially on the product part of the spec. Why?"*

## Causal chain

- The operator found the client and designer perspectives filled in without his answer.
  - The agent wrote both lines as discharged and moved on to drafting.
    - It saw "personal site" and judged no client existed. It saw "design done in Claude Design" and judged the designer done.
      - The `/specification` skill was loaded. Its `standard.md` then said "A good spec lets every perspective look at the feature from its angle" and listed five (measured: `git show 88b1178cf6^:.claude/skills/specification/standard.md`, line 19). The agent's judgment that two did not apply won over that list (Man).
    - The skill's only control was the `> ⚠️ Missing <perspective> discussion` flag, written by the same agent. It flagged *product*, which it knew it had not discussed, and not client or designer, which it believed N/A (Method).

## Root cause of occurrence

*Thought a perspective with no obvious holder, no business client or a design already exported, is discharged without asking. Actually a perspective exists to surface decisions the operator holds, and only his answer discharges it.* (Man, with Method behind it)

The agent wrote the line with the skill in context. Under the agentic 4M rule that is Man. The document was present and the prior won. The Method condition made it easy. Every control in the skill was reported by the agent whose judgment was in question. Source: the spec preamble quoted above, and line 19 of `standard.md` at `88b1178cf6^`.

## Detection failure causes

- **Typing, linter, CI:** a spec is prose. No gate read the perspective lines in May 2026.
- **Self-validation:** step 12 of the skill's operating mode is a re-read by the same agent. It confirmed its own N/A judgment.
- **Review:** the operator caught it. He is the source of the answers, so the gap reached the one reader the skill should have consulted first.

## Countermeasure

The agent confronted the client, product and designer perspectives with `AskUserQuestion`, recorded the answers as Q5 to Q21 of the spec, and replaced the `Missing product` flag with one line per perspective naming where it was confronted. The operator's answers in the spec are the verification.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit [`88b1178`](https://github.com/hugoleborso/borso.fr/commit/88b1178cf62b1fd66f659e736cb3b1cdcb38e516).

```markdown
+## Perspectives confronted
+
+> *Hard gate: every checkbox below must be ticked **and** carry a one-line justification before any other section is drafted. ...*
+
+- [ ] **Client / business** — <one-line: what was confirmed; or "user confirmed degenerate because <reason>">
```

What holds today is that checklist in `.claude/skills/specification/template.md` and step 2 of `SKILL.md`. It is still self-reported. The agent that judges a perspective N/A is the one that ticks its box, so the Method condition is unchanged. The level is 5, not the "DevX check" the first version of this entry claimed.

**Proposed:** extend `scripts/check-spec-records.sh`, which pre-commit already runs on every `docs/features/*/spec/spec.md` (`.husky/pre-commit:343`), or add a sibling beside it. It would require each line under `## Perspectives confronted` of a spec added on the branch to carry the operator's answer dated `YYYY-MM-DD`, the same proof `### Records` rows carry. A spec with an undated tick is then refused at commit. The script already skips specs that exist on `origin/main`, so old specs are not reopened.

**Proof it can fail:** not tried, because the proposal is not built.

**Similar instances:** `grep -n "Missing <perspective>" .claude/skills/specification/*.md` finds the old flag kept only as an optional fallback in `template.md`. [`mount-time-side-effects-implied-not-asserted.md`](./mount-time-side-effects-implied-not-asserted.md) is another spec-silence defect from the same PR.

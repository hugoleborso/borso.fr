---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#104'
fix-commits: none (the gate 60fcd964e shipped was deleted in c54e32da7; what holds is the specification template, which predates the defect)
eradication-level: 5
eradication-paths: [.claude/skills/specification/template.md, .claude/agents/technical-validator.md]
time-to-detect: hours
tags: [validation, agents, spec, process, meta]
zone: .claude/skills/specification
---

# A spec that never said who checks what

## User impact

The users are the validators of PR #104. Three technical validators ran
against one spec, independently, at three points in the task. All three
logged the same line to the friction log:

> the spec carries no Test strategy section, so the technical/visual routing
> the validator standard depends on had to be invented

| | Seen | Expected |
| --- | --- | --- |
| Each validator splits the spec's assertions with the other validator | three guessed splits, each one listing only the rows it claimed | one split, read off the spec's *Test strategy* |

An assertion each validator judged to be the other's was validated by
neither, and no report said so.

## Causal chain

- Each validator invented its own split of the assertions.
  - `/technical-validation` and `/visual-validation` read the split off the
    spec's *Test strategy* section, and the spec had none.
    - The spec was written by hand, section by section, as the feature grew.
      `/specification`, whose template carries the section
      (`.claude/skills/specification/template.md:112`), was never run on it.
      - So the template that holds the section was never in the writing
        agent's context. **Material.**

## Root cause of occurrence

*Thought a spec's assertions route themselves to the right validator,
actually the routing is a section of the `/specification` template, and a
spec grown by hand loses it without a trace.* **Material:** the spec was
written outside `/specification`, so the template that holds the section was
absent from the writer's context. The standard's *4M when an agent wrote the
line* calls that Material, and its fix brings the information to the moment
it is missing.

## Detection failure causes

- **Linter:** no rule reads `docs/features/`.
- **Local validation:** each validator ran to completion and produced a
  verdict. The validator brief treats *Test strategy* as authoritative but
  does not refuse a spec without it
  (`.claude/agents/technical-validator.md:105`).
- **Review:** a reviewer reads a spec for what it says, not for the heading
  it lacks. Every section present was correct.
- **The validators:** each logged the gap and carried on, because a missing
  section is not a defect in the feature.

## Countermeasure

The spec gained the section, written from what the two validators actually
divided between them. It names one assertion as neither's: whether the
attribution line satisfies OpenStreetMap's policy is a reading of that
policy, not something a browser or a compiler can answer.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit `60fcd964e` added `scripts/check-spec-test-strategy.sh`
to pre-commit. It refused a feature spec with no *Test strategy* heading,
with three older specs listed as exempt in the script. Commit `c54e32da7`
(PR #224) deleted that gate with several others, and its message names the
property dropped: "a spec with no Test strategy now pass[es] silently".

What holds today is written only. The `/specification` template carries the
section, and the technical validator reads it. Neither refuses a spec that
lacks it. The class is open again.

**Proposed:** make the only consumer refuse. In
`.claude/agents/technical-validator.md`, category D would return one
blocking FAIL row for a spec with no *Test strategy*, in the same way it
already returns one for a manual-sweep strategy (line 112). The spec's author
then adds the section before the review can pass. The refusal is what brings
the missing material, the section's name and purpose, to the spec's author
at the one moment a hand-grown spec is sure to meet. This needs no separate gate
and no exemption list kept by hand. It is still an instruction to an agent,
so it stays level 5. A gate that reads the spec's headings would be level 2,
and was deleted once already, in a commit titled "cut the cost of a feature".

**Proof it can fail:** none today. Nothing refuses the planted defect.

**Similar instances:** the 60fcd964e sweep found the same omission in
`borsouvertures/learn-by-tree`, `pragma/album-artwork` and
`pragma/improvement-backlog`. `grep -L -i '^#\+ .*test strategy' docs/features/*/*/spec/spec.md`
lists 46 of the 81 specs without it on 2026-11-27, at main 18653a2ca (measured). The count is not split by date, so some of them may predate the section (inferred).

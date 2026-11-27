---
date: 2026-10-29
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#218'
fix-commits: [self]
eradication-level: 5
eradication-paths: [.claude/skills/adr/SKILL.md, .claude/skills/adr/template.md]
time-to-detect: 1 day
tags: [meta, adr, skills, harness]
zone: .claude/skills/adr
weak-point: prose-stands-in-for-a-check
recurs: none (the first entry about an operator preference the procedure did not collect)
---

# The question I answered instead of obeyed

## User impact

A day after ADR-2026-10-28T2126 was written and its implementation merged, the
operator read the pull request and asked (translated): "One function per
application: I thought I said I wanted a shared one, why did we decide the
other way?"

| | Seen | Expected |
| --- | --- | --- |
| The operator proposes a shared reader Lambda during `/adr` | The ADR rebuts it under *Why one function per application*, and per-app ships | The walk asks him to accept or reject his own candidate before the decision is written |

He had said it. During the walk his input was (translated): "One reader Lambda
per app, really? Why not one Lambda in shared infra?" His next message, "Yes,
it replaces it", was about ADR-2026-10-25T0054 being superseded, not about
this. Per-app shipped with no ratification. Every ADR written through the
walk was exposed, since none recorded who raised which option.

## Causal chain

- Per-app shipped unratified.
  - The ADR rejected the operator's option with three reasons under *Why one
    function per application*, and the walk moved on.
    - The author read "Why not X?" as a request for reasons and answered it.
      - The `/adr` skill's five rounds ended at *choose*, and the choosing was
        the author's. Its Round 5 treated an option the operator raised like
        one the author surfaced, so his candidate competed on the author's
        rubric and lost (Method).

## Root cause of occurrence

*Thought the operator's question was an objection to answer, actually it was
a preference to weigh, and only his answer can reject it.* (Method)

The procedure the author followed gave them the last word on every option.
Round 5 of `.claude/skills/adr/SKILL.md`, before the fix, said to score the
options and pick the winner, with no rule for an option the operator named
(inferred from the diff of the fix, which adds that rule to Round 5).

## Detection failure causes

- **ADR template:** *Alternatives considered* had `name`, `summary`,
  `strengths`, `costs` and `rejection-rationale`, and no provenance field. A
  page that read as a balanced survey hid whose preference it rejected.
- **`/open-pr`:** it copies the ADR's decision into the body faithfully, so
  the body hid the same thing.
- **Review:** the operator caught it a day late, by rereading his own week.
  Nothing in the artefact pointed at the rejected preference.

## Countermeasure

The skill and the template now mark an option the operator raised, and
rejecting one is a ratification step rather than a paragraph. ADR-2026-10-28T2126
now records that the operator raised the shared variant, and his answer when
asked again a day later (translated): "OK, we keep it per app."

## Eradication

**Type:** knowledge (level 5)

**Reference:** the commit adding this file (PR #220).

The template's alternatives gain a provenance line and an answer field:

```diff
 ### Option B — <name> (rejected)
 
+- **Raised by:** operator | author
 - **Summary:** …
 - **Rejection rationale:** …
+- **Operator's answer:** required when "Raised by" is operator
```

Round 5 gains the rule the walk was missing:

> **An option the operator raised is not rejected by argument.** When the
> winner is not the option they named, say so in one line, give the reason, and
> ask. Their yes is what rejects it; silence is not.

**Proof it can fail:** none. No check reads the fields yet.

**Similar instances:** the same weak point came back as ADR-2026-11-03T1438,
whose criteria were the author's. That recurrence got a gate,
`scripts/check-adr-criteria.sh`, run by `.husky/pre-commit:375`.
`grep -c "Raised by:\*\* operator" docs/adr/*.md` finds operator-raised
options in ten records today, so the original reason for level 5, "a gate on a
corpus of one", no longer holds.

**Proposed:** extend `scripts/check-adr-criteria.sh` to refuse an option
marked `(rejected)` whose block has `Raised by:** operator` and no
`Operator's answer`. An unratified rejection of the operator's own candidate
could then not be committed. The template already carries both fields.

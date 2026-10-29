---
date: 2026-10-29
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#218'
fix-pr: '#220'
fix-commits: [self]
eradication-level: 5
eradication-paths: [plugins/borso-harness/skills/adr/SKILL.md, plugins/borso-harness/skills/adr/template.md]
time-to-detect: 1 day
tags: [meta, adr, skills, harness]
zone: plugins/borso-harness/skills/adr
weak-point: prose-stands-in-for-a-check
recurs: none (the first entry about an operator preference the procedure did not collect)
---

# The question I answered instead of obeyed

## Symptom

A day after ADR-0049 was written and its implementation merged, the operator
read the pull request and asked:

> One function per application : je croyais avoir dit que je voulais un shared,
> pourquoi on a tranché dans l'autre sens ?

They had said it. During the `/adr` walk their input was:

> Une lambda lectrice par app, vraiment ? Pourquoi pas une lambda dans shared
> infra ?

That was treated as a question to rebut. Three reasons were written into the
ADR under *Why one function per application*, the walk continued, and their
next message — *"Oui, il le remplace"* — was about ADR-0044 being superseded,
not about this. Per-app shipped with no ratification of any kind.

## Root-cause chain

1. **Why did per-app ship unratified?**
   The operator's preference was recorded as an objection and answered, rather
   than as an input to the decision.
2. **Why was it read as an objection?**
   It was phrased as a question. *"Pourquoi pas X ?"* is grammatically a
   request for reasons, and answering it with reasons feels like the
   cooperative move.
3. **Why did the walk not stop there?**
   The skill's five rounds end at *choose*, and the choosing is the author's.
   Nothing in the procedure distinguishes an option the operator raised from
   one the author surfaced, so the operator's own candidate competed on equal
   terms with the others and lost to the author's own rubric.
4. **Why did the ADR not expose it?**
   The template has *Alternatives considered*, and the rejected option went
   there, correctly. Nothing in the template records **who** proposed an
   option, so a page that reads as a balanced survey is also a page where the
   operator's preference is invisible.
5. **Why did review not catch it?**
   The pull request body carried the decision table; the operator read it a day
   later and caught it. That is the system working, but it worked by the
   operator rereading their own week rather than by anything in the artefact.

**Root cause:** thought the operator's question was an objection to answer,
actually it was a preference to weigh, and the ADR's own format gave the
decision no way to say which option came from whom.

## Detection failure causes

- **The `/adr` skill:** requires alternatives and consequences. It has no rule
  about an alternative the operator named.
- **The ADR template:** *Alternatives considered* has `name`, `summary`,
  `strengths`, `costs`, `rejection-rationale`. No provenance field.
- **`/open-pr`:** copies the decision through faithfully. Faithful to a record
  that was already missing the point.
- **The operator:** caught it, a day late, by rereading. The only mechanism
  that worked.

## Countermeasure

- **Code:** the skill and the template now mark an option the operator raised,
  and rejecting one is a ratification step rather than a paragraph.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** instruction change (level 5 — the floor, and honestly the floor)

The `/adr` skill is markdown the model executes; there is no runtime that could
refuse an ADR for missing a ratification, because nothing but a model reads the
walk. A gate could check the *artefact* — an `Operator's answer` field absent
where `Raised by: operator` appears — and that is worth building the day a
second ADR trips this. One instance is not a pattern, and a gate on a corpus of
one is the mistake
[`the-check-that-cost-more-than-the-defect.md`](./the-check-that-cost-more-than-the-defect.md)
is about.

**Reference:** PR #220 · commit `self`

**The actual fix:** two changes to the `/adr` skill, in the plugin.

The template's alternatives gain a provenance line, so a page that rejects the
operator's own candidate says so on its face:

```diff
 ### Option B — <name> (rejected)
 
+- **Raised by:** operator | author
 - **Summary:** …
 - **Rejection rationale:** …
```

And Round 5 gains the rule the walk was missing:

> **An option the operator raised is not rejected by argument.** When the
> winner is not the option they named, say so in one line, give the reason, and
> ask. Their yes is what rejects it; silence is not. An ADR whose chosen path
> beats an operator-raised alternative, with no recorded answer, is not
> finished.

The asymmetry is deliberate. An author-raised alternative is rejected by the
rubric, which is what the rubric is for. An operator-raised one is rejected by
the operator.

**Sibling defects swept:** ADR-0049 itself. Its *Why one function per
application* section now records that the operator raised the shared variant,
and the answer they gave when asked again a day later — *"Ok on garde par
app"* — which is the ratification the walk never collected.

## See also

- [`docs/adr/0049-agents-read-production-through-an-invoked-reader-lambda.md`](../adr/0049-agents-read-production-through-an-invoked-reader-lambda.md)
- [`docs/quality/weak-points.md`](../quality/weak-points.md) — `prose-stands-in-for-a-check`.

---
date: <YYYY-MM-DD>                  # when the Dantotsu was written
introduced-at: <stage>              # conception | implementation | self-validation | code-review | n/a-vendor-knowledge
detected-at: <layer>                # typing | linter | local | ci | review | qa | staging | production | operator-deploy
severity: <level>                   # low (no user impact) | medium (degraded UX) | high (user-blocking)
related-pr: <#n or url>
fix-commit: <sha or list>
time-to-detect: <minutes/hours/days from defect introduction to symptom>
tags: [<topic>, <topic>, …]         # cdk, cloudfront, s3, ci, pnpm, dsql, github-actions, …
---

# <Title — sparks curiosity, hints at the lesson, NOT the user-story name>

## Symptom

From the user's perspective when there is one, or the operator's
perspective for vendor-knowledge entries. Include the literal error
or screenshot if useful — verbatim, no paraphrase.

## Root-cause chain

Trace the sequence of events from the symptom backwards into the
system, one step at a time, until you hit the **first point where
the behaviour diverged from intent**.

1. **Why?** <step-1 question>
   <answer>
2. **Why?** <step-2 question>
   <answer>
…

**Root cause:** one sentence in `thought X, actually Y` form. Validate
by asking: *if the developer had known the "actually" part, would they
have written correct code on the first try?* If yes, you found it. If
no, dig further — push past "I wasn't paying attention" and other
shallow stops.

## Detection failure causes

For each defence-in-depth layer that should have caught the defect
but didn't, name the specific reason. Drop layers that are
inapplicable; don't write "no test" for layers — push to
*why* there was no test, or why the test didn't cover this path.

- **Typing:** <…>
- **Linter / static analysis:** <…>
- **Functional validation locally:** <…>
- **CI (tests / build):** <…>
- **Code review:** <…>
- **PO / QA validation:** <…>
- **Staging monitoring:** <…>
- **Production monitoring / alerting:** <…>

## Countermeasure

The minimal change that restores correctness AND demonstrates the
developer understood the cause. A good countermeasure removes the
misconception (e.g. types the field as required); a bad one wraps
the failing path in `if` and leaves the misconception intact.

- **Code:** commit `<sha>` — <what changed and why it addresses the
  root cause specifically>
- **Operator action:** <if anything is required outside the codebase>

## Eradication

Latent siblings, tooling that prevents the misconception, detection
improvements, knowledge sharing. Don't end without a plan for each.

- **Sibling defects swept:** <paths / commits where we checked or
  fixed similar latent issues>
- **Tooling change:** <linter rule, type-system pattern, schema
  validation, etc. that makes the misconception structurally
  impossible>
- **Detection improvement:** <test, alarm, runbook>
- **Knowledge sharing:** <doc updated, story told, this entry
  written>

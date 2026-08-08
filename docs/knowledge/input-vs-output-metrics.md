# Input vs output metrics — Amazon flywheel

When framing the *measurable objective* of a feature spec — and the test strategy that validates
it — distinguish two kinds of metric. The framing is borrowed from Amazon's "controllable input
metrics" doctrine (Bezos: *obsess over input metrics; output metrics will follow*).

## Output metric

The lagging, multi-causal end-state we actually care about. *"Users learn an opening." "Cart
abandonment drops." "Customer NPS rises." "Engineers ship faster."* You can measure it
eventually, in production, with real users — but never directly, never from CI, never on a
single PR, often only over weeks or quarters.

A green CI gate **does not move an output metric** — it only checks that the input metrics
that *should* drive it are still passing.

## Input metric

The leading, controllable, observable behaviour that — when consistently executed — produces
the output. *"Variation drilled to completion." "Add-to-cart → checkout p75 < 2 s." "Page load
p75 < 1 s." "PR review p75 < 24 h."* Input metrics are deterministic flows, named events, or
numeric thresholds an automated harness can verify on demand.

Input metrics are what `/visual-validation` and analytics dashboards alert on.

## Examples

| Output metric (lagging, real-world) | Input metric(s) (leading, machine-observable) |
| --- | --- |
| Users learn an opening | Variation drilled to completion (every leaf visited); user clicks "Switch to Play" after drill; Play scope reaches every leaf without an out-of-book event |
| Users buy more | Add-to-cart → checkout p75 < 2 s; abandonment rate < target; logged-in users open product page within 1 s |
| Customer happiness | Page load p75 < 1 s; support response time < 4 h; zero P1 incidents in last 30 d |
| Engineers ship faster | PR review p75 < 24 h; CI green-rate > 95 %; rollback rate < 1 % of deploys |

## Why the distinction matters

Two anti-patterns it prevents:

1. **Confusing output for input.** A spec writes *"users learn an opening"* as its measurable
   objective and claims `/visual-validation` will validate it. Visual-validation cannot drive a
   human's brain. The result: a green CI gate that proves nothing about adoption, and a missing
   input-metric layer that *could* have been gated. Symptom in spec review: the test strategy
   talks about "users feel" instead of "the app emits event X within Y ms".

2. **Output-only specs.** A spec names only the output metric ("revenue +5 %") with no input
   metrics. Implementation has no fast feedback loop; teams ship blind for months until the
   lagging metric reports back. Symptom in spec review: production-strategy section is empty
   on day-to-day instrumentation, full of quarterly review language.

Pair every output metric with at least one input metric. Visual-validation gates the input
metrics; humans review monthly whether the input metrics still proxy the output metric.

## Where this is enforced

- [`.claude/skills/specification/standard.md`](../../.claude/skills/specification/standard.md#input-vs-output-metrics-amazon-flywheel) — the rule.
- [`.claude/skills/specification/template.md`](../../.claude/skills/specification/template.md) — *Why* and *Production strategy → Analytics* sections require both.
- The `specification` skill's step-12 inconsistency sweep flags any "measurable objective" that
  reads like an output metric without a paired input metric.

## Reference

- Jeff Bezos, 2007 shareholder letter, "controllable input metrics."
- Colin Bryar & Bill Carr, *Working Backwards* (2021), chapter on the Amazon flywheel.

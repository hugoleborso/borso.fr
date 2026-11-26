# Technical validation — standard

Why the gate exists and where its edges are. The rules the validator applies,
category by category, live once in
[`../../agents/technical-validator.md`](../../agents/technical-validator.md).
The dispatch brief is in [`template.md`](./template.md).

## Why standalone

The agent that wrote the code thinks the code is fine. The validator runs in a
fresh Agent invocation with no chat history and no implementation summary,
reading only the spec, the plan, the diff and the test results. The dedicated
agent's definition carries the rules, which is why `general-purpose` is never
dispatched.

## Why this matters (Jidoka)

Visual validation catches *visible* defects. Technical validation catches the
code that works on screen but is dirty, untested, or out of step with what the
spec said. Each is a future Dantotsu, caught here at the cheapest moment,
before push. A failing technical validation halts the push.

## The split with visual validation

Each behavioural assertion belongs to exactly one validator.

- **Technical (category D):** ground truth is a pure function or deterministic
  non-DOM behaviour. Examples are RNG determinism, a URL parser, a palette
  validator, a keyboard-event guard.
- **Visual:** ground truth lives in the running browser. Examples are rendered
  layout, animation, focus rings, viewport or media-query driven defaults
  (`prefers-reduced-motion`), and DOM side-effect flows like a PNG download.

## Why the scale category exists

Two defects passed every other category. A double tap recorded two punches for
one loop, and four players arriving together at a table with two free seats
were all seated. Each was correct for one request at a time. See
[`docs/dantotsus/five-monkeys-at-a-three-seat-table.md`](../../../docs/dantotsus/five-monkeys-at-a-three-seat-table.md).

## Why a finding carries its failing case

Every FAIL can then be reproduced by whoever fixes it. A validator that has to
write the failing case down finds out, while writing it, whether the concern
was real.

## What does not get validated

- **Performance**: bundle size, runtime profile, memory. An observability
  concern.
- **Security**: `/security-review`.
- **Accessibility audit** beyond what the spec asserts.
- **Architectural fit** beyond what the spec and plan named.

## Verdict semantics

One tag per row:

- **PASS**: observed to hold, with evidence in the row.
- **FAIL (blocking)** or **FAIL (non-blocking)**: observed not to hold, and
  typed.
- **UNVERIFIABLE**: undeterminable (missing input, ambiguous spec).

The aggregation is in the agent's *Verdict semantics*, and acceptance in
[`SKILL.md`](./SKILL.md#verdict-acceptance--pr-disclosure).

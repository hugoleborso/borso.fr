# Audit imported deps and patterns when planning

When a feature plan touches code that came in from a port (or a previous iteration that
introduced a dep for narrow reasons), the planning agent must **question every dep and every
state-management pattern** instead of carrying them forward. Skipping this audit produces a
defect waiting to happen: parallel patterns coexist, the new code looks like the old code's
neighbour rather than its replacement, and a future Dantotsu has to ask *"why didn't anyone
think of simplifying?"*

## Symptom

The borsouvertures port arrived with a thin `zustand` `useAppState` (8 fields, 8 setters,
no middleware, no slices). The first plan kept zustand verbatim and *additionally* introduced
`useSyncExternalStore`-driven state machines for the new Learn-tree / Play loops. Two patterns
for external store management would coexist in the same app of five users — twice the
mental-model cost, twice the test-fixture surface, ~1 KB of vendor surface for an 8-field thin
wrapper.

The reviewer caught it ("why zustand?"). The lesson: the planning agent should have caught it.

## Root cause

When porting code, vendor surface propagates by inertia. The planning agent, focused on the
*new* patterns the spec demands, treats existing code as an immovable substrate. That's wrong:
the *moment a new pattern is introduced*, every existing usage of the older pattern becomes a
candidate for unification.

Two anti-patterns combine:

1. **Carry-forward without justification.** A dep is in `package.json`; the plan inherits it
   instead of asking "would this dep land in the plan if we were starting from scratch?"
2. **Pattern multiplicity.** Introducing pattern *B* (`useSyncExternalStore` for machines)
   without re-evaluating pattern *A* (`zustand` for the global store) leaves two parallel
   patterns that the next maintainer has to learn.

## Fix at planning time

Before the plan's *How each spec decision becomes code* table is finalised, run a
**Pattern Coherence pass**:

1. List every dep in `package.json` that the spec **doesn't explicitly justify**.
2. For each, answer in one sentence: *"if I were starting from scratch today, would this dep
   land?"* If the answer is "no" or "not sure", flag it as a drop candidate.
3. List every state-management / data-flow pattern visible in the workspace (zustand, Redux,
   context, machines, raw `useState`).
4. If the spec adds a new pattern, ask explicitly whether the existing patterns should
   migrate onto it. If yes, add a `Pattern Coherence` row to section 1 of the plan with the
   migration as its own work item. If no, add a row that **names** the multiplicity as a
   deliberate choice — not as inertia.

The pass is short — minutes, not hours — and the output is one row in the plan or one
sentence in the open questions.

## Detection

`pnpm exec knip` catches deps no code imports. It does **not** catch a dep that is still
imported but has been superseded by a newer pattern in the same workspace. That's the
detection gap this rule fills: the planning agent reads the diff with the question
*"is anything here a legacy substrate I'm building on without reason?"*

If the user has to ask "why this dep?" during plan review, the audit was skipped. Treat that
question as a planning defect (the rule should have surfaced it) rather than an honest
question about a trade-off.

## Where this is enforced

- [`.claude/skills/technical-conception/standard.md`](../../.claude/skills/technical-conception/standard.md#common-mistakes)
  — common-mistake row pointing back here.
- [`.claude/skills/technical-conception/SKILL.md`](../../.claude/skills/technical-conception/SKILL.md#failure-modes-to-avoid)
  — failure-mode row referencing this file.

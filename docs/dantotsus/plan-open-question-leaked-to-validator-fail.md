---
date: 2026-05-05
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#8'
fix-commits: [3a6a89c64c]
eradication-level: 5
eradication-paths: [.claude/skills/implementation/SKILL.md, .claude/skills/technical-conception/standard.md]
time-to-detect: hours
tags: [spec, plan, implementation, validators]
zone: .claude/skills/technical-conception
---

# Open question in the plan leaked all the way to a technical-validator FAIL

## User impact

On PR #8, the borsouvertures learn-by-tree drill lost which leaves a player had
visited when the page reloaded, while the spec listed that set as persisted
state. The operator got a validator FAIL and a round trip of about an hour and
three commits (measured by the session) to settle what the spec meant.

| | Seen | Expected |
| --- | --- | --- |
| Reload mid-drill | the visited leaves of the variation are cleared | one behaviour, the one the spec and the code agree on |
| Validator row A17 / D18 | "The machine resets `visitedLeafIds = EMPTY_VISITED` on `start`, and `useAppState` doesn't round-trip them. Lost on reload." | PASS |

## Causal chain

- The validator failed the drill's persistence.
  - The code kept visited leaves in machine state only, and reset them on `start`.
    - The implementing agent built the "transient" reading, the opposite of the
      plan's own reading, knowing the question was open.
      - The plan, commit `43dd0f373`, gave a reading in its *Open questions /
        unknowns*: "Plan reads this as: persist visited-leaves keyed by
        variationId so a mid-drill reload doesn't lose progress ... If Hugo
        intended 'transient, reload = clear,' flag it back during step-12 of
        the next spec iteration."
        - The same commit's message said "None block implementation", and
          flagged the questions "for next-spec iteration". The question went to
          a later session instead of to the operator before implementation.
          - The spec's sentence, "the set of leaves visited per variation during
            the current drill", allowed both readings.

## Root cause of occurrence

*Thought an open question in the plan left the implementer free to pick a
reading in code, actually the plan had already picked one, and the validator
judges the code against the spec's text, so a third reading that neither states
is a FAIL waiting to happen.* (Man)

The plan's reading was in the implementer's context, since the skill reads
`plan.md` end to end (inferred, no transcript survives), and the agent built the
opposite. A document that was present and overridden calls for a gate that
holds when the agent's own pick wins, not one more written rule.

## Detection failure causes

- **`/specification`:** the step-12 inconsistency sweep read the ambiguous
  sentence as fluent.
- **`/technical-conception`:** it flagged the ambiguity correctly, but the
  routing pointed at the next spec iteration rather than the operator.
- **`/implementation`:** no precondition looked at the plan's open questions
  before the walk began.
- **`/technical-validation`:** it caught the mismatch as designed, after the
  code was built on one reading.

## Countermeasure

The spec was amended in PR #8 (commit `56687de07`) to say visited leaves are
intentionally not persisted. The validator's re-run returned
`PASS_EXCEPT_UNVERIFIABLE`.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit [`3a6a89c64c`](https://github.com/hugoleborso/borso.fr/commit/3a6a89c64c).
Two written rules hold today.

- `.claude/skills/implementation/SKILL.md` step 1a: "Verify the plan has no open
  questions left unanswered. ... Any open item is a stop-and-ask".
- `.claude/skills/technical-conception/standard.md` § 5: "Any item left here is
  a hard block on `/implementation`".

The `[resolved-during-implementation: …]` and `[deferred-to-future-pr]` markers
this entry first proposed are gone (`grep -rn 'resolved-during-implementation'
.claude scripts` finds nothing, measured). The entry first called these rules a
level 2 DevX check. They are instructions an agent reads, so the level is 5.

**Proof it can fail:** none. Nothing refuses `/implementation` on a plan with an
open question.

**Proposed:** a PreToolUse check in `scripts/hooks/checks/`, routed by the
`Skill` matcher that `.claude/settings.json` already sends to
`scripts/hooks/hook.ts`, in the shape of `agent-after-route.core.ts`. When the
skill is `implementation`, it reads the branch's `plan.md` and refuses while the
`## Open questions / unknowns` section holds a bullet. The implementer could then
never start on a reading the plan left open, and the question would reach the
operator at the start of the phase rather than at the validator.

**Similar instances:** `grep -n '^## Open questions' .claude/skills/technical-conception/template.md`
shows the one section every plan carries.

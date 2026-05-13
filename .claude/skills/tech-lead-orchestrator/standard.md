# tech-lead-orchestrator standard

The contract this skill is held to. `/technical-validation` reads this when
reviewing a tech-lead-orchestrator change.

## Stage diagram

The 8 stages are: `spec`, `plan`, `adrs`, `implement`, `validate`,
`arbitrate`, `ship`, `escalated`. Transitions:

| From | To | When |
|---|---|---|
| spec | plan | `spec.md` present (or `/specification` returns `done`). Spec checksum recorded. |
| plan | adrs | `/technical-conception` returns `done` with `plan.md` next to spec. |
| adrs | implement | All ADR-trigger candidates have been processed; each ADR number is in `state.adrIndex`. If no candidates, transition immediately. |
| implement | validate | `/implementation` returns `done` with a `next: { kind: 'validate' }` hint. |
| validate | arbitrate | At least one validator returned a verdict. |
| arbitrate | implement | `nextAction` is `fix`. `retries.implement++`. |
| arbitrate | plan | `nextAction` is `replan`. Scope flagged in the replan verdict. |
| arbitrate | escalated | `nextAction` is `escalate`. Terminal. |
| arbitrate | ship | All verdicts PASS. |
| ship | (end) | Push successful, deploy reminder issued. |

## Verdict YAML contract

See [`sub-agent-contract.md`](./sub-agent-contract.md) for the full
contract. The orchestrator's promise:

- Read **only** the YAML front-matter via
  `parseVerdictFromMarkdown(content)`.
- Never absorb the markdown body except when the verdict is
  `fail-plan` or `escalate` and the body is needed to inform the
  next stage's prompt.
- Treat unparseable verdicts as `blocked` with
  `next: { kind: 'escalate', reason: 'unparseable-verdict: <reason>' }`.

## ADR triggers (4, OR)

A choice qualifies for an ADR when **at least one** of these flags is
`true` (cf. `src/adr-trigger.utils.ts`):

1. `hasMultipleSeriousAlternatives` — ≥ 2 serious paths were considered.
2. `hasCrossCuttingImpact` — touches ≥ 2 apps or ≥ 2 modules.
3. `divergesFromConvention` — contradicts CLAUDE.md, an existing ADR,
   or a `docs/knowledge/` entry.
4. `looksStandardOrExistsElsewhere` — industry-standard pattern or
   already solved in another repo. The ADR records reuse vs. reinvent.

The composition is a pure function; the *detection* (i.e. setting the
flags) is fuzzy and stays in the LLM's hands during the `plan → adrs`
transition.

## Retry policy

- Cap: `getMaxRetries(process.env.TECH_LEAD_MAX_RETRIES)`, default `3`.
- Action: `nextAction(retries, verdictKind, maxRetries)` returns one
  of `fix` / `replan` / `escalate`.
- A spec-flaw verdict (`fail-spec`) escalates immediately — `spec.md`
  is never edited by the orchestrator.
- A crash verdict (`crash`) escalates immediately — investigate
  manually.

## Spec immutability

- `recordSpecChecksum(state, specContent, now)` is called once after
  the `spec` stage.
- `assertSpecUnchanged(previousChecksum, currentContent)` is called
  before every sub-agent invocation.
- On `OrchestratorSpecMutationAttemptedError`: revert the file (`git
  checkout HEAD -- docs/features/<app>/<slug>/spec/spec.md`),
  transition to `escalated`, emit `tech_lead_escalation` with reason
  `spec-mutation-attempted`.

## Context discipline (no hard cap)

- `recordContextBytes(state, addedBytes, now)` accumulates and returns
  `crossedMilestone` when a log-scale boundary is reached.
- A non-null `crossedMilestone` triggers a `tech_lead_context_growth`
  event with the milestone value (in bytes).
- The cap is **deliberately absent** (decision Q-CONTEXT). The signal
  is post-hoc, fed to `pnpm tech-lead:metrics` and the post-merge
  `/after-task-dantotsus` pass.

## Human-message classification

When the human re-engages mid-run, classify before continuing:

- `guidance` — direction-shaping. Welcome.
- `answer` — response to an `AskUserQuestion`. Welcome.
- `correction` — the human had to correct the AI on something the AI
  should have known. This is the only category that counts toward
  `human_corrections_per_run` and feeds Dantotsu candidates.

The orchestrator calls `journal.utils.ts:serializeEvent` with a
`human_message_received` event and the chosen category. No hook
(decision Q-HUMAN-MSG).

## Visual-validation skip

A feature with no UI surface skips `/visual-validation` silently
(decision Q-VIS-VAL). The orchestrator emits
`tech_lead_visual_validation_skipped` with a `reason` (e.g.
`"no-ui-surface: skill-only feature"`) and proceeds with only
`/technical-validation`'s verdict.

## Run artefacts (all committed)

All artefacts live under `docs/features/<app>/<slug>/`:

```
spec/spec.md
plan/plan.md
validation/technical-validation-<ts>.md
validation/visual-validation-<ts>.md       (if any)
runs/<run-id>/state.json
runs/<run-id>/journal.md.jsonl
runs/<run-id>/journal.md                  (human-readable render)
runs/<run-id>/agents/<agent>-<step>.md
runs/<run-id>/errors.log                  (only when something throws)
```

Aborted runs stay in the tree (decision Q-RUN-COMMIT). `git add -A`
on the `runs/` folder at `ship` is part of the commit, not a follow-up.

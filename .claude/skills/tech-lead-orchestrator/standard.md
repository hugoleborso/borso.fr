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
| arbitrate | implement | `verdictKind` maps to action `fix`. `retries.implement++`. |
| arbitrate | plan | `verdictKind` maps to action `replan`. Scope flagged in the replan verdict. |
| arbitrate | escalated | `verdictKind` maps to action `escalate`. Terminal. |
| arbitrate | ship | All verdicts PASS. |
| ship | (end) | Push successful, deploy reminder issued. |

## `state.json` schema

```jsonc
{
  "runId": "2026-05-13-1530-abc",         // timestamp + random suffix
  "feature": { "app": "meta", "slug": "tech-lead-orchestrator" },
  "pilotedByTechLead": true,
  "stage": "spec",                         // current stage from the diagram above
  "retries": { "implement": 0, "validate": 0 },
  "adrIndex": [1, 2],                      // numbers of ADRs created this run
  "bytesRead": 0,                          // cumulative, for context-growth events
  "specChecksum": null,                    // SHA-256 hex of spec.md once recorded
  "startedAt": "2026-05-13T15:30:00.000Z",
  "updatedAt": "2026-05-13T15:32:00.000Z"
}
```

The orchestrator overwrites `state.json` on every stage transition and
on every retry-counter increment. The file is committed at `ship`.

## Verdict YAML contract

See [`sub-agent-contract.md`](./sub-agent-contract.md) for the full
contract. The orchestrator's promise:

- Read **only** the YAML front-matter (the block between the leading
  `---` delimiters), via `Read` with a `limit:` of ~15 lines.
- Never absorb the markdown body except when the verdict is
  `fail-plan` or `escalate` and the body is needed to inform the
  next stage's prompt.
- Treat unparseable front-matter (missing block, malformed YAML,
  missing required field) as `blocked` with
  `next: { kind: 'escalate', reason: 'unparseable-verdict: <why>' }`.

### Deriving verdictKind

Compose the `verdictKind` from the verdict's `status` + `next`:

| Verdict `status` | Verdict `next.kind` | `verdictKind` |
|---|---|---|
| `done` | (any) | `pass` |
| `failed` | omitted or absent | `fail-local` |
| `failed` | `replan` | `fail-plan` |
| `failed` | `escalate` | `fail-spec` |
| `blocked` | `escalate` | `fail-spec` (if reason mentions spec) / `crash` (otherwise) |
| `question` | `answer-needed` | (re-prompt the sub-agent after human answers; no retry consumed) |

## ADR triggers (4, OR)

A choice qualifies for an ADR when **at least one** of these flags is
`true`. Detection is fuzzy — the orchestrator (the LLM) reads the plan
and judges each candidate:

1. **multiple-alternatives** — ≥ 2 serious paths were considered.
2. **cross-cutting** — touches ≥ 2 apps or ≥ 2 modules.
3. **diverges-from-convention** — contradicts CLAUDE.md, an existing ADR,
   or a `docs/knowledge/` entry.
4. **looks-standard** — industry-standard pattern or already solved in
   another repo. The ADR records reuse vs. reinvent.

If none of the four fires for a candidate, no ADR — that's the gate
against ADR spam.

## Retry policy

- Cap: `MAX_RETRIES = 3`. Override via the `TECH_LEAD_MAX_RETRIES`
  environment variable when invoking the orchestrator (e.g. in tests).
- Lookup table from `verdictKind` + current retry count to next action:

| `retries.implement` ≥ `MAX_RETRIES` | `verdictKind` | Action |
|---|---|---|
| yes | (any) | `escalate` |
| no | `pass` | (degenerate — orchestrator should have transitioned to `ship`) |
| no | `fail-spec` | `escalate` immediately |
| no | `crash` | `escalate` immediately |
| no | `fail-plan` | `replan` |
| no | `fail-local` | `fix` |

A question verdict (`status: question`) does **not** consume a retry —
the orchestrator surfaces the question to the human via
`AskUserQuestion`, then re-invokes the sub-agent with the answer.

## Spec immutability

- The orchestrator records `state.specChecksum = sha256(specContent)`
  once, at the end of stage `spec`.
- Before every sub-agent invocation that follows, the orchestrator
  re-reads `spec.md`, re-hashes, and compares.
- On mismatch: revert the file with
  `git checkout HEAD -- docs/features/<app>/<slug>/spec/spec.md`,
  append an `escalation` event with reason `spec-mutation-attempted`,
  and transition to `escalated`.

## Context discipline (no hard cap)

- The orchestrator tracks `state.bytesRead` cumulatively (estimated
  from line counts × ~120 bytes when reading files; exact when
  `wc -c` is run).
- At each log-scale palier crossed (1 / 2 / 4 / 8 / 16 / … KiB), it
  appends a `context_growth` event with the milestone value.
- The cap is **deliberately absent** (decision Q-CONTEXT). The signal
  is post-hoc, fed to the metrics recipe in
  [`docs/knowledge/tech-lead-orchestrator.md`](../../../docs/knowledge/tech-lead-orchestrator.md)
  and surfaced by `/after-task-dantotsus`.

## Human-message classification

When the human re-engages mid-run, classify before continuing:

- `guidance` — direction-shaping. Welcome.
- `answer` — response to an `AskUserQuestion`. Welcome.
- `correction` — the human had to correct the AI on something the AI
  should have known. This is the only category that counts toward
  `human_corrections_per_run` and feeds Dantotsu candidates.

The orchestrator appends a `human_message_received` event with the
chosen `category` to `journal.md.jsonl`. No hook (decision Q-HUMAN-MSG).

## Visual-validation skip

A feature with no UI surface skips `/visual-validation` silently
(decision Q-VIS-VAL). The orchestrator appends a
`visual_validation_skipped` event with a `reason` (e.g.
`"no-ui-surface: skill-only feature"`) and proceeds with only
`/technical-validation`'s verdict.

## Journal event schema

`runs/<run-id>/journal.md.jsonl` contains one JSON object per line.
Every line carries `kind`, `runId`, and `at` (ISO timestamp). The
kinds and their extra fields:

| `kind` | Extra fields |
|---|---|
| `run_started` | `app`, `slug` |
| `stage_changed` | `from`, `to` |
| `adr_written` | `number`, `trigger` (one of the 4 trigger names) |
| `escalation` | `reason`, `stage`, `retries` |
| `human_message_received` | `category` ∈ {`guidance`, `correction`, `answer`} |
| `context_growth` | `bytes` (the milestone value crossed) |
| `visual_validation_skipped` | `reason` |
| `run_completed` | `finalStage` |

Aggregation recipes live in
[`docs/knowledge/tech-lead-orchestrator.md`](../../../docs/knowledge/tech-lead-orchestrator.md).

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

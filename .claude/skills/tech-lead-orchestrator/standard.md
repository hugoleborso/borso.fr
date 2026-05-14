# tech-lead-orchestrator standard

The contract this skill is held to. `/technical-validation` reads this when
reviewing a tech-lead-orchestrator change.

## Stage diagram

The 8 stages are: `spec`, `adrs`, `plan`, `implement`, `validate`,
`arbitrate`, `ship`, `escalated`. **ADRs come before the plan** — they
constrain it. Transitions:

| From | To | When |
|---|---|---|
| spec | adrs | `spec.md` present (or `/specification` returns `done`). Spec checksum recorded. Spec carries enough tech surface (Q.O.D. + Changes / Types) to surface architectural choices. |
| adrs | plan | Every ADR-qualifying candidate from the spec has been ratified by the human (tech-lead validation via `AskUserQuestion`) and the confirmed ones have been written via `/adr-writer`. ADR numbers are in `state.adrIndex`. If no candidates, transition immediately. |
| plan | implement | `/technical-conception` returns `done` with `plan.md` next to spec. The plan references every ADR in `state.adrIndex`. |
| implement | validate | `/implementation` returns `done` with a `next: { kind: 'validate' }` hint. |
| validate | arbitrate | At least one validator returned a verdict. |
| arbitrate | implement | `verdictKind` maps to action `fix`. `retries.implement++`. |
| arbitrate | plan | `verdictKind` maps to action `replan`. Scope flagged in the replan verdict. |
| arbitrate | escalated | `verdictKind` maps to action `escalate`. Terminal. |
| arbitrate | ship | All verdicts PASS. |
| ship | (end) | Push successful, deploy reminder issued, **PR description updated to reflect what the run actually shipped** (see *PR description maintenance* below). |

The spec is the source of truth for ADR-qualifying choices. If the
spec is thin on tech surface — no Q.O.D., no Types section, no
architectural decisions visible — the orchestrator escalates back to
`/specification` (reason: `spec-thin-on-tech-surface`) rather than
guessing the choices itself. ADRs derived from invented decisions
poison the audit trail.

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
`true`. Detection is fuzzy — the orchestrator (the LLM) reads the
spec's Q.O.D. + Changes / Types sections and judges each candidate:

1. **multiple-alternatives** — ≥ 2 serious paths were considered.
2. **cross-cutting** — touches ≥ 2 apps or ≥ 2 modules.
3. **diverges-from-convention** — contradicts CLAUDE.md, an existing ADR,
   or a `docs/knowledge/` entry.
4. **looks-standard** — industry-standard pattern or already solved in
   another repo. The ADR records reuse vs. reinvent.

If none of the four fires for a candidate, no ADR — that's the gate
against ADR spam.

### Tech-lead validation (human in the loop)

The orchestrator's judgment on which candidates qualify is a **draft**.
Before invoking `/adr-writer`, surface the candidate list to Hugo via
`AskUserQuestion`, one question per candidate, with options:

- *Write ADR (Recommended)* — confirm, proceed to `/adr-writer`.
- *Skip — not really architectural* — drop the candidate, no ADR.
- *Merge with ADR &lt;NNNN&gt;* — fold into an existing ADR (the
  orchestrator records the link, no new ADR written).

The human's answers are `guidance` / `answer` messages, not
`corrections` — confirming a draft list is productive engagement, not
a defect signal. Append one `human_message_received` event per
answer with the appropriate category.

If Hugo declines every candidate, the orchestrator transitions
`adrs → plan` with `state.adrIndex = []`. That's a valid outcome — not
every feature has an ADR-qualifying choice.

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

## PR description maintenance (stage `ship`)

If the run is happening on a branch with an **open PR**, the orchestrator
updates the PR title + body as part of the `ship` stage — before issuing
the deploy reminder. PR descriptions are the reader's window into a
merged PR; they go stale instantly when the work scope evolves
mid-branch (a `feat(meta): seed X` PR that quietly grew a full feature
redesign + two ADRs + a dantotsu reads like the wrong PR if its body
still says "seed X").

Check `mcp__github__list_pull_requests state=open` for a PR whose
`head.ref` matches the current branch. If one exists:

1. **Title** — rewrite to reflect what now lands. Conventional-commit
   format with the dominant scope (`feat(borso-fr): galaxy WebGL apex
   landing + dantotsu sweep`, not the original scope-of-day).
2. **Body** — at minimum these sections, in order:
   - `## Summary` — one paragraph + 3–5 bullets naming what the PR ships
     vs. what it was originally intended to ship. Reference ADRs by
     number.
   - `## Validation gaps` — every `PASS_EXCEPT_UNVERIFIABLE` row from
     the validators, named verbatim. Missing = the reader can't tell
     whether the gate passed cleanly or with caveats.
   - `## Visual evidence` — for UI work, SHA-pinned raw URLs to the
     screenshots committed under
     `docs/features/<app>/<slug>/validation/visual-validation-<ts>/`.
     Pin to `head.sha` of the PR, not `main` (the latter changes when
     the PR merges).
   - `## Test plan` — checklist of manual checks the user runs on the
     preview before merging.

If no PR is open, skip — the orchestrator never opens PRs on its own
unless the user explicitly asks. The deploy reminder still fires.

Rung-2 eradication of `docs/dantotsus/orchestrator-shipped-with-stale-pr-description.md`.

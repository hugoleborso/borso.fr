# tech-lead-orchestrator standard

The reference [`SKILL.md`](./SKILL.md) walks through. `/technical-validation`
reads it when reviewing a tech-lead-orchestrator change.

## Substrate boundary — Skill (chat) vs Workflow (script)

Per [ADR-2026-06-05T2337](../../../docs/adr/2026-06-05T2337-dynamic-workflows-for-orchestration.md),
the pipeline runs on two substrates depending on whether the stage needs
human input:

- **Skill in chat** owns `spec` + `adrs`. Both need the human mid-run, and
  a Workflow cannot pause for that.
- **Dynamic Workflow**, generated per run from `.claude/commands/feature-pipeline.md` (no script is committed under `.claude/workflows/`), owns
  `plan → implement → validate → ship`, dispatched via
  `/feature-pipeline <spec-path>` once the human has ratified the spec
  and all candidate ADRs. It invokes the existing skills as subagents, whose
  standards stay the durable contract.
  A Workflow runs only when the operator opted into one. Without that
  opt-in, the chat session runs the same stages as sequential Agent calls,
  one fresh subagent per stage, and loads the two validation skills itself.
- **Exit-and-resume** is the mid-workflow ADR-trigger handoff: if the
  workflow detects an ADR-qualifying decision during `implement`, it
  exits with `outcome: needs-human-adr-ratification`, the human runs
  `/adr` in chat, then re-launches `/feature-pipeline` — the script
  reads `state.json` and resumes from the stage where it stopped.

The stage diagram below is the union of both substrates. The operator
runbook is
[`docs/knowledge/dynamic-workflow-feature-pipeline.md`](../../../docs/knowledge/dynamic-workflow-feature-pipeline.md).

## Stage diagram

**ADRs come before the plan**, because they constrain it. Transitions:

| From | To | When |
|---|---|---|
| spec | adrs | `spec.md` present (or `/specification` returns `done`). Spec checksum recorded. Spec carries enough tech surface (Q.O.D. + Changes / Types) to surface architectural choices. |
| adrs | plan | Every ADR-qualifying candidate from the spec has been ratified by the human (tech-lead validation via `AskUserQuestion`) and the confirmed ones have been written via `/adr` (piloted mode). ADR numbers are in `state.adrIndex`. If no candidates, transition immediately. |
| plan | implement | `/technical-conception` returns `done` with `plan.md` next to spec. The plan references every ADR in `state.adrIndex`. |
| implement | validate | `/implementation` returns `done` with a `next: { kind: 'validate' }` hint. **The validate stage is never skipped.** A runtime smoke-test (`curl`, "the Lambda boots", "routes return non-5xx") is NOT a substitute for `/technical-validation` — booting ≠ correct, and the implementer's own `done` is not independent evidence. Dispatch `/technical-validation` on the integrated SHA once implementation is done, and again after the fix round when round 1 had blocking findings: two rounds at most. See [`docs/dantotsus/orchestrator-skipped-validation-between-rounds.md`](../../../docs/dantotsus/orchestrator-skipped-validation-between-rounds.md). |
| validate | arbitrate | At least one validator returned a verdict. |
| arbitrate | implement | `verdictKind` maps to action `fix` and round 2 has not run yet. A fresh implementation agent gets the report path. `retries.implement++`. |
| arbitrate | plan | `verdictKind` maps to action `replan`. Scope flagged in the replan verdict. |
| arbitrate | escalated | `verdictKind` maps to action `escalate`, or blocking findings remain after round 2. Terminal. |
| arbitrate | ship | All verdicts PASS. |
| ship | (end) | Push successful, **PR description updated to reflect what the run actually shipped** (see *PR description maintenance* below). |

## `state.json` schema

```jsonc
{
  "runId": "2026-05-13-1530-abc",         // timestamp + random suffix
  "feature": { "app": "meta", "slug": "tech-lead-orchestrator" },
  "pilotedByTechLead": true,
  "stage": "spec",                         // current stage from the diagram above
  "retries": { "implement": 0, "validate": 0 },
  "adrIndex": ["2026-11-11T1318"],         // ids of ADRs created this run
  "bytesRead": 0,                          // cumulative, for context-growth events
  "specChecksum": null,                    // SHA-256 hex of spec.md once recorded
  "startedAt": "2026-05-13T15:30:00.000Z",
  "updatedAt": "2026-05-13T15:32:00.000Z"
}
```

The orchestrator overwrites `state.json` on every stage transition and
on every retry-counter increment. The file is committed at `ship`.

## Verdict YAML contract

The full contract is [`sub-agent-contract.md`](./sub-agent-contract.md).

- Read **only** the YAML front matter, via `Read` with a `limit:` of about
  15 lines. Absorbing bodies destroys the context budget.
- Never read the markdown body except when the verdict is
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
`true`. Judge each candidate from the spec's Q.O.D. + Changes / Types:

1. **multiple-alternatives** — ≥ 2 serious paths were considered.
2. **cross-cutting** — touches ≥ 2 apps or ≥ 2 modules.
3. **diverges-from-convention** — contradicts CLAUDE.md, an existing ADR,
   or a `docs/knowledge/` entry.
4. **looks-standard** — industry-standard pattern or already solved in
   another repo. The ADR records reuse vs. reinvent.

If none fires, no ADR.

### Tech-lead validation (human in the loop)

The orchestrator's judgment on which candidates qualify is a **draft**.
Writing ADRs unratified pollutes `docs/adr/`. Before invoking `/adr`, ask the
operator with `AskUserQuestion`, one question per candidate, with options:

- *Write ADR (Recommended)* — confirm, proceed to `/adr` (piloted mode).
- *Skip — not really architectural* — drop the candidate, no ADR.
- *Merge with ADR &lt;id&gt;* — fold into an existing ADR (the
  orchestrator records the link, no new ADR written).

The answers are `guidance` / `answer` messages, not `correction`s. Append
one `human_message_received` event per answer. Declining every candidate is
valid, and the run moves to `plan` with `state.adrIndex = []`.

## Retry policy

**Two review rounds at most.** Round 1 reviews the whole branch after the
last slice. When it has blocking findings, one fresh fix agent triages them
(fix, dismiss with a reason, or ask the operator for a product call), and
round 2 reviews only the commits after round 1's `Reviewed:` SHA plus each
round-1 blocking finding. Blocking findings left after round 2 escalate to
the operator with the report. Non-blocking findings never start a round.

Visual validation runs once, after technical validation passes. A visual FAIL
gets one fresh fix agent and one re-run, then escalates.

Escalate immediately, regardless of round, when:

- **product ambiguity** — the FAIL needs a human product decision
  (see *Decision boundary* below), or
- `verdictKind` is `fail-spec` / `crash` (unrecoverable by retry).

| `verdictKind` | Action |
|---|---|
| `pass` | (degenerate — orchestrator should have transitioned to `ship`) |
| `fail-spec` | `escalate` immediately |
| `crash` | `escalate` immediately |
| `fail-plan` | `replan` |
| `fail-local` | `fix` after round 1 / `escalate` after round 2 |

## Decision boundary — what the orchestrator decides vs surfaces

Once the human has ratified the spec, the orchestrator drives to
"PR opens with visual evidence" **without** per-FAIL-row checkpoints.
It does NOT surface execution mechanics (fix ordering, retry vs
escalate, scope of a fix round, partial-deferral arbitration) — deciding
those *is* the job.

It MUST stop and surface — via `AskUserQuestion` — for **product +
ADR-trigger** decisions, which are the human's:

- a new third-party dependency or external service;
- secret / credential management (new repo secret, new env var holding a secret);
- a new obligation to a third party visible in prod (attribution link, telemetry);
- schema columns or data model motivated by an external service;
- any feature scope **beyond the ratified spec** — a casual wish in
  chat ("would be cool if…") is *not* a ratification.

Matching any of the four ADR triggers (above) is a mandatory
stop-and-surface regardless of orchestrator confidence. The two failure
modes this guards against — too-timid (surfacing mechanics) and
over-eager (deciding product) — both bit run `2026-05-19-1937-pragma`;
see [`docs/dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md`](../../../docs/dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md).

## Sub-agent dispatch hygiene

- **The orchestrator does not read code.** It reads verdict front-matter
  and dispatches. Each phase, slice and fix round is a fresh agent; never
  resume an earlier one. Every brief is consolidated: the original goal,
  the spec and plan paths, every later operator directive, the previous
  report path, and the branch.
- **The implementer names its shape before code:** the goal restated, the
  smallest change that meets it, and the data shape with its organising
  structure (state machine, table, typed model).
- **Implementation dispatches pass `model: 'opus'` explicitly** — never
  rely on an implicit "inherits from parent" default for the
  highest-capability stage.
- **Rounds ≥ ~4 commits or ~20 files default to `isolation: "worktree"`**
  (verify with `git worktree list` right after dispatch; if the flag was
  dropped, fall back to one round at a time).
- **Dispatch briefs name both halves of the gate**, oxlint *and*
  `oxfmt --check`. Every round passes the check its brief named.

Full rationale: [`docs/knowledge/orchestrator-dispatch-hygiene.md`](../../../docs/knowledge/orchestrator-dispatch-hygiene.md).

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

The orchestrator's own context is the failure mode of failure modes, because
it sees every artefact and retry. It reads no code, diffs or report bodies,
and reads a plan in full only to arbitrate `fail-plan`.

- Track `state.bytesRead` cumulatively (lines read × about 120 bytes, or
  `wc -c`).
- At each log-scale milestone crossed (1 / 2 / 4 / 8 / 16 / … KiB), append a
  `context_growth` event with the milestone value.
- The cap is **deliberately absent** (decision Q-CONTEXT). The signal is
  post-hoc, for the metrics recipe in
  [`docs/knowledge/tech-lead-orchestrator.md`](../../../docs/knowledge/tech-lead-orchestrator.md).

## Human-message classification

When the human re-engages mid-run, classify before continuing:

- `guidance` — direction-shaping. Welcome.
- `answer` — response to an `AskUserQuestion`. Welcome.
- `correction` — the human had to correct the AI on something the AI
  should have known. This is the only category that counts toward
  `human_corrections_per_run` and feeds Dantotsu candidates.

The orchestrator appends a `human_message_received` event with the
chosen `category` to `journal.md.jsonl`. No hook (decision Q-HUMAN-MSG).

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

The orchestrator only appends to the journal during a run and never reads it
back. `state.json` is its state, and the metrics are computed after the run.
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
runs/<run-id>/agents/<skill>-<step>.md
runs/<run-id>/errors.log                  (only when something throws)
```

Aborted runs stay in the tree (decision Q-RUN-COMMIT), staged at `ship`.

## PR description maintenance (stage `ship`)

If the branch has an **open PR**, the orchestrator updates its title and
body at `ship`. A body goes stale as soon as the scope grows mid-branch.

Check `mcp__github__list_pull_requests state=open` for a PR whose
`head.ref` matches the current branch. If one exists:

1. **Title** — rewrite to reflect what now lands. Conventional-commit
   format with the dominant scope (`feat(borso-fr): galaxy WebGL apex
   landing + dantotsu sweep`, not the original scope-of-day).
2. **Body** — redraft it through `/open-pr`, whose template and
   `scripts/pr/check-pr-body.ts` are the only place the body's shape is
   written down. Whatever the headings, the rewritten body has to say
   what the PR ships against what it set out to ship, name its ADRs,
   carry every `PASS_EXCEPT_UNVERIFIABLE` row verbatim (a reader who
   cannot see them cannot tell a clean pass from a caveated one), name
   the committed screenshots for UI work, and state what the operator
   checks on the preview before merging.

If no PR is open, skip. The orchestrator opens a PR only when the user asks.

Rung-2 eradication of `docs/dantotsus/orchestrator-shipped-with-stale-pr-description.md`.

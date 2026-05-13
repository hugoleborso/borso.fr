---
name: tech-lead-orchestrator
description: |
  Take a feature description from "I want X" to a pushed PR with spec,
  plan, ADRs, implementation, validation reports, and a commit history
  — without continuous human supervision. Use when the user says
  "/tech-lead-orchestrator <feature>", "be my tech lead for X", "drive
  this feature", "ship X end-to-end". Pipelines `/specification`,
  `/technical-conception`, `/adr-writer`, `/implementation`,
  `/technical-validation`, `/visual-validation` in sequence; arbitrates
  retries (fix → replan → escalate) with a hard cap of 3; emits ADRs
  when a decision matches one of 4 triggers; never mutates `spec.md`
  without explicit human consent. State is persisted to
  `docs/features/<app>/<slug>/runs/<run-id>/` and committed alongside
  the feature. Reads the standard at
  `.claude/skills/tech-lead-orchestrator/standard.md` and the verdict
  contract at `.claude/skills/tech-lead-orchestrator/sub-agent-contract.md`
  before starting.
---

# tech-lead-orchestrator skill

This skill replaces the previous linear auto-chain
(`/specification → /technical-conception → /implementation → /technical-validation →
/visual-validation`) with a single orchestrator that pilots every step,
arbitrates failures, decides when to escalate, and produces ADRs along the way.

**Markdown-driven.** This skill carries no code — the LLM is the runtime.
Every primitive below (parsing verdicts, deciding the next action,
classifying human messages, summing milestones) is described in prose for
the LLM to follow. There is no `package.json`, no test suite — the
artefacts the orchestrator produces (`state.json`, `journal.md.jsonl`,
verdict files) are the only state.

## North star

The human stays in the loop for **direction** (the `/specification` step) and
**hard arbitrage** (escalations). Everything mechanical between those two —
plan, ADRs, implement, validate, retry — runs without continuous supervision.
A run that finishes without escalation is the goal; a run that escalates early
is a signal we don't yet trust the agent on this kind of feature.

## When to invoke

Invoke when:
- The user opens with `/tech-lead-orchestrator "<feature description>"` or
  any of "be my tech lead for X", "drive this feature", "ship X end-to-end".
- A feature is non-trivial (multi-file, has architectural choices, or touches
  more than one workspace).

Do **not** invoke when:
- The work is a one-line fix or a mechanical rename — direct edit.
- The user is mid-discussion on direction and hasn't asked for an end-to-end
  run yet — keep the `/specification` loop alive on its own.

## Operating mode

The orchestrator is a state machine. The state lives at
`docs/features/<app>/<slug>/runs/<run-id>/state.json` and is **committed
with the feature** — every run, including aborted ones, stays in the
PR's history for audit.

```
stage: spec → plan → adrs → implement → validate → arbitrate → ship
                                              ↑          ↓
                                              └──── retry-loop
                                                          ↓
                                                  escalated (terminal)
```

Each transition appends one JSON object per line to
`runs/<run-id>/journal.md.jsonl`. The schema for those events is given in
[`standard.md`](./standard.md) (*Journal event schema*). The orchestrator
never reads back its own journal during a run — it only writes; metrics
are computed post-hoc.

### Stages

1. **spec.** Check whether `docs/features/<app>/<slug>/spec/spec.md` exists.
   - If not: invoke `/specification` via `Skill`. Sub-skill writes the spec
     interactively with the human. Its auto-chain to `/technical-conception`
     is **suppressed** because `runs/<run-id>/state.json#pilotedByTechLead`
     is `true`.
   - If yes: hash the spec content (SHA-256, hex) and store the digest in
     `state.specChecksum`. Continue.
2. **plan.** Invoke `/technical-conception` with the spec path. Sub-skill
   writes `plan.md`. Its auto-chain to `/implementation` is **suppressed**.
3. **adrs.** For each architectural choice surfaced by the plan, evaluate
   the 4 ADR triggers (cf. [`standard.md`](./standard.md#adr-triggers-4-or)).
   If any trigger fires, invoke `/adr-writer` with the candidate's slug
   and the trigger list. Append each new ADR number to `state.adrIndex`.
   Do **not** invoke `/adr-writer` for trivial choices.
4. **implement.** Spawn a sub-agent for `/implementation` with the spec +
   plan paths. The sub-agent writes its verdict YAML to
   `runs/<run-id>/agents/implementation-<step>.md` per
   [`sub-agent-contract.md`](./sub-agent-contract.md). One implementer at
   a time — never parallel.
5. **validate.** Spawn `/technical-validation` and `/visual-validation`
   **in parallel** via two `Agent` tool calls in the same message. Each
   writes its verdict YAML next to the implementation's.
   - If the feature has no UI surface, **skip silently** (decision
     Q-VIS-VAL): append a `visual_validation_skipped` event and proceed
     with only the technical verdict.
6. **arbitrate.** Read only the YAML **front-matter** of each verdict (use
   `Read` with `limit:` to fetch the first ~15 lines). Determine the
   `verdictKind` per the table in
   [`standard.md`](./standard.md#deriving-verdictkind). Take the next
   action per [`standard.md`](./standard.md#retry-policy):
   - `fix` → re-spawn `/implementation` with the verdict context.
     Increment `state.retries.implement`.
   - `replan` → spawn `/technical-conception` scoped to the flagged
     sub-section. Then re-implement.
   - `escalate` → write an escalation message to the terminal, transition
     to `escalated`, stop. **Never edit `spec.md`** — escalation includes
     a proposed change for the human to accept or refuse.
7. **ship.** All verdicts PASS. `git add -A docs/features/<app>/<slug>/runs/`
   (keep aborted runs in history per decision Q-RUN-COMMIT), then commit
   the implementation diff with a `feat(<app>): <feature title>` message,
   push, and remind Hugo to approve the pending prod deploy in GitHub
   Actions.

### Sub-agent contract

Every sub-skill (`/specification`, `/technical-conception`,
`/implementation`, `/technical-validation`, `/visual-validation`,
`/adr-writer`) emits a verdict at end-of-run when piloted by the
tech-lead-orchestrator. The contract is documented in
[`sub-agent-contract.md`](./sub-agent-contract.md). The orchestrator
reads **only** the YAML front-matter (the block between the leading
`---` delimiters) — it does not absorb the full body. The body stays on
disk for post-mortems and Dantotsus.

### Context discipline

The orchestrator's own context is the failure mode of failure modes —
it sees every artefact, every retry, every escalation. To keep it small:

- Read verdict files with `limit:` to fetch only the front-matter (≈ 15
  lines covers `status` / `summary` / `artifacts` / `next`).
- Skim, don't absorb. `Read` a plan in full only when arbitrating a
  `fail-plan` verdict.
- Track cumulative bytes read over the run (the orchestrator estimates
  this from the lines it has read × ~120 bytes/line, or from `wc -c`
  when it explicitly fetches a file). Emit a
  `context_growth` event at each log-scale milestone (1 / 2 / 4 / 8 /
  16 / … KiB). There is **no hard cap** (decision Q-CONTEXT) — the
  signal is post-hoc, fed to the metrics aggregation recipe in
  [`docs/knowledge/tech-lead-orchestrator.md`](../../../docs/knowledge/tech-lead-orchestrator.md)
  and feeds the post-merge `/after-task-dantotsus` kaizen pass.

### Human-message classification

When the human re-engages mid-run, the orchestrator classifies the
message before continuing:

- `guidance` — the human is shaping direction (welcome, fine).
- `answer` — the human is answering an `AskUserQuestion` (welcome).
- `correction` — the human is correcting an AI mistake that the AI
  should have avoided. Appends a `human_message_received` event with
  `category: 'correction'`. This is the signal that feeds the
  `count(human_corrections_per_run)` metric — every correction is a
  Dantotsu candidate.

The classification is best-effort, captured by the orchestrator itself
(no hook) per decision Q-HUMAN-MSG.

### Hooks

If a `pre-commit` or `pre-push` hook fails during `ship`, the orchestrator
reads stderr and treats the failure as a `fail-local` verdict — back to
arbitrate, never `--no-verify` (CLAUDE.md *Hooks* rule).

### Spec immutability

The spec checksum recorded at stage `spec` is the anchor. Before invoking
any subsequent sub-agent, the orchestrator re-reads `spec.md` and
re-hashes it; a mismatch is an immediate escalation (reason:
`spec-mutation-attempted`), no retries. `spec.md` is never edited by any
sub-agent — that's a contract violation surfaced via the journal and the
escalation message.

## Procedure (when invoked)

1. **Read** this SKILL.md, [`standard.md`](./standard.md), and
   [`sub-agent-contract.md`](./sub-agent-contract.md).
2. **Bootstrap state.** Generate `runId` (timestamp-based, e.g.
   `2026-05-13-1530-abc`). Compute the feature's `<app>` and `<slug>`
   from the user's invocation (`<app>` defaults to `meta` for repo-
   internal features). Initialise `state.json` per the schema in
   [`standard.md`](./standard.md#statejson-schema) and write to
   `docs/features/<app>/<slug>/runs/<run-id>/state.json`. Append a
   `run_started` event.
3. **Walk the state machine** per the *Stages* section above. After
   every stage transition, write `state.json`, append a
   `stage_changed` event.
4. **At `ship`:** commit aborted-and-current runs, commit feature diff,
   push.
5. **Append `run_completed`** with the final stage, the ADR count, the
   total retries.
6. **Tell Hugo** to approve the pending prod deploy in GitHub Actions
   (CLAUDE.md *Deployments* rule).

## Failure modes to avoid

- **Walking the chain without state.** Every stage transition must be
  persisted before invoking the next sub-skill. Crashes mid-stage leave
  a paper trail.
- **Absorbing verdict bodies.** Reading the full body of a verdict
  destroys the context budget. Front-matter only.
- **Editing `spec.md` after the run records its checksum.** That's an
  escalation trigger, not a fix attempt.
- **Bypassing the retry-action table.** Don't guess what to do next from
  the verdict body — look up `verdictKind` in
  [`standard.md`](./standard.md#retry-policy) and take the named action.
- **Auto-chaining sub-skills when piloted.** `/specification` and
  `/technical-conception`'s auto-chain blocks **must** check
  `state.json#pilotedByTechLead` and stand down when it's true. The
  orchestrator drives every transition itself.
- **Inventing TS code for the orchestrator.** This skill is markdown-
  driven. If a future change feels like it needs a TS workspace, that's
  a smell — re-read CLAUDE.md *Layout* and reconsider.

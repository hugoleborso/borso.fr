# ADR 0001 — `/tech-lead-orchestrator` replaces the linear skill auto-chain

**Status:** accepted
**Date:** 2026-05-13

## Context

The repo runs an auto-chain of skills: `/specification → /technical-conception
→ /implementation → /technical-validation → /visual-validation`. Each skill
hands off to the next via `Skill` calls inscribed in its SKILL.md.

In practice, the chain works for the *happy path only*. When validation
fails, when the implementer hits an architectural choice it doesn't know
how to make, when the plan has a flaw mid-implementation, when the
implementer asks the human a question that's really an architecture
question — the human has to step in at every transition and steer. The
last non-trivial feature shipped in this repo
(`docs/features/borsouvertures/*`) had Hugo intervening manually on
roughly every transition; two material architectural choices shipped
without an ADR; and the implementer surfaced questions to the human that
were architectural, not product.

The four ADR triggers (multiple serious alternatives, cross-cutting
impact, divergence from convention, looks-standard-or-exists-elsewhere)
applied to the choice itself:

- **Multiple alternatives**: (a) replace the auto-chain with a single
  orchestrator; (b) insert an orchestrator between conception and
  implementation; (c) run an always-on parallel orchestrator agent.
- **Cross-cutting impact**: touches every existing skill
  (`specification`, `technical-conception`, `implementation`,
  `technical-validation`, `visual-validation`), CLAUDE.md, and
  commitlint.
- **Divergence from convention**: changes how skills hand off, which is
  a load-bearing convention of the AI-driven workflow.

All three triggers fire — the ADR is mandatory.

## Decision

Replace the linear auto-chain with `/tech-lead-orchestrator`, a single
skill that pilots every transition: spec → ADRs → plan → implement →
validate → arbitrate → ship. (ADRs come before plan: they constrain
the plan rather than being mined out of it. The orchestrator surfaces
the ADR candidate list to the human for tech-lead ratification before
writing any ADR.)

- The orchestrator suppresses the existing auto-chain in
  `/specification` and `/technical-conception` via a runtime flag
  (`docs/features/<app>/<slug>/runs/<run-id>/state.json#pilotedByTechLead`).
  Stand-alone invocation of the chained skills continues to work
  identically when the flag is absent.
- Sub-skills emit a typed verdict (YAML front-matter in a markdown
  file) at end-of-run. The orchestrator reads only the front-matter,
  never absorbing full bodies, to bound its context.
- Retries are governed by `nextAction(retries, verdictKind, maxRetries)`
  (max 3, env-overridable). A spec-flaw verdict escalates immediately:
  `spec.md` is never edited without explicit human consent.
- A new sub-skill, `/adr-writer`, takes care of writing ADRs when the
  orchestrator detects an ADR-qualifying choice in the plan.

Alternative (b) — insert the orchestrator only between conception and
implementation — was rejected because the failure modes (FAIL verdicts,
arbitration, escalation) span the whole pipeline; an orchestrator that
only covers one transition would re-introduce the manual-supervision
problem at every other boundary.

Alternative (c) — always-on parallel orchestrator — was rejected as
overkill for a solo-dev repo and as architecturally heavier than the
underlying problem: a single orchestrator session per feature gets the
same outcome without a permanent process.

## Consequences

What this makes easier:

- A feature run does not require the human to supervise every transition.
  The human's involvement narrows to *direction* (spec) and *arbitrage*
  (escalations).
- Every architectural choice now has a forcing function for an ADR via
  the four triggers + `/adr-writer`. Traceability stops being optional.
- Sub-skills compose cleanly: each one can be invoked standalone or
  orchestrated, with no behavioural drift.

What this makes harder / what now needs remembering:

- A second auto-chain path exists: orchestrated vs stand-alone. The
  conditional check in `/specification` and `/technical-conception` is
  load-bearing — if a future change drops it, the orchestrator loses
  control over those stages silently.
- The `runs/<run-id>/` folder under `docs/features/<app>/<slug>/` now
  carries committed state.json + journal.md.jsonl. Aborted runs stay in
  the tree (decision Q-RUN-COMMIT) — the PR diff for an
  orchestrated feature is larger than its code diff.
- The orchestrator itself is bootstrapped manually in its inaugural PR
  (this one). Subsequent features should be driven through it, and the
  `/after-task-dantotsus` kaizen sweep is expected to surface its first
  rough edges as Dantotsu candidates.

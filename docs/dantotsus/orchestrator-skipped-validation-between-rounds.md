---
date: 2026-06-05
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#26'
fix-commits: [0618e8b839, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/api-change-needs-validation.core.ts]
tags: [orchestrator, skill, state-machine, technical-validation, self-improvement-loop]
zone: .claude/skills/tech-lead-orchestrator
recurs: [orchestrator-agency-overcorrected-on-product-decisions]
---

# The orchestrator stopped running the gate that catches "verdict says done, code says otherwise"

## User impact

Over rounds 7 to 16 of run `2026-05-19-1937-pragma`, the operator received
rounds reported done whose code said otherwise.

| Round | Verdict claimed | What the code held |
| --- | --- | --- |
| 10 | "SPA fallback in place: YES" | The deployed CloudFront function had no `SPA_APPS`, so deep links answered 404 |
| 13 | "optimistic updates on 3 ops" | `grep onMutate` returned 0 across the 10 query files |
| 15 to 17 | `done` | The setlist deep-link route was never declared, and `biome check` reported 125 diagnostics |

Found by a later catch-up validation, as the first version of this entry
records.

## Causal chain

- Rounds whose code contradicted their verdict reached the operator as done.
  - The orchestrator advanced each round on the implementation sub-agent's
    own verdict and a `curl` smoke test.
    - It did not dispatch `/technical-validation` between rounds 7 and 16,
      although its standard named the stage. At `0618e8b839^`:

      ```text
      | implement | validate | `/implementation` returns `done` with a `next: { kind: 'validate' }` hint. |
      ```

      - A smoke test that showed the Lambda booting and routes answering
        non-5xx stood in for the review. Ten rounds deep in one run, the
        cheaper check won over the stage the standard named (Man).

## Root cause of occurrence

*Thought a green smoke test gates a round, actually booting is not doing what
the brief claimed, and the implementer's own `done` is not evidence.* (Man)

The orchestrator is an agent, and the standard naming the validate stage was
in its context. The prior that a cheap runtime check is enough won over it,
inside one long run of more than sixteen rounds (inferred: the worker's state
is not recorded). Under the standard's agentic 4M rule, the fix is a gate that
holds when the prior wins, not one more sentence.

## Detection failure causes

- **CI:** the false claims passed typecheck, lint and tests. Code without
  `onMutate` still compiles and works slowly, and a missing route still
  builds.
- **Review:** the orchestrator was the reviewer, and it took the sub-agent's
  verdict as written.
- **Gates:** at the time, nothing refused a pull request whose branch carried
  no validation report. The isolated reviewer existed and nothing required it
  to run.

## Countermeasure

Commit `0618e8b839` made the `implement → validate` row say "The validate
stage is never skipped", and named a runtime smoke test as no substitute. A
catch-up `/technical-validation` then ran and found the three gaps above.

## Eradication

**Type:** DevX check (level 2).

**Reference:** `scripts/hooks/checks/api-change-needs-validation.core.ts`,
registered in `scripts/hooks/hook-events.ts`, holds today (last changed in
commit `458e886c4`). It runs before `gh pr create` and
`mcp__github__create_pull_request`. It refuses a branch that changes code
under `apps/*/api/` without a committed
`docs/features/<app>/<slug>/validation/technical-validation-*.md`, and one that
changes code under `apps/*/site/` without a `visual-validation-*.md`:

```ts
if (apiFiles.length > 0 && !changed.some((path) => TECHNICAL_REPORT.test(path))) {
  return refuse('api-validation', 'opened a pull request changing an API without a technical-validation report', …);
}
```

The orchestrator's own rule stays as prose in
`.claude/skills/tech-lead-orchestrator/standard.md`. The hook holds whether or
not the orchestrator follows it.

The gap: the hook checks that a report exists, not that it reviewed the head.
A report from round 1, followed by more commits under `apps/`, passes.

**Proof it can fail:** `scripts/hooks/checks/api-change-needs-validation.core.test.ts`
plants a branch changing `apps/*/api/` with no report and expects the refusal.

**Proposed:** extend the same check to read the committed report's
`Reviewed: <sha>` line, which `.claude/agents/technical-validator.md` makes
every report carry, and refuse when `git diff --name-only <sha>..<head>` lists
code under `apps/`. A stale report could then not pass for a validated head.

**Similar instances:** [`orchestrator-shipped-with-stale-pr-description.md`](./orchestrator-shipped-with-stale-pr-description.md)
is the same shape on another artefact: written once, then not checked against
the head that ships.

---
date: 2026-11-03
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#249'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-adr-criteria.sh, .husky/pre-commit, .claude/skills/adr/template.md]
time-to-detect: hours
tags: [adr, harness, gates, pre-commit]
zone: .claude/skills/adr/template.md
recurs: [an-adr-that-never-listed-doing-nothing]
---

# An ADR that picked its own criteria

## User impact

The operator asked for a component library. The kaizen of PRs #246 and
#247 answered with ADR-2026-11-03T1438. The operator read it and wrote back
that its template does not list the criteria. They named the two that
mattered: does it change the app, and how much of it the library covers.

| | Seen | Expected |
| --- | --- | --- |
| The ADR's criteria | Four, all chosen by the author, in a rubric placed after the options | The operator's criteria first, before any option |
| Coverage | Not measured | Each of pragma's 16 primitives looked up in each library |
| Changes for users | Not asked | Renders beside pragma's current screens |

## Causal chain

- The ADR scored the libraries on four criteria the operator never named.
  - The agent wrote the criteria itself, in an *Evaluation rubric* placed
    after the options.
    - It wrote the ADR straight to the file in template order, without calling
      `/adr`, whose round 2 asks the operator for criteria before any option.
      The template it filled then read:

      ```markdown
      ## Context
      ## Decision
      ## Consequences
      ## Alternatives considered
      ## Evaluation rubric   <!-- ❌ criteria last, with no column for who raised them -->
      ```

      - CLAUDE.md, loaded in every session, said *"Write ADRs with `/adr`"*.
        The kaizen session of PRs #246 and #247 had it in context and wrote
        the file directly (Man).
        - The template, the one file the agent did open, carried neither the
          order nor the operator's part. A file written in its order reads the
          choice before the criteria (Machine).

## Root cause of occurrence

*The agent thought filling the template was writing the ADR, actually the
template only holds the answers to a conversation with the operator, and
nothing in it showed which answers came from him.* (Man)

The rule was in the agent's context: CLAUDE.md names `/adr`, and the skill's
round 2 is titled *"Define criteria *before* options"*. The prior of filling a
template top to bottom won. Under the agentic 4M rule, the fix is a gate that
holds when that prior wins, and a template whose order is the rule.

## Detection failure causes

- **Pre-commit:** `check-adr-numbers-resolve.sh` read ids, headings and index
  rows only. No gate read an ADR's sections.
- **Review:** the ADR's shape is not in the standards a code reviewer reads.
  The operator caught it on the first read.

## Countermeasure

The ADR was rewritten with the operator's two criteria first, and measured.
Coverage was counted from each package's exports, and renders of the 59 docs
demos sit beside pragma's own 16 screens in the gallery.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `e523fbe2d` (#249), still in force.

```diff
+## Criteria
+
+| Criterion | Raised by | Weight | Why it matters | How it is measured |
```

`.claude/skills/adr/template.md` now opens with `## Criteria` before
`## Decision`, and each row says who raised it. `scripts/check-adr-criteria.sh`
runs in `.husky/pre-commit` on any `docs/adr/` change (`run_check adr-criteria`).
It refuses an ADR from `2026-11-03T1438` on with no criteria section before the
decision, no *Raised by* column, or no row raised by the operator.

**Proof it can fail:** it refused the first version of the ADR (measured,
2026-11-03):

```
[check-adr-criteria] docs/adr/2026-11-03T1438-pragma-interactive-primitives-come-from-react-aria-components.md: no ## Criteria section before ## Decision
```

**The gap that holds:** *Raised by* is written by the author. An agent that
skips the operator can still type `operator` in that column, and the gate
passes.

**Proposed:** since 2026-11-15 (`c5c3c2e54`, #357), `.claude/skills/adr/SKILL.md`
titles Mode B *"Piloted by `/tech-lead-orchestrator` or by a session that
already chose"*. That sanctions the path this defect took: a session that has
decided writes the file without round 2. Delete *"or by a session that already
chose"* and let Mode B take `criteria[]` only from the orchestrator, whose
criteria the operator ratified in the spec. A session that decided alone then
has one way in, the walk, where the operator names the criteria. The do-nothing
rule of
[`an-adr-that-never-listed-doing-nothing`](./an-adr-that-never-listed-doing-nothing.md)
belongs in the same `check-adr-criteria.sh`.

**Similar instances:** `grep -n "Raised by" docs/adr/*.md` lists every ADR the
gate reads. `scripts/check-adr-criteria.sh` passes on the tree today, so each
names at least one operator row.

---
date: 2026-11-03
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#249'
fix-pr: '#249'
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
#247 answered with ADR-202611031438. The operator read it and wrote back
that its template does not list the criteria. They named the two that
mattered: does it change the app, and how much of it the library covers.

| | Seen | Expected |
| --- | --- | --- |
| The ADR's criteria | Four, all chosen by the author, in a rubric placed after the options | The operator's criteria first, before any option |
| Coverage | Not measured | Each of pragma's 16 primitives looked up in each library |
| Changes for users | Not asked | Renders beside pragma's current screens |

## Causal chain

- The ADR scored the libraries on criteria the operator never named
  - The ADR was written straight to the file, without `/adr`, whose
    round 2 asks the operator for criteria before any option
  - The template put *Evaluation rubric* after *Alternatives considered*,
    with no column for who raised a criterion, so a file written in
    template order reads the choice before it reads the criteria
  - No gate read the file's shape

## Root cause of occurrence

*Thought filling the template was writing the ADR, actually the template
only holds the answers to a conversation with the operator, and nothing
showed which answers came from them.*

CLAUDE.md says "Write ADRs with `/adr`". The skill's round 2 says "Define
criteria before options". The template carried neither rule.

## Detection failure causes

- **Pre-commit:** `check-adr-numbers-resolve.sh` checks numbers only.
- **Review:** the operator caught it on the first read.

## Countermeasure

The ADR was rewritten with the operator's two criteria first and measured.
Coverage was counted from each package's exports, and renders of the 59
docs demos sit beside pragma's own 16 screens in the gallery.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `[self]` on PR #249

```diff
+## Criteria
+
+| Criterion | Raised by | Weight | Why it matters | How it is measured |
```

The template now opens with `## Criteria` before `## Decision`, and each row
says who raised it. `scripts/check-adr-criteria.sh` runs in pre-commit on
any `docs/adr/` change. It refuses an ADR from 202611031438 on with no
criteria section before the decision, no *Raised by* column, or no row
raised by the operator. It refused the first version of the ADR (measured,
2026-11-03):

```
[check-adr-criteria] docs/adr/202611031438-pragma-interactive-primitives-come-from-react-aria-components.md: no ## Criteria section before ## Decision
```

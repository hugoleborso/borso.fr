# Architecture Decision Records (ADR)

The audit trail of *why the code looks the way it does*. Each ADR pins a
single non-trivial design choice: what we picked, what we considered,
what the criteria were, and what it costs us.

ADRs sit between the spec ("what we want") and the plan's `How each
decision becomes code` table ("where it lands"). A plan row that says
"we chose X instead of Y because Z" deserves an ADR — the alternatives
+ criteria + justification go here, not in a commit message or a code
comment that rots.

Conventions live in [`.claude/skills/adr/standard.md`](../../.claude/skills/adr/standard.md).
Drafting is `/adr` (see [`.claude/skills/adr/SKILL.md`](../../.claude/skills/adr/SKILL.md)).

## Status lifecycle

- **proposed** — drafted, not yet shipped. Default on creation.
- **accepted** — merged into main. Stamped by `/after-task-dantotsus`.
- **superseded by ADR-XXXX** — replaced. Forward link mandatory; old
  file stays for audit.
- **deprecated** — surrounding system is gone; preserved as historical.

ADRs are append-only. Numbers are never recycled, even after supersession.

## When to write one

Yes:
- A trade-off with at least two viable options.
- A choice driven by a constraint that future readers will not
  immediately understand from the code.
- A `/technical-conception` plan row whose decision deviates from the
  default repo conventions.

No:
- Reversible-at-zero-cost choices (renaming, formatting).
- Reasoning already captured verbatim in `CLAUDE.md` or a
  `docs/knowledge/` entry. Cross-link instead.

## Index

<!-- New entries go under the right heading. If no heading fits, add
     one. Manually curated — `/adr` never reorders. -->

### Data layer

_(no entries yet — first ADR lands when `/adr` first runs)_

### App architecture

_(no entries yet)_

### CDK / infra

_(no entries yet)_

### Observability

_(no entries yet)_

### Tooling / DevX

_(no entries yet)_

## How `/open-pr` uses ADRs

The PR description's `## Architecture choices` section embeds each ADR
referenced in the diff. The ADR's *Decision* paragraph sits at level 1
(always visible); its *Alternatives considered* + *Evaluation rubric*
sit at level 2 (`<details>`); its *Implementation pointers* sit at
level 3 (nested `<details>`). The skill at
[`.claude/skills/open-pr/SKILL.md`](../../.claude/skills/open-pr/SKILL.md) carries the
exact mapping.

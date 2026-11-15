# Architecture Decision Records (ADR)

The audit trail of *why the code looks the way it does*. Each ADR pins a
single non-trivial design choice: what we picked, what we considered,
what the criteria were, and what it costs us.

ADRs sit between the spec ("what we want") and the plan's `How each
decision becomes code` table ("where it lands"). A plan row that says
"we chose X instead of Y because Z" deserves an ADR. The alternatives
+ criteria + justification go here, not in a commit message or a code
comment that rots.

Conventions live in [`.claude/skills/adr/standard.md`](../../.claude/skills/adr/standard.md).
Drafting is `/adr`. The skill has two entry modes (see
[`.claude/skills/adr/SKILL.md`](../../.claude/skills/adr/SKILL.md)):
the interactive decision-support walk when a human invokes it, or a
piloted mode that takes a pre-built payload when
`/tech-lead-orchestrator` calls it.

## Status lifecycle

- **proposed**. drafted, not yet shipped. Default on creation.
- **accepted**. merged into main. Stamped by `/after-task-kaizen`.
- **superseded by ADR-<id>**. replaced. Forward link mandatory; old
  file stays for audit.
- **deprecated**. surrounding system is gone; preserved as historical.

ADRs are append-only. Ids are never recycled, even after supersession.

A new record is named after the UTC minute it was written,
`YYYY-MM-DDTHHMM-<slug>.md`, for example `2026-11-11T1318`, so
branches open at the same time never take the same id. The records
written before that change were numbered `0001` to `0052`; they were
renamed to the UTC minute of the commit that added them, keeping the date
their header states.

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

## Finding a record

This folder keeps no list of its records. A list kept by hand went stale,
and every pull request that added or accepted a record edited the same table.
Each record carries its own title and status in its first lines:

- `grep -l <word> docs/adr/*.md` finds the records about a subject.
- `grep -H '^# ADR-' docs/adr/2*.md` prints every record's id and title, oldest first.
- `grep -l 'Status:\*\* proposed' docs/adr/*.md` lists the records not yet accepted.

## How `/open-pr` uses ADRs

The PR description's `## Architecture choices` section embeds each ADR
referenced in the diff. The ADR's *Decision* paragraph sits at level 1
(always visible); its *Alternatives considered* + *Evaluation rubric*
sit at level 2 (`<details>`); its *Implementation pointers* sit at
level 3 (nested `<details>`). The skill at
[`.claude/skills/open-pr/SKILL.md`](../../.claude/skills/open-pr/SKILL.md) carries the
exact mapping.

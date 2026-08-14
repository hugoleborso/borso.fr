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
Drafting is `/adr` — the skill has two entry modes (see
[`.claude/skills/adr/SKILL.md`](../../.claude/skills/adr/SKILL.md)):
the interactive decision-support walk when a human invokes it, or a
piloted mode that takes a pre-built payload when
`/tech-lead-orchestrator` calls it.

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
     one. Manually curated — `/adr` never reorders existing entries. -->

| # | Title | Status | Date |
|---|---|---|---|
| [0001](./0001-tech-lead-orchestrator-replaces-auto-chain.md) | `/tech-lead-orchestrator` replaces the linear skill auto-chain | accepted | 2026-05-13 |
| [0002](./0002-vendor-react-bits-galaxy-shader.md) | Vendor the react-bits Galaxy WebGL shader instead of installing it | superseded by [0003](./0003-react-bits-galaxy-as-react-component.md) | 2026-05-14 |
| [0003](./0003-react-bits-galaxy-as-react-component.md) | Mount the react-bits Galaxy as a React component on top of `ogl` | accepted | 2026-05-14 |
| [0004](./0004-pragma-shared-password-auth.md) | Shared-password auth for the pragma band ERP | proposed | 2026-05-19 |
| [0005](./0005-dynamic-workflows-for-orchestration.md) | Dynamic Workflows for the tech-lead orchestration pipeline | accepted | 2026-06-05 |
| [0006](./0006-cascade-on-delete-via-json-blob-scrub.md) | Cascade-on-delete via JSON-blob scrub (DSQL no-FK substitute) | accepted | 2026-06-06 |
| [0007](./0007-eslint-with-type-aware-rules-replaces-biome.md) | ESLint with type-aware rules replaces Biome | accepted | 2026-08-08 |
| [0008](./0008-purity-enforced-structurally.md) | Purity is enforced by file location, not by review | accepted | 2026-08-08 |
| [0009](./0009-pragma-previews-clone-production.md) | pragma previews clone production, credentials included | accepted | 2026-08-09 |
| [0010](./0010-pragma-domain-folder-for-cross-boundary-rules.md) | A `domain/` folder for the rules pragma's two sides share | proposed | 2026-08-13 |

### Data layer

- 0006 — cascade-on-delete via JSON-blob scrub, the substitute for foreign keys DSQL does not enforce.
- 0009 — pragma previews clone production, credentials included.

### App architecture

- 0002, 0003 — react-bits Galaxy integration (see table above).
- 0004 — shared-password auth for the pragma band ERP (5 trusted members, daily-use tool, friction dominates over attribution).
- 0010 — a `domain/` folder for the pure rules pragma's front end and back end both read, admitted only with a caller on each side.

### CDK / infra

_(no entries yet)_

### Observability

_(no entries yet)_

### Tooling / DevX

- 0001 — `/tech-lead-orchestrator` replaces the linear skill auto-chain.
- 0005 — Dynamic Workflows as the orchestration substrate (supersedes 0001's runtime, not its intent).
- 0007 — ESLint with type-aware rules replaces Biome; the cost is a 23× slower cold lint, the benefit is every rule the standards name.
- 0008 — purity enforced by file location through three custom rules, with "condition" narrowed to mean a decision.

## How `/open-pr` uses ADRs

The PR description's `## Architecture choices` section embeds each ADR
referenced in the diff. The ADR's *Decision* paragraph sits at level 1
(always visible); its *Alternatives considered* + *Evaluation rubric*
sit at level 2 (`<details>`); its *Implementation pointers* sit at
level 3 (nested `<details>`). The skill at
[`.claude/skills/open-pr/SKILL.md`](../../.claude/skills/open-pr/SKILL.md) carries the
exact mapping.

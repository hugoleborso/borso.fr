# ADR standard

The canonical shape of an Architecture Decision Record in this repo.

## File layout

```
docs/adr/
├── README.md                 ← index, grouped by area
├── 0001-pnpm-workspaces.md
├── 0002-aurora-dsql-over-rds.md
└── ...
```

Numbering is monotonically increasing, zero-padded to 4 digits, never recycled — superseded ADRs keep their number forever.

## Mandatory sections

The template at [`template.md`](./template.md) enforces this. Every ADR carries the following sections, in this order:

### 1. Header block

```yaml
- **Status:** proposed | accepted | superseded by ADR-XXXX | deprecated
- **Date:** YYYY-MM-DD            # creation date, never updated
- **Deciders:** name(s)
- **Tags:** comma, separated
```

Status transitions:
- `proposed` → drafted but not shipped. Default on first commit.
- `accepted` → shipped. `/after-task-dantotsus` stamps this on merge.
- `superseded by ADR-XXXX` → replaced. Forward link mandatory. Old file stays.
- `deprecated` → the surrounding system is gone; the ADR is historical.

### 2. Context

What problem is being solved, what observable forces are pushing on it, what constraints close some doors before the trade-off begins. 3–8 sentences. Concrete enough that someone unfamiliar with the area can read the rest.

### 3. Decision

**One paragraph.** The chosen option named, with the one-line "why this over the rest" summary. Detail lives in the *Alternatives* + *Evaluation rubric* sections — don't repeat it here.

### 4. Consequences

Three bullets, minimum:
- `+` what we get
- `-` what we give up
- `~` what changes shape (neutral implications, e.g. "the test harness now needs Docker locally")

If there's no `-` bullet, the *Alternatives considered* section was too lazy — every real choice closes a door.

### 5. Alternatives considered

One sub-section per option, in evaluation order. **The chosen option is listed first, marked `(chosen)`.** Other options are marked `(rejected)` and carry the rejection rationale.

Each sub-section:
```markdown
### Option X — <short name> (chosen | rejected)

- **Summary:** one paragraph describing the option.
- **Strengths:** bullet list, anchored to a criterion.
- **Costs:** bullet list with a concrete unit (dollars, hours, MB, vendor-lock, RFC link).
- **Rationale:** one paragraph explaining why this option won (or didn't).
```

Minimum two alternatives. An ADR with only the chosen option is a one-liner — push it back to `docs/knowledge/` or a code comment.

### 6. Evaluation rubric

A table mapping each criterion to a weight and a justification.

```markdown
| Criterion | Weight | Why it matters |
|---|---|---|
| Operational cost ($/month at PR scale) | high | The race runs once a year; idle cost dominates. |
| Time-to-recovery on failure | medium | DSQL is regional only — outages are rare but long. |
| Schema-tooling familiarity | low | The author already drives drizzle daily. |
```

Then a comparison matrix:

```markdown
|              | Option A    | Option B   | Option C  |
|---|---|---|---|
| Operational cost | ✓ <30 USD | ✗ 150 USD | ✓ <30 USD |
| Time-to-recovery | ✓ vendor-managed | ✗ on-call | ✓ vendor-managed |
| Schema tooling   | ✓ drizzle | ✓ drizzle | ✗ custom |
```

Use `✓ <justification>` / `✗ <justification>` — not 1–5 scales, not stars. The audit value is the justification, not the score.

### 7. Implementation pointers

Backlinks to the artefacts that operationalise the decision:

```markdown
- Spec: docs/features/<app>/<slug>/spec/spec.md#decision-anchor
- Plan: docs/features/<app>/<slug>/plan/plan.md (row "<...>")
- Commit: <sha>
- Files: apps/<x>/<file>:<line>
- Related ADRs: ADR-0001, ADR-0017
```

### 8. Revisions (optional)

When the implementation drifts from the ADR or new evidence changes the trade-off, append a dated revision block. Don't rewrite history.

```markdown
### Revision 2026-09-19 — <reason>

What changed: ...
Why: ...
Implication for the original decision: still valid / re-evaluate / supersede with ADR-NNNN
```

## Cross-linking rules

- **From `plan.md`** — every "How each decision becomes code" row whose decision has an ADR points at it: `→ see [ADR-NNNN](../../adr/NNNN-slug.md)`.
- **From `spec.md`** — usually not; specs describe *what*, ADRs describe *why we built it this way*. Exception: when the spec calls out a constraint that comes from an ADR (e.g. "see ADR-0007 for the DSQL trade-off").
- **From `docs/dantotsus/`** — the *Eradication* section links the ADR if the eradication is "we picked structure A over structure B".
- **From code** — only when the *why* is non-obvious at the call site. ADR references in code are JSDoc-tagged: `@see {@link ../../docs/adr/0042-...}`. Keep these rare — comments rot faster than the ADR they point at.

## When to supersede

A new ADR supersedes an old one when:
- The evidence behind the original criteria changed (vendor pricing, library API, performance numbers).
- The system grew a constraint the original ADR didn't model.
- A different option won, on the same problem, with the same criteria.

The new ADR's header carries `**Supersedes:** ADR-XXXX`. The old ADR's header is updated to `**Status:** superseded by ADR-NNNN`. Both files remain in `docs/adr/`.

## When not to supersede

- The original ADR had a typo. Edit it.
- The criteria weights shifted but the chosen option is unchanged. Add a *Revision* block.
- The implementation deviated. Add a *Revision* block explaining the drift.

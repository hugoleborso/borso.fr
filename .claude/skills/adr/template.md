# ADR template

The skill emits one ADR per `/adr` invocation, written to
`docs/adr/<NNNN>-<kebab-slug>.md` using the layout below. The standard at
[`standard.md`](./standard.md) explains *why* each section is mandatory; this
template gives the *what*.

Placeholders are `{{double-braces}}`. Substitute everything; leave a section
empty only if the standard explicitly says it's optional (only *Revisions*
qualifies).

---

```markdown
# ADR-{{NNNN}}: {{short title — chosen path, not the question}}

- **Status:** proposed
- **Date:** {{YYYY-MM-DD}}
- **Deciders:** {{operator name(s)}}
- **Tags:** {{feature-slug}}, {{area: cdk | data | observability | ...}}

## Context

{{3–8 sentences. The problem, the observable forces, the constraints that
close some doors before the trade-off begins. Cite docs/spec.md and
plan.md if the ADR was triggered by a planning row. No solution
language in this section — just the question.}}

## Decision

**{{Chosen option name}}.** {{One paragraph. The chosen option's
essence + the one-line "why this over the rest" summary. Detail lives
below.}}

## Consequences

- `+` {{positive consequence 1, concrete}}
- `+` {{positive consequence 2}}
- `-` {{cost / closed door 1}}
- `-` {{cost / closed door 2}}
- `~` {{neutral implication: tooling, ops, audit}}

## Alternatives considered

### Option A — {{name}} (chosen)

- **Summary:** {{one paragraph}}
- **Strengths:**
  - {{strength tied to criterion 1}}
  - {{strength tied to criterion 2}}
- **Costs:**
  - {{cost in concrete unit — $/month, hours, MB, vendor-lock}}
- **Rationale:** {{why this wins under the stated weights}}

### Option B — {{name}} (rejected)

- **Summary:** {{one paragraph}}
- **Strengths:** {{...}}
- **Costs:** {{...}}
- **Rejection rationale:** {{the criterion this option loses on +
  whether shifting the weights would flip the decision}}

### Option C — {{name}} (rejected)

- **Summary:** {{...}}
- **Strengths:** {{...}}
- **Costs:** {{...}}
- **Rejection rationale:** {{...}}

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| {{criterion 1}} | high \| medium \| low | {{one-line tie to the spec, the
operational reality, or a prior ADR / Dantotsu}} |
| {{criterion 2}} | high \| medium \| low | {{...}} |
| {{criterion 3}} | high \| medium \| low | {{...}} |

|             | Option A | Option B | Option C |
|---|---|---|---|
| {{criterion 1}} | ✓ {{justification}} | ✗ {{justification}} | ✓ {{...}} |
| {{criterion 2}} | ✓ {{...}} | ✓ {{...}} | ✗ {{...}} |
| {{criterion 3}} | ✓ {{...}} | ✗ {{...}} | ✓ {{...}} |

## Implementation pointers

- Spec: {{path to spec.md, with anchor if relevant}}
- Plan: {{path to plan.md (mention the row)}}
- Commit: {{SHA — stamped by /after-task-dantotsus on merge}}
- Files: {{path:line, path:line — the load-bearing call sites}}
- Related ADRs: {{ADR-XXXX, ADR-YYYY — supersedes/superseded-by/builds-on}}

<!-- Optional. Append a Revision block when evidence shifts. -->
<!-- ## Revisions
###  Revision YYYY-MM-DD — {{reason}}

What changed: {{...}}
Why: {{...}}
Implication for the original decision: still valid \| re-evaluate \| supersede with ADR-NNNN
-->
```

---

## Index update

After writing the ADR file, the skill appends one line to
`docs/adr/README.md` under the right heading (CDK, App architecture,
Observability, Data, …). Mirror the format of `docs/dantotsus/README.md`:

```markdown
- [`NNNN-kebab-slug.md`](./NNNN-kebab-slug.md) — one-line summary
  including the chosen path. Example: "Aurora DSQL over RDS Postgres
  for race-day persistence; idle cost dominated."
```

If the chosen heading doesn't exist yet, create it. The README is
manually curated; the skill never reorders existing entries.

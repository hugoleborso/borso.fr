# Sub-agent verdict contract

Every sub-skill invoked by `/tech-lead-orchestrator` ends its run by
writing a single markdown file with **YAML front-matter** to
`docs/features/<app>/<slug>/runs/<run-id>/agents/<agent>-<step>.md`. The
orchestrator reads **only** the front-matter (the block between the
leading `---` delimiters), via `Read` with `limit:` of ~15 lines. The
body is for human readers and post-mortems.

## Front-matter schema

```yaml
---
status: done | question | blocked | failed
summary: <single sentence describing what happened; ≤ 200 words total>
artifacts:
  - <relative path of a file the sub-agent produced or modified>
  - <…>
next:                                # optional; structured hint
  kind: validate | answer-needed | replan | escalate
  # ... extra fields depending on kind, see below
---
```

### `next` shapes

| kind | extra fields | semantic |
|---|---|---|
| `validate` | (none) | "I am done, please run the validators." Used by `/implementation` and `/technical-conception` when the orchestrator should advance the stage. |
| `answer-needed` | `question: string`, `options?: string[]` | "I need a human decision." The orchestrator surfaces this via `AskUserQuestion` — the human answers, the sub-agent is re-invoked with the answer. |
| `replan` | `scope: string` | "The plan is wrong, here's which section needs revising." The orchestrator transitions to `plan` stage scoped to `scope`. |
| `escalate` | `reason: string` | "Stop the run, hand back to the human." Used for spec flaws, unrecoverable errors, hook failures, ADR conflicts. |

### Required fields

- `status` must be one of the four enum values.
- `summary` is a string; the orchestrator's only narrative window into
  the run.
- `artifacts` is a list of strings (may be empty).

Any deviation (missing field, wrong type, malformed YAML) the
orchestrator detects as it reads the front-matter is treated as a
synthetic `blocked` verdict with
`next: { kind: 'escalate', reason: 'unparseable-verdict: <why>' }`.
The `<why>` values:

- `missing-front-matter` — no leading `---\n…\n---` block.
- `malformed-yaml` — indentation / quoting / type errors in the block.
- `front-matter-not-object` — top-level is a scalar / list.
- `invalid-status` — `status` field missing or not in the enum.
- `missing-summary` — `summary` field absent.
- `invalid-artifacts` — `artifacts` set but not a list of strings.
- `invalid-next` — `next` block malformed (missing required field
  for the declared `kind`).

## File naming

```
runs/<run-id>/agents/<agent>-<step>.md
```

- `<agent>` ∈ { `specification`, `technical-conception`, `adr-writer`,
  `implementation`, `technical-validator`, `visual-validator` }.
- `<step>` is a zero-padded integer starting at `01`, incrementing each
  time the same sub-agent is re-invoked in the same run (retry, replan,
  answer-needed → re-run).

## Body (free-form, ignored by the orchestrator)

The body is whatever the sub-skill wants to record for the human or for
`/after-task-dantotsus`: full report, diff summary, screenshot links,
debugging notes. The orchestrator only reads the front-matter; the body
stays on disk, committed to the PR, and is the raw material for any
post-merge Dantotsu.

## Example verdicts

### `/implementation` says "ready to validate"

```markdown
---
status: done
summary: |
  Implemented `palettes.utils.ts` + tests at 100 % coverage. No
  remaining TODOs.
artifacts:
  - apps/borso-fr/site/art/mondrian/palettes.utils.ts
  - apps/borso-fr/site/art/mondrian/palettes.utils.test.ts
next:
  kind: validate
---

## Detail

(human-readable section — orchestrator ignores)
```

### `/technical-validation` finds a spec gap

```markdown
---
status: failed
summary: |
  Spec lists 4 palettes, code only implements 3. Verdict FAIL: spec
  asserts a 4-palette toggle, missing the "muted" palette.
artifacts:
  - docs/features/borso-fr/mondrian-palettes/validation/technical-validation-2026-05-13.md
next:
  kind: escalate
  reason: spec-gap-or-missing-palette
---
```

### `/adr-writer` finds a conflict

```markdown
---
status: blocked
summary: |
  Slug `cache-invalidation-strategy` already exists as ADR 0004
  (accepted). The new decision contradicts it without declaring
  supersedes. Human must arbitrate.
artifacts: []
next:
  kind: escalate
  reason: adr-conflict-slug-cache-invalidation-strategy
---
```

## Why YAML and not JSON

The body of the file is markdown, optimised for human reading. YAML
front-matter is the standard for that pattern (Jekyll / Hugo / Astro)
and the LLM reads it natively without an explicit parser dependency.

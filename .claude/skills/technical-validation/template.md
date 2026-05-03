# Technical-validation templates

Two templates live here. The skill uses both.

1. **Dispatch-brief template** — the self-contained prompt the skill passes to the `technical-validator` agent via the `Agent` tool. Substitute placeholders.
2. **Report template** — the markdown layout the agent writes to `docs/features/<app>/<slug>/validation/technical-validation-<timestamp>.md`.

The dedicated agent definition (with its own frontmatter, tools, and full procedure) is at [`../../agents/technical-validator.md`](../../agents/technical-validator.md). The brief below is the *task* the agent receives — the agent's behaviour rules live in its definition, not here.

---

## 1. Dispatch-brief template

Pass via `Agent({ subagent_type: "technical-validator", description: "Technical validation against spec + plan", prompt: <below> })`. Substitute `{{…}}` placeholders.

```
You are validating a feature implementation against its spec and plan, on the current git branch.

INPUTS:
- spec_path:    {{spec_path}}        # e.g. docs/features/borso-fr/mondrian-atelier/spec/spec.md
- plan_path:    {{plan_path}}        # e.g. docs/features/borso-fr/mondrian-atelier/plan/plan.md
                                     # may be missing — note it as a finding if so
- base_ref:     {{base_ref}}         # e.g. origin/main
- app_pkg:      {{app_pkg}}          # e.g. @borso-app/borso-fr
- report_path:  {{report_path}}      # absolute path you must write to

Read the spec, read the plan if present, resolve the diff against base_ref, and walk the four validation categories per your standard:
  A. Correctness vs spec
  B. Code cleanliness (repo rules + biome lint + knip)
  C. Tests pass
  D. Test coverage of spec

Run lint and tests; do not assume. Quote code with file:line. Tag every row PASS / FAIL / UNVERIFIABLE. Aggregate to PASS / PARTIAL / FAIL.

Write the report at report_path. Return only the report path.

Do not ask the user questions. Do not summarise the implementation. Do not skip categories.
```

The brief is intentionally short. The agent's standard, procedure, and report format live in its definition file (`.claude/agents/technical-validator.md`).

---

## 2. Report template

The agent writes this at `docs/features/<app>/<slug>/validation/technical-validation-<YYYY-MM-DD-HHmm>.md`:

```markdown
# Technical validation — <feature title>

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: <current branch>
- Base: <base_ref>
- Run at: <ISO 8601 timestamp>
- Touched workspaces: <list>

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q5 | <verbatim claim> | apps/.../X.tsx:NN | `…` | PASS / FAIL / UNVERIFIABLE |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | <rule> | <how checked> | <result> | PASS / FAIL / UNVERIFIABLE |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/<app> | `pnpm --filter @borso-app/<app> run test` | 0 / N | PASS / FAIL / UNVERIFIABLE |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | <use case> | `<describe/it text>` at <file:line> | PASS / FAIL |

## Notes

> *One bullet per FAIL or UNVERIFIABLE row, expanding what was observed and what was missing. PASS rows do not need a note.*

-

## Verdict: <PASS / PARTIAL / FAIL>
```

### Path conventions

- The report links to its sibling spec via `../spec/spec.md` and plan via `../plan/plan.md`.
- All evidence is inline (quoted code, command output, test descriptions). No external evidence folder is needed for technical-validation, unlike visual-validation's screenshot folder.
- The agent never modifies any file outside `report_path`.

# Visual-validation templates

The dispatch brief lives here, and a pointer to the report layout.

1. **Dispatch-brief template** — the self-contained prompt the skill passes to the `visual-validator` agent via the `Agent` tool. Substitute placeholders.
2. **Report template** — the markdown layout the agent writes to `docs/features/<app>/<slug>/validation/visual-validation-<timestamp>.md`.

The dedicated agent definition (with its own frontmatter, tools, and instructions) is at [`../../agents/visual-validator.md`](../../agents/visual-validator.md). The brief below is the *task* the agent receives — the agent's behaviour rules live in its definition, not here.

---

## 1. Dispatch-brief template

Pass via `Agent({ subagent_type: "visual-validator", description: "Visual validation against spec", prompt: <below> })`. Substitute `{{…}}` placeholders.

```
You are validating a feature spec against a running implementation.

INPUTS:
- spec_path:    {{spec_path}}        # e.g. docs/features/borso-fr/mondrian-atelier/spec/spec.md
- dev_url:      {{dev_url}}          # e.g. http://localhost:5173/art/mondrian/
- app_pkg:      {{app_pkg}}          # e.g. @borso-app/borso-fr
- report_path:  {{report_path}}      # absolute path you must write to
- evidence_dir: {{evidence_dir}}     # absolute path; save all screenshots here

Read the spec, build the assertion list per your standard, drive agent-browser, capture evidence inside evidence_dir as absolute paths, and write the report at report_path. Return only the report path.

Do not ask the user questions. Do not summarise the implementation. Do not skip edge cases.
```

The brief is intentionally short. The agent's standard, tooling rules, report format, and verdict semantics live in its definition file (`.claude/agents/visual-validator.md`). The brief only carries the *task-specific* paths.

---

## 2. Report template

The report layout is the *Report format* section of [`../../agents/visual-validator.md`](../../agents/visual-validator.md), which the agent reads.

# Technical-validation templates

The dispatch brief lives here, and a pointer to the report layout.

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
                                     # may be missing: one `plan absent` row; none on a kaizen sweep
- base_ref:     {{base_ref}}         # the 40-character merge-base SHA, never origin/main
- app_pkg:      {{app_pkg}}          # e.g. @borso-app/borso-fr
- report_path:  {{report_path}}      # absolute path you must write to
- round:        {{round}}            # 1 or 2
- previous_report: {{previous_report}}  # round 2 only: the round-1 report

Read the spec, read the plan if present, resolve the diff against base_ref, and walk the five validation categories per your standard:
  A. Correctness vs spec
  B. Code cleanliness (repo rules, oxlint, knip, and every `reviewer` bullet of the `## Enforced by` sections in docs/standards/)
  C. Tests pass
  D. Test coverage of spec
  E. Scale (required): check-then-write races, per-process state, concurrent tests

Every FAIL row states a concrete failing case: this input leads to this wrong result, and is typed blocking or non-blocking. A concern without one goes in Notes as a question.

Round 2 reviews only `git diff <Reviewed sha of previous_report>..HEAD` and re-checks each round-1 blocking finding.

Run lint and tests; do not assume. Quote code with file:line. Tag every row PASS / FAIL (blocking) / FAIL (non-blocking) / UNVERIFIABLE. Aggregate to PASS / PASS_EXCEPT_UNVERIFIABLE / FAIL.

Write the report at report_path. Return only the report path.

Do not ask the user questions. Do not summarise the implementation. Do not skip categories.
```

The brief is intentionally short. The agent's standard, procedure, and report format live in its definition file (`.claude/agents/technical-validator.md`).

---

## 2. Report template

The report layout is the *Report format* section of [`../../agents/technical-validator.md`](../../agents/technical-validator.md), which the agent reads. It links its sibling spec and plan as `../spec/spec.md` and `../plan/plan.md`, and all evidence is inline.

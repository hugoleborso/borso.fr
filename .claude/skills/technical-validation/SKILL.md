---
name: technical-validation
description: Dispatch the dedicated `technical-validator` agent to read the spec, the plan, and the diff on the current branch, and produce a code-review verdict covering correctness-vs-spec, code cleanliness vs repo rules, test pass status, and whether tests cover what the spec asks. Use when the user says "/technical-validation", "review the code", "code review against the spec", or as the gate-7 step in a `/technical-conception` plan. Takes a path to `docs/features/<app>/<slug>/spec/spec.md` as the only required argument; the skill discovers the matching plan, the workspace package, and the base ref. The validator runs in isolation — no chat history, no main-session context — so its verdict is not biased by what the implementer already convinced themselves of. Produces a verdict report at `docs/features/<app>/<slug>/validation/technical-validation-<timestamp>.md` and returns PASS / PASS_EXCEPT_UNVERIFIABLE / FAIL. Reads the standard at `.claude/skills/technical-validation/standard.md` before dispatching.
---

# Technical-validation skill

A spec is a contract. A plan is the engineering projection of the contract onto the codebase. A technical validation **reads the diff and asks four questions**:

1. **Correctness** — does the code do what the spec says?
2. **Cleanliness** — does the code follow the repo's standing rules (CLAUDE.md, biome, type-assertion plugin)?
3. **Tests pass** — does `pnpm test` succeed on every touched workspace?
4. **Coverage** — does each use case in the spec have a test that exercises it?

It is the engineering counterpart of `/visual-validation`. Same standalone-agent posture; same evidence-required discipline; same no-rounding-up verdict semantics — applied to source code rather than rendered pixels.

The canonical standard this skill enforces lives at [`standard.md`](./standard.md).

## The standalone-agent rule

The validator runs in **a fresh `Agent` invocation** with no chat context. Non-negotiable, same reason as visual-validation: the implementer (the main session) has already convinced themselves the code is fine, and inheriting that bias defeats the gate.

Use the dedicated `technical-validator` agent at `.claude/agents/technical-validator.md`. Do **not** dispatch `general-purpose` for this — the dedicated agent's frontmatter and brief carry the structural rules.

```
Agent({
  subagent_type: "technical-validator",
  description: "Technical validation against spec + plan",
  prompt: <self-contained brief — see template.md>,
})
```

## When to invoke

Invoke when:
- A feature has shipped to a branch and a spec exists at `docs/features/<app>/<slug>/spec/spec.md`.
- The user asks for `/technical-validation`, "review the code", "code review against the spec".
- The `/technical-conception` plan reaches gate 7.

Do **not** invoke when:
- There is no spec.
- The branch hasn't diverged from base (no diff to review).
- The work is purely documentation with no code changes (skip the gate; CLAUDE.md and the spec speak for themselves).

## How this phase works (skill, in the main session)

1. **Parse the argument.** `spec_path = docs/features/<app>/<slug>/spec/spec.md`. Derive `<app>` from the path.
2. **Locate the plan.** `plan_path = docs/features/<app>/<slug>/plan/plan.md`. If missing, surface that to the user and continue — the validator will tag plan-dependent rows UNVERIFIABLE.
3. **Resolve the workspace.** `app_pkg = "@borso-app/<app>"` for app workspaces; `@borso/infra` for `<app> = infra`. Check `apps/<app>/package.json` exists and identify the test script (`test`, `test:coverage`, etc.).
4. **Resolve the base ref.** Default to `origin/main`. Surface explicit override via `BASE_REF` env if the user provides one.
5. **Build the run paths.**
   ```
   timestamp        = <YYYY-MM-DD-HHmm>
   validation_dir   = docs/features/<app>/<slug>/validation
   report_path      = <validation_dir>/technical-validation-<timestamp>.md
   ```
   `mkdir -p` the validation directory.
6. **Dispatch the `technical-validator` agent** with `spec_path`, `plan_path`, `base_ref`, `app_pkg`, `report_path`. The agent reads the diff, runs lint + tests, walks the four validation categories, writes the report.
7. **Read the report.** Surface the verdict (one line). On **FAIL**, list the failing rows verbatim and stop — fix the implementation (or the spec), do not ship. On **PASS_EXCEPT_UNVERIFIABLE**, list the UNVERIFIABLE rows verbatim so the operator can copy them into the PR description per the disclosure rule.
8. **Stage the report for commit.** It lives under `docs/features/<app>/<slug>/validation/` alongside any visual-validation report from the same feature.

## Deliverable

A single markdown file at `docs/features/<app>/<slug>/validation/technical-validation-<timestamp>.md`. No sibling evidence folder needed (unlike visual-validation, the evidence here is quoted code lines and command output, both inline in the report).

The skill's textual return is one of:
- `Verdict: PASS — see <report_path>` — mergeable.
- `Verdict: PASS_EXCEPT_UNVERIFIABLE (N unverifiable) — see <report_path>` — mergeable with PR disclosure.
- `Verdict: FAIL (N failing) — see <report_path>` — **not mergeable**, fix and re-run.

## Verdict acceptance + PR disclosure

Same rule as `/visual-validation`:

- **FAIL is never accepted.** Code-cleanliness violations, missing `.utils.ts` tests, lint / knip / typecheck regressions, and correctness-vs-spec gaps are real defects — the operator fixes them and re-runs the validator. There is no "disclose-and-merge" path.
- **PASS_EXCEPT_UNVERIFIABLE is mergeable** when each UNVERIFIABLE row is genuinely outside this validator's reach (e.g. a tooling limit, or a row legitimately deferred to `/visual-validation`). The PR description must surface those rows in a `## Validation gaps` section: row number + assertion text verbatim + one-line reason + report-path link.
- **PASS is mergeable** with no further disclosure.

## Failure modes to avoid

- **Optimism leak.** The skill must not pre-summarise the implementation for the agent. Pass the four paths; nothing else.
- **Dispatching `general-purpose`.** A generic agent has none of the dedicated agent's structural rules.
- **Skipping tests because they're slow.** The validator runs them. If a workspace has no test script and the spec implies test coverage, the row is UNVERIFIABLE — not "fine because no tests exist".
- **Quoting evidence without line numbers.** Every code citation in the report needs a `file:line` reference; otherwise reviewers can't audit the verdict.
- **Treating "tests pass" as "tests exist".** Categories C (tests pass) and D (test coverage of spec) are separate columns. A workspace with one trivial smoke test passes C but fails D for every uncovered use case.
- **Validating against the implementation, not the spec.** Same anti-pattern as visual-validation: if a feature exists in code but isn't in the spec, the validator does not validate it (and notes that the spec is incomplete).
- **Missing plan → silent UNVERIFIABLE everywhere.** When the plan is missing, the report's first finding should call it out and recommend running `/technical-conception`. UNVERIFIABLE rows that all stem from the same root cause should be summarised.

## Repo-specific notes

- Workspaces: `@borso-app/<app>` for `apps/*`; `@borso/infra` for `infra/cdk`; `@borso/shared-infra` for `infra/shared`.
- `infra/cdk` and `infra/shared` are 100%-coverage gated. The validator runs `test:coverage` for those, not `test`, and treats <100% as FAIL.
- Default base ref is `origin/main`. Feature branches are typically `claude/<slug>` per CLAUDE.md.
- Reports go in `docs/features/<app>/<slug>/validation/` (siblings to `spec/`, `plan/`, and any visual-validation reports).
- Pair with `/visual-validation` (UI work): visual catches "doesn't render right"; technical catches "renders fine but the code is rotten or untested".

## Auto-chain on PR merge: `/after-task-dantotsus`

When GitHub fires `pull_request.closed` with `merged: true` for a PR this skill validated (visible to the agent as a `<github-webhook-activity>` block), the agent immediately invokes `/after-task-dantotsus` for the merged PR. If not subscribed to the PR's webhook activity, the agent asks once whether to subscribe. The same auto-chain lives in `/visual-validation` — whichever validator the chain reached last carries the trigger.

## Post-merge: remind to approve the prod deploy

When the merged PR touches infra or app code, prod CI is now waiting on Hugo to approve the `prod` GitHub environment (CLAUDE.md "Deployments"). The agent's first response after the merge webhook is the reminder — *before* the kaizen sweep, since the deploy queue waits on a human.

---
name: technical-validation
description: Dispatch the dedicated `technical-validator` agent to read the spec, the plan, and the diff on the current branch, and produce the branch's one code-review verdict covering correctness-vs-spec, code cleanliness vs repo rules and the standards reviewer checklist, test pass status, and whether tests cover what the spec asks. Two rounds at most; only blocking findings fail it. Use when the user says "/technical-validation", "review the code", "code review against the spec", "review this against the standards", or as the gate-7 step in a `/technical-conception` plan. Takes a path to `docs/features/<app>/<slug>/spec/spec.md` as the only required argument; the skill discovers the matching plan, the workspace package, and the base ref. The validator runs in isolation, so its verdict is not biased by what the implementer already convinced themselves of. Produces a verdict report at `docs/features/<app>/<slug>/validation/technical-validation-<timestamp>.md` and returns PASS / PASS_EXCEPT_UNVERIFIABLE / FAIL.
---

# Technical-validation skill

The validator reads the diff and asks five questions: correctness against the
spec, cleanliness against the repo's rules, tests passing, tests covering the
spec, and scale under concurrent requests. Its categories, finding rules and
report format live in its definition,
[`.claude/agents/technical-validator.md`](../../agents/technical-validator.md).
Why it exists and what it leaves out are in [`standard.md`](./standard.md).

## The standalone-agent rule

Dispatch the dedicated `technical-validator` agent in a fresh `Agent` call,
never `general-purpose`, whose context lacks the agent's rules. The
implementer has already convinced itself the code is fine, and inheriting that
bias defeats the gate. Pass the brief from [`template.md`](./template.md) and
nothing else: no summary of the implementation.

Skip the gate when there is no spec and no ADR stands in for one, when the
branch has no diff, or when the change is documentation only.

## How this phase works (skill, in the main session)

1. **Parse the argument.** `spec_path = docs/features/<app>/<slug>/spec/spec.md`.
   When the operator asked for the change directly and an ADR records it, pass
   the ADR. A kaizen sweep (`claude/lessons-from-pr-<N>`) passes
   `docs/features/meta/lessons-from-pr-<N>/inventory.md` and no plan.
2. **Locate the plan.** `plan_path = docs/features/<app>/<slug>/plan/plan.md`.
   If missing, tell the user and continue.
3. **Resolve the workspace.** `app_pkg = "@borso-app/<app>"`, or
   `@borso/infra` for `<app> = infra`.
4. **Resolve the base ref to a SHA, once.**
   `base_ref=$(git merge-base origin/main HEAD)`, or `BASE_REF` when the user
   provides one. Pass the 40-character SHA, never `origin/main`, which moves
   when another pull request merges mid-review.
5. **Build the run paths.** `report_path =
   docs/features/<app>/<slug>/validation/technical-validation-<YYYY-MM-DD-HHmm>.md`,
   and `mkdir -p` its folder.
6. **Pick the round.** Round 1 when no earlier `technical-validation-*.md`
   report of this branch sits in that folder; round 2 otherwise, with
   `previous_report` set to it. There is no round 3. A revision after a
   passing report, such as a spec change, is a new round 1 with `base_ref` set
   to that report's `Reviewed:` SHA, and gets its own round 2.
7. **Dispatch the `technical-validator` agent** with `spec_path`,
   `plan_path`, `base_ref`, `app_pkg`, `report_path`, `round`, and
   `previous_report` on round 2.
8. **Read the report's verdict and its two finding lists** once the agent has
   handed back, not before: a file at `report_path` earlier is a draft. On
   **FAIL**, triage the blocking findings below and do not ship.

## Findings and rounds

The implementer takes each finding, blocking or not, and does one of three
things:

- **fix** it;
- **dismiss** it with a concrete reason in a commit message, where round 2
  reads it, because the pull request opens after validation
  (`B07 dismissed: the name is the one VOCABULARY.md uses`). The reason names
  the file that holds it. A reason only another repository or a running agent
  could confirm is a question, not a dismissal;
- **ask the operator**, when it is a product call or rests on what this
  repository cannot show.

Be skeptical: a reviewer that read the diff cold is often wrong about intent.

After round 1 with blocking findings, fix them and run round 2. After round 2,
any blocking finding still open goes to the operator with the report. Never
run a third round, because each round rereads code nobody changed.

## Verdict acceptance + PR disclosure

The skill returns `Verdict: <PASS | PASS_EXCEPT_UNVERIFIABLE (N unverifiable)
| FAIL (N failing)> — see <report_path>`.

- **FAIL is never accepted.** There is no disclose-and-merge path.
- **Non-blocking findings** never block. Each is fixed, dismissed with a
  reason, or listed in the PR description.
- **PASS_EXCEPT_UNVERIFIABLE is mergeable** when each UNVERIFIABLE row is
  genuinely outside this validator's reach. The PR description carries those
  rows (row number, assertion text verbatim, one-line reason, report link)
  where `/open-pr`'s *Validation* step puts them.
- **PASS is mergeable** with no further disclosure.

## Verdict émis (when piloted by `/tech-lead-orchestrator`)

When `docs/features/<app>/<slug>/runs/<run-id>/state.json` has
`"pilotedByTechLead": true`, also write
`runs/<run-id>/agents/technical-validation-<step>.md` per
[`sub-agent-contract.md`](../tech-lead-orchestrator/sub-agent-contract.md):

| Validator verdict | `status` | `next.kind` |
|---|---|---|
| PASS | `done` | (omit) |
| PASS_EXCEPT_UNVERIFIABLE | `done` | (omit) — UNVERIFIABLE rows go in the body |
| FAIL (local code defect) | `failed` | omit `next`; orchestrator's `nextAction` maps this to `fix` |
| FAIL (plan flaw) | `failed` | `replan` with `scope: '<plan section>'` |
| FAIL (spec gap) | `failed` | `escalate` with `reason: 'spec-gap-<short>'` |
| FAIL (validator crash) | `failed` | `escalate` with `reason: 'validator-crash-<short>'` |

`summary:` is the report's headline (≤ 200 words), and `artifacts:` the
report's path. The report is still produced.

---
name: visual-validation
description: Dispatch the dedicated `visual-validator` agent to open the implemented feature in a real browser (via the agent-browser CLI) and check, point by point, that every visible and behavioural assertion in the spec actually holds. Use when the user says "/visual-validation", "validate visually", "check the spec is implemented", or as the gate-5 step in a `/technical-conception` plan. Takes a path to `docs/features/<app>/<slug>/spec/spec.md` as the only required argument. The validator runs in isolation, so its verdict is not biased by what the implementer already convinced themselves of. Produces a verdict report at `docs/features/<app>/<slug>/validation/visual-validation-<timestamp>.md` plus screenshot evidence that is published to the previews CDN or, for a FAIL row, committed beside the report, and returns PASS / PASS_EXCEPT_UNVERIFIABLE / FAIL.
---

# Visual-validation skill

The validator opens the app and checks each assertion of the spec in a real
browser, by clicking, typing, resizing and navigating. It is the only gate that
catches "the types check, but the feature does not work". Its rows, tooling and
report format live in its definition,
[`.claude/agents/visual-validator.md`](../../agents/visual-validator.md). Why it
exists, what it leaves out and where evidence lives are in
[`standard.md`](./standard.md).

## The standalone-agent rule

Dispatch the dedicated `visual-validator` agent in a fresh `Agent` call, never
`general-purpose`, which would inherit the main session's optimism through
whatever prompt you write. Pass the brief from [`template.md`](./template.md)
and nothing else: no summary of the implementation, no known gotchas, no hint
of what to look for.

Skip the gate when there is no spec at the expected path or the feature has no
visible result.

## How this phase works (skill, in the main session)

1. **Parse the argument.** `spec_path = docs/features/<app>/<slug>/spec/spec.md`,
   and `<app>` is the segment after `docs/features/`.
2. **Start the dev server** with `scripts/dev-server.sh start <app>`. It
   prints the site URL and the seeded sign-in. Pass `--as <label>` when
   another agent may run the same app.
3. **Build the run paths.**
   ```
   timestamp        = <YYYY-MM-DD-HHmm>
   validation_dir   = docs/features/<app>/<slug>/validation
   report_path      = <validation_dir>/visual-validation-<timestamp>.md
   evidence_dir     = <validation_dir>/.pending-upload/<timestamp>/
   ```
   `mkdir -p` the evidence directory. It is gitignored, so a screenshot
   reaches git only when step 7 moves it out.
4. **Dispatch the `visual-validator` agent** with the absolute paths, the dev
   URL and the seeded sign-in. When the spec links a claude.ai design
   artifact, read it first with the Artifact tool's `read` action and pass the
   saved file as `design_path`, because the agent has no Artifact tool.
   **Leave the served code alone until the report is back.** The dev server
   reloads on every save, so an edit made meanwhile puts two builds in one
   report.
5. **Read the report.** Give the verdict in one line. On **FAIL**, list the
   failing rows verbatim and stop: the next move is a fix, not a ship. On
   **PASS_EXCEPT_UNVERIFIABLE**, list the UNVERIFIABLE rows verbatim for the
   PR description. Add no summary of your own: the operator reads the report.
6. **Stop the dev server** with `scripts/dev-server.sh stop <app>`, with the
   same `--as` label.
7. **Keep only FAIL evidence in git.** Move each file a FAIL row cites to
   `<validation_dir>/visual-validation-<timestamp>/` and leave the rest in
   `.pending-upload/`. **The upload happens in [`/open-pr`](../open-pr/SKILL.md)**,
   because its host, `screenshots-pr-<n>`, needs a PR number that does not
   exist yet. The report keeps `<n>` literal: it is a dated record that
   `scripts/check-dated-records-are-append-only.sh` refuses to see edited, so
   the PR's *Screenshots* comment is where the number is filled in.

The skill returns `Verdict: <PASS | PASS_EXCEPT_UNVERIFIABLE (N unverifiable)
| FAIL (N failing)> — see <report_path>`.

## Verdict acceptance rules

- **FAIL is never accepted.** The implementation, the spec or both change, and
  no PR opens while the latest report is FAIL.
- **PASS_EXCEPT_UNVERIFIABLE is mergeable** when every UNVERIFIABLE row is a
  tool gap (catalogued in `docs/knowledge/`) or a row another validator owns.
  Closing it would need a vendor change or a workspace-scope refactor, never
  "we could not think how".
- **PASS is mergeable** with no further disclosure.

## What the pull request has to carry

A reviewer reads the PR description without opening the report. **Where** each
item goes is `/open-pr`'s *Validation* step and `scripts/pr/check-pr-body.ts`.

- **Every UNVERIFIABLE row, on a `PASS_EXCEPT_UNVERIFIABLE` verdict**: the row
  number, the assertion verbatim, the one-line reason from the report's Notes,
  and the report path. A tool gap's reason points at its `docs/knowledge/`
  entry, and a deferred row's at the other validator's report, so a tool-side
  limit never reaches main silently. A PASS needs only the report path.
- **The screenshots, on any verdict.** A published screenshot reaches the
  reviewer through the *Screenshots* comment that
  `.github/workflows/screenshots.yml` posts once `/open-pr` has uploaded it. A
  committed one renders in *Files changed*. Never embed either as a markdown
  image: the GitHub MCP server defuses those, and
  `scripts/hooks/checks/github-pr-body.core.ts` refuses the call. See
  [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../../../docs/knowledge/github-mcp-pr-body-sanitizer.md).

## Verdict émis (when piloted by `/tech-lead-orchestrator`)

When `docs/features/<app>/<slug>/runs/<run-id>/state.json` has
`"pilotedByTechLead": true`, also write
`runs/<run-id>/agents/visual-validation-<step>.md` per
[`sub-agent-contract.md`](../tech-lead-orchestrator/sub-agent-contract.md),
mapped as `/technical-validation`'s *Verdict émis* table maps it. A feature
with no UI is skipped by the orchestrator, which appends
`visual_validation_skipped` and never calls this skill.

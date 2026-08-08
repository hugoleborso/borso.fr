---
name: visual-validation
description: Dispatch the dedicated `visual-validator` agent to open the implemented feature in a real browser (via the agent-browser CLI) and check, point by point, that every visible and behavioural assertion in the spec actually holds. Use when the user says "/visual-validation", "validate visually", "check the spec is implemented", or as the gate-5 step in a `/technical-conception` plan. Takes a path to `docs/features/<app>/<slug>/spec/spec.md` as the only required argument; the skill discovers the dev-server command from the workspace's `package.json`. The validator runs in isolation — no chat history, no main-session context — so its verdict is not biased by what the implementer already convinced themselves of. Produces a verdict report at `docs/features/<app>/<slug>/validation/visual-validation-<timestamp>.md` plus a sibling folder of committed screenshot evidence, and returns PASS / PASS_EXCEPT_UNVERIFIABLE / FAIL. Reads the standard at `.claude/skills/visual-validation/standard.md` before dispatching.
---

# Visual-validation skill

A spec is a list of assertions about what the user will see and how the app will behave. A visual validation **opens the app and checks each assertion**, one by one, in a real browser, by clicking, typing, resizing, navigating. It is the only gate that catches *"the code compiles and the types check, but the feature doesn't actually work"* — the most common failure mode of LLM-shipped UI code.

The canonical standard this skill enforces lives at [`standard.md`](./standard.md).

## The standalone-agent rule

The validation agent runs in **a fresh `Agent` invocation** with no chat context. This is non-negotiable. The implementer (the main session) has already convinced themselves the feature works; running validation in their context inherits that bias.

Use the dedicated `visual-validator` agent defined at `.claude/agents/visual-validator.md`. Do **not** dispatch `general-purpose` for this — the dedicated agent's brief is the structural mitigation, and a generic agent would inherit the main session's optimism through whatever prompt you write.

```
Agent({
  subagent_type: "visual-validator",
  description: "Visual validation against spec",
  prompt: <self-contained brief — see template.md>,
})
```

The brief carries the spec path, dev URL, report path, and evidence directory — and *nothing else*. It does not summarise the implementation, list known gotchas, or hint at what to look for.

## Tooling: agent-browser

The validator drives the browser via [`agent-browser`](https://github.com/vercel-labs/agent-browser) — the LLM-oriented CLI that exposes a reference-based snapshot/click/screenshot interface tuned for agents. Not Playwright: agent-browser is the right shape for an LLM-driven validator (text refs over selectors, JSON snapshots over imperative API calls).

If `agent-browser` is not installed on the system, the validator surfaces that as a single FAIL row titled "Tooling unavailable" and exits without falling back. Install:

```bash
npm install -g agent-browser
agent-browser install   # provisions the daemon + its browser
```

The skill (this file, running in the main session) does not install agent-browser automatically — that's an explicit operator decision since it touches the global npm prefix and provisions a Chromium binary. Surface the install command to the user if it's missing.

## When to invoke

Invoke when:
- A feature has shipped to a local dev server (or a preview URL) and `spec.md` is present at `docs/features/<app>/<slug>/spec/spec.md`.
- The user asks for `/visual-validation`, "validate the spec", "check it works".
- The `/technical-conception` plan reaches gate 5 (UI work).

Do **not** invoke when:
- There is no spec at the expected path.
- The feature is purely backend / infra (no visible result).
- The dev server isn't running and the workspace has no `dev` script.

## How this phase works (skill, in the main session)

1. **Parse the argument.** `spec_path = docs/features/<app>/<slug>/spec/spec.md`. Derive `<app>` from the path itself — it's the segment after `docs/features/`.
2. **Discover the workspace.** `app_pkg = "@borso-app/<app>"` (the workspace conventions live in CLAUDE.md). Confirm `apps/<app>/package.json` exists.
3. **Probe the dev server** at `http://localhost:5173/` (or the port from `apps/<app>/vite.config.ts`). If 200, reuse it. If not, spawn `pnpm --filter <app_pkg> dev` in the background and poll until 200.
4. **Build the run folder paths.**
   ```
   timestamp        = <YYYY-MM-DD-HHmm>
   validation_dir   = docs/features/<app>/<slug>/validation
   report_path      = <validation_dir>/visual-validation-<timestamp>.md
   evidence_dir     = <validation_dir>/visual-validation-<timestamp>/
   ```
   `mkdir -p` the evidence directory so the validator can drop PNGs straight in.
5. **Dispatch the `visual-validator` agent.** Pass the four absolute paths and the dev URL. The agent reads the spec, builds its own assertion list, drives agent-browser, captures evidence, writes the report, and returns only the report path.
6. **Read the report.** Surface the verdict (one line). On **FAIL**, list the failing rows verbatim and stop — the next move is to fix the implementation, not to ship. On **PASS_EXCEPT_UNVERIFIABLE**, list the UNVERIFIABLE rows verbatim so the operator can copy them into the PR description per the disclosure rule. Do **not** summarise — the user reads the report.
7. **Stop the dev server** if the skill spawned it. Leave it running if the operator started it.
8. **Stage the report and evidence for commit.** They live under `docs/features/<app>/<slug>/validation/` which is *not* gitignored — the screenshots are part of the report and must be committed alongside it.

## Deliverable

Two artefacts at `docs/features/<app>/<slug>/validation/`:

- `visual-validation-<timestamp>.md` — the markdown verdict report.
- `visual-validation-<timestamp>/` — the folder of PNG screenshots referenced from the report.

Both are committed. Do not gitignore them. Validation evidence rots and gets contested without a permanent record.

The skill's textual return to the user is one of:
- `Verdict: PASS — see <report_path>` — mergeable.
- `Verdict: PASS_EXCEPT_UNVERIFIABLE (N unverifiable) — see <report_path>` — mergeable with PR disclosure (see below).
- `Verdict: FAIL (N failing) — see <report_path>` — **not mergeable**, fix the implementation and re-run.

## Verdict acceptance rules

- **FAIL is never accepted.** Failing rows are real defects — the implementation, the spec, or both have to change. The operator does not open a PR while the most recent validation report is FAIL. There is no "disclose-and-merge" path for FAIL.
- **PASS_EXCEPT_UNVERIFIABLE is mergeable** when every UNVERIFIABLE row is a tool gap (something the validator could not exercise — see `docs/knowledge/` for the catalog) or a spec-deferred row (handled by another validator), not a "we couldn't test it because we couldn't think how" sidestep. The bar for accepting an UNVERIFIABLE row is that closing it would require either a vendor change or a workspace-scope refactor.
- **PASS is mergeable** with no further disclosure.

## PR disclosure (for PASS_EXCEPT_UNVERIFIABLE only)

The operator opening the PR must surface the UNVERIFIABLE rows in the PR description under a `## Validation gaps` heading. Each row:

- Row number + the assertion text, verbatim from the report.
- The one-line reason from the report's Notes (tool-gap pointer to `docs/knowledge/`, spec-deferred pointer to the other validator's report).
- A link to the report path under `docs/features/<app>/<slug>/validation/`.

A reviewer reads the PR description without opening the report; the gap has to be visible up-front. A PASS_EXCEPT_UNVERIFIABLE validation that ships without this disclosure is a Dantotsu candidate against this skill — the gate exists so tool-side limitations don't slip through silently into main.

A PASS verdict needs only a link to the report — no per-row disclosure.

## Visual evidence in the PR body

Regardless of verdict (PASS or PASS_EXCEPT_UNVERIFIABLE), the PR description includes a `## Visual evidence` section with the screenshots from the latest validation report embedded inline. Reviewers should see the rendered feature without leaving the PR page.

GitHub does **not** render relative-path images in PR descriptions; they must be absolute URLs. The robust pattern is the raw blob URL pinned to a commit SHA — the SHA persists after the branch is deleted at merge time, so the URLs do not 404 on historical PRs.

```
https://github.com/<owner>/<repo>/raw/<sha>/<path-to-png>
```

Generator (run after all commits are in, before opening the PR):

```bash
slug_path=docs/features/<app>/<slug>/validation
report_dir=$(ls -1td "$slug_path"/visual-validation-*/ 2>/dev/null | head -1)
sha=$(git rev-parse HEAD)
repo_path=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
for png in "$report_dir"*.png; do
  rel=${png#./}
  echo "![${png##*/}](https://github.com/$repo_path/raw/$sha/$rel)"
done
```

The output is markdown ready to paste. Suggested PR-body shape:

```markdown
## Visual evidence

<!-- output of the generator above -->

## Validation gaps   <!-- only on PASS_EXCEPT_UNVERIFIABLE -->

- Row 35: <verbatim assertion> — <one-line reason> — see [visual-validation-<ts>.md](docs/features/<app>/<slug>/validation/visual-validation-<ts>.md).
```

If the screenshot set is large (>5 PNGs), wrap the lower-priority breakpoints in `<details><summary>Mobile / edge cases</summary> … </details>` so the desktop hero stays above the fold.

## Failure modes to avoid

- **Optimism leak.** The skill must not pre-summarise the implementation for the agent ("the feature is mostly working, just check…"). Pass the spec path and the URL; nothing else. The whole point is unbiased eyes.
- **Falling back to Playwright when agent-browser is missing.** The structural mitigation (LLM-shaped tool) goes away. Surface the install command and stop.
- **Dispatching `general-purpose` instead of `visual-validator`.** A generic agent has none of the dedicated agent's structural rules — it can ask the user questions, drift into implementation reasoning, etc.
- **Flaky-animation pseudo-failures.** Animations driving rAF produce different pixels every frame. The agent waits for `networkidle` plus a 600 ms settle before screenshotting; deterministic seeds (e.g. `?seed=DEADBEEF`) when the spec supports them.
- **"Looks right" without evidence.** Every PASS must reference a captured screenshot or a deterministic check (selector found, attribute equal, URL matches). "Looks right" alone is not a PASS.
- **PASS on DOM presence without checking rendered pixels.** The most insidious failure mode: the `<img>` tag is in the DOM, the parent component rendered, the layout is right — and the user sees broken alt-text where icons / sprites / glyphs should be (CDN 403, hotlink block, missing asset). The standard's *Pixel-content checks* section is mandatory per screenshot, not a recommendation. The brief template in `template.md` carries the canonical broken-image-scan `eval` so the agent runs it as a first-class step of every row that captured a screenshot.
- **Validating against the implementation, not the spec.** The agent reads the spec to know what to check. If a feature exists in code but isn't claimed in the spec, it isn't validated. If a claim is in the spec but missing from the code, that's a FAIL — never "the implementer probably meant…".
- **Skipping edge cases because they're hard.** The validator must resize, emulate dark mode, emulate touch device, emulate reduced motion. These are exactly the cases users hit; they're not optional.
- **Treating UNVERIFIABLE as PASS.** PASS_EXCEPT_UNVERIFIABLE is its own verdict — same as PASS for mergeability if and only if the operator copies the UNVERIFIABLE rows into the PR description.
- **Gitignoring the validation folder.** The evidence is part of the report. Commit both.

## Repo-specific notes

- Workspaces live under `apps/<app>/`. Dev server: `pnpm --filter @borso-app/<app> dev`.
- Default dev port is 5173; check `apps/<app>/vite.config.ts` to override.
- Reports + evidence go in `docs/features/<app>/<slug>/validation/` (siblings to `spec/` and `plan/`).
- The validator only writes inside `evidence_dir` and `report_path`. It does not modify code, the spec, or anything else.
- When the verdict is FAIL, the user is shown the failing rows verbatim — they are not asked to interpret the report themselves.

## Verdict émis (when piloted by `/tech-lead-orchestrator`)

When `docs/features/<app>/<slug>/runs/<run-id>/state.json` exists with `"pilotedByTechLead": true`, the skill writes an additional verdict file at `runs/<run-id>/agents/visual-validator-<step>.md` per [`.claude/skills/tech-lead-orchestrator/sub-agent-contract.md`](../tech-lead-orchestrator/sub-agent-contract.md). Mapping from PASS / PASS_EXCEPT_UNVERIFIABLE / FAIL to the YAML front-matter mirrors `/technical-validation`'s *Verdict émis* table.

**No UI surface.** When the feature has no visible UI, `/visual-validation` should not be invoked at all. The orchestrator owns the skip (decision Q-VIS-VAL): it emits a `tech_lead_visual_validation_skipped` journal event and does not call this skill. No verdict file is written.

## Auto-chain on PR merge: `/after-task-dantotsus`

When GitHub fires `pull_request.closed` with `merged: true` for a PR this skill validated (visible to the agent as a `<github-webhook-activity>` block), the agent immediately invokes `/after-task-dantotsus` for the merged PR. If not subscribed to the PR's webhook activity, the agent asks once whether to subscribe. The same auto-chain lives in `/technical-validation` — whichever validator the chain reached last carries the trigger.

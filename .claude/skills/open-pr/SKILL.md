---
name: open-pr
description: Open a GitHub pull request whose description is a progressive-disclosure walk of the work shipped — spec → details → evidence, choice → alternatives → criteria. Use when the user says "/open-pr", "open a PR", "create a pull request", or as the final chain step after `/visual-validation` + `/technical-validation`. Reads the feature spec, plan, ADRs, validation reports, dantotsus, and the diff. Produces a draft PR body via the template at `.claude/skills/open-pr/template.md`, shows it for review, then calls `gh pr create` when the user approves. Also runs as a PreToolUse hook on `gh pr create` calls that try to ship without a rich body. Reads the standard at `.claude/skills/open-pr/standard.md` before drafting.
---

# Open-PR skill

A PR description is the **only artefact a reviewer reads end-to-end**. Everything else (spec, plan, ADRs, validation reports, code) is *linked from* the description and read on demand. The description's job is to let the reviewer go as deep as needed and no deeper — which is what `<details>` toggles are for.

Three-level progressive disclosure:

- **Level 1 (always visible):** the summary + one-line "why" per decision + the validation verdicts. A reviewer who trusts the gates reads only this.
- **Level 2 (`<details><summary>`):** spec context, ADR rationale, test plan, dantotsus uncovered. A reviewer who wants the *what* opens these.
- **Level 3 (nested `<details>`):** screenshots, file:line citations, rejected alternatives, commit hashes. A reviewer who wants to *audit* opens these.

The canonical standard this skill enforces lives at [`standard.md`](./standard.md). The body skeleton is at [`template.md`](./template.md).

## Input sources

The skill assembles the PR body from two upstream loops, never re-deriving content from the diff.

**Product loop** (the user-visible side, owned by `/specification` + `/visual-validation`):
1. **`docs/features/<app>/<slug>/spec/spec.md`** — *Summary* (level 1) and *What the user sees / does* toggles (level 2). The spec's "Why" + "Result" + "Q.O.D." sections are the only product framing source.
2. **`docs/features/<app>/<slug>/validation/visual-validation-*.md`** — most recent visual-validation report. Verdict at level 1; assertion table at level 2; screenshots embed inline via SHA-pinned raw blob URLs.

**Engineering loop** (the engineering side, owned by `/adr` + `/technical-validation`):
3. **`docs/adr/NNNN-*.md`** — every ADR whose number appears in (a) a commit message on the branch, (b) a source-code comment touched by the diff, or (c) a row of `docs/features/<app>/<slug>/plan/plan.md`, becomes the **sole source** for one bullet of the *Architecture choices* section. The skill never paraphrases architecture-choice content from anywhere else.
4. **`docs/features/<app>/<slug>/validation/technical-validation-*.md`** — most recent technical-validation report. Verdict at level 1; row-level findings at level 2.
5. **`docs/dantotsus/*.md`** — entries created since the base ref. Listed under a *Dantotsus uncovered* block at level 2.
6. **The diff** (`git diff origin/main...HEAD --stat` + `git log origin/main..HEAD`) — drives the *What changed* table at level 2.

**Orchestration loop** (only when `/tech-lead-orchestrator` drove the work — detected by the presence of `docs/features/<app>/<slug>/runs/<run-id>/`):
7. **`docs/features/<app>/<slug>/runs/<run-id>/state.json`** — final stage, retry counters, validator verdicts. Drives the level-1 counter line.
8. **`docs/features/<app>/<slug>/runs/<run-id>/journal.md.jsonl`** — chronological event log. Drives the Mermaid flowchart's node + edge order, including which retries were triggered by which FAIL verdicts.
9. **`docs/features/<app>/<slug>/runs/<run-id>/agents/*.md`** — per-agent verdict YAMLs. Drives the per-agent table (one row per dispatched sub-agent: round, agent, output summary, verdict, commits authored).

When the run directory is absent, the *Orchestration trace* section is skipped entirely — silence is information.

**Hard rule — architecture choices come only from ADRs.** If the diff makes a non-trivial design decision that has no ADR, the skill flags it in *Known gaps* and recommends running `/adr` before opening the PR. It never paraphrases the diff into the *Architecture choices* section: a sloppy ADR is fixable; a fabricated rationale rots silently.

Missing sources collapse: no empty `<details>` shells, no stubs. The absence of a section is itself information (no architectural decisions taken, no Dantotsus surfaced, etc.).

## How this phase works

1. **Resolve the branch context.**
   - Base ref = the upstream's `main` (`git rev-parse --abbrev-ref --symbolic-full-name @{u}` parent, fallback `origin/main`).
   - Feature slug = read from `claudemd` working-branch name (CLAUDE.md "Git Development Branch Requirements" pattern: `claude/<slug>-XXXX`). Allow the user to override.
2. **Resolve the spec / plan / validation paths.** From the slug, find `docs/features/<app>/<slug>/{spec,plan,validation}/`. The `<app>` segment is inferred from the touched files in the diff (the workspace under `apps/<app>/` with the largest delta).
3. **Confirm validation freshness.** If the latest visual-validation or technical-validation report is older than the most recent commit, surface a warning and ask whether to re-run (user can decline — the warning is then disclosed in the PR body).
4. **Read every input source.** Parse the spec's Why + Q.O.D. The plan's table. Each ADR. Each validation report.
4a. **Compute the orchestration trace (only if `runs/<run-id>/` exists).** Walk `journal.md.jsonl` chronologically to build the Mermaid edge list. Read each `agents/*.md` verdict YAML's front-matter to build the per-agent table. Count from `state.json`: implementation rounds = `retries.implement + 1`; validation rounds = `retries.validate + 1`; defects caught = number of `*_validation_completed` events with `status: FAIL` in the journal; kaizen items queued = lines under `## Items found during this session` in the gitignored `KAIZEN.md` (if absent, 0).
5. **Render the body.** Feed everything through `template.md`. The skill never invents content — every level-1 line is sourced verbatim or near-verbatim from spec / plan / ADR / validation reports.
6. **Show the draft body to the user.** Print it. The user can edit or approve. **The skill does not call `gh pr create` until the user says so explicitly.**
7. **Generate the screenshot URL block.** Once the user approves, the skill SHA-pins the screenshot URLs (`git rev-parse HEAD`) and rewrites the body's screenshot section in place.
8. **Call `gh pr create`** with `--title` and `--body-file <generated body>`. Title format: `feat(<scope>): <imperative present-tense — short>` per the repo's commitlint convention.
9. **Stage no commit.** The PR body is not committed; it lives in the GitHub PR description. The skill's only file side-effect is the eventual screenshot SHA-pinning.

## PreToolUse hook

The skill ships a hook at `.claude/hooks/pretool-gh-pr-create.sh`, wired in `.claude/settings.json` under `PreToolUse.Bash`. The hook inspects the command:

- If it matches `gh pr create` and the invocation carries `--body` or `--body-file` whose content has more than 800 chars and at least 3 `<details>` blocks, the hook returns 0 — the command runs as-is.
- Otherwise the hook returns a non-zero exit with a message pointing at `/open-pr`. The agent reads the message and re-invokes the skill before retrying.

The hook is a guard, not a writer — it never edits the command. The skill is the only path that produces a body.

## When to invoke (skill-side trigger)

- The user says `/open-pr`, "open a PR", "create a pull request".
- `/visual-validation` and `/technical-validation` both returned PASS (or PASS_EXCEPT_UNVERIFIABLE with the operator's awareness).
- The branch has unpushed commits and `gh repo view` confirms the upstream is `hugoleborso/<repo>` (CLAUDE.md repo scope).

Do **not** invoke when:
- Either validator is FAIL on the current HEAD. Fix the implementation first.
- The branch hasn't been pushed yet. Push first, then `/open-pr` (the hook also catches this).
- There is no `docs/features/<app>/<slug>/spec/spec.md`. The skill needs a spec to anchor the description; for trivial fixes (dependency bumps, formatting), use `gh pr create` directly with a short body.

## Verdict acceptance & disclosure

- **PASS / PASS** → mergeable. Description includes both reports' verdicts at level 1, with a link to the full report at level 2.
- **PASS / PASS_EXCEPT_UNVERIFIABLE** → mergeable with disclosure. Description adds a `## Validation gaps` block at level 1 listing each UNVERIFIABLE row (per the visual-validation / technical-validation skills' PR disclosure rule).
- **FAIL / anything** or **anything / FAIL** → the skill refuses to draft a PR body. The operator fixes the failing rows and re-runs validation.

## Failure modes to avoid

- **Over-summarising.** Level 1 is not a tagline; it has to actually let a reviewer decide whether to merge without opening any toggle. If the level 1 summary requires "see details" to make sense, it's wrong.
- **Stingy with `<details>`.** The opposite failure mode of *Over-summarising*. Default to collapsing aggressively — anything that isn't strictly load-bearing for the merge decision goes in a toggle. File-by-file rationale, trade-offs, alternatives considered, references-left-intact, test plan: every one of these is a `<details>` by default. Level 1 stays tight; the reviewer expands only what they need. The two failure modes set the band: Level 1 must stand alone, *and* everything else must collapse.
- **Pseudo-toggles.** A `<details>` with one line inside is noise. Either inline or skip.
- **Parroting git output.** Don't paste `git diff --stat`, `git log --oneline`, or `git grep` commands into the PR body — GitHub already renders the diff, the file tree, and the commit list natively on the PR page. The body's job is to talk about *what changed and why*, not *which lines moved*. Same goes for the test plan: don't write `git grep adr-writer returns nothing` — write the behavioural assertion ("no live references to the deleted skill remain in the active config").
- **Lying screenshots.** SHA-pin every screenshot URL to the head commit before opening the PR; raw GitHub URLs to `main` rot when the branch is deleted.
- **Inventing content.** Level-1 lines are sourced from spec / plan / ADR; the skill never paraphrases beyond what those documents say. If the spec is sloppy, fix the spec — don't paper over it in the PR body.
- **Skipping the architecture-choices section** when ADRs exist. Reviewers care more about *why this design* than *what changed* — the choice block is the section they'd add on a code review even if it's missing.
- **Calling `gh pr create` without operator approval.** The skill is "draft + show + ask + send" — never "draft + send".
- **Forgetting the disclosure on UNVERIFIABLE.** The PR body must list the UNVERIFIABLE rows up-front; relying on the linked report alone defeats the gate.

## Repo-specific notes

- Title format: conventional-commits (`commitlint.config.js`), `feat(scope): subject`, subject lowercased, ≤ 70 chars.
- Body lives in the PR description, never as a file in-tree.
- The PR is opened as a draft (`--draft`) when the user hasn't explicitly said "ready to merge"; the draft state surfaces the validation gaps before a reviewer is pinged.
- Repo scope: `hugoleborso/<repo>`. The skill refuses to draft a PR against any other org (CLAUDE.md repo guard).

## Auto-chain on PR merge

When the PR merges, `/after-task-dantotsus` fires for the kaizen sweep. The PR's body — specifically the *Dantotsus uncovered* block — feeds the sweep so the agent knows what's already been captured.

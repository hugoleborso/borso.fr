---
name: adr
description: Write an Architecture Decision Record under `docs/adr/NNNN-<slug>.md`. Two entry modes — (a) interactive: walk the operator through a 5-round decision-support trade-off (frame → criteria → options → score → choice + consequences), where the markdown file is the byproduct; (b) piloted: invoked by `/tech-lead-orchestrator` with the slug, decision summary, alternatives, and triggers already mined from the spec, in which case the walk is skipped and the file is written from the inputs. Use when the user says "/adr", "I need to decide between X and Y", "help me pick", "draft an ADR", "record this choice", "write an ADR for X", or when `/tech-lead-orchestrator` calls it after the human ratifies an ADR candidate. Loads its standard and template from `.claude/skills/adr/`.
---

# ADR skill

One skill, two entry modes — both end with `docs/adr/NNNN-<slug>.md` written, the index updated, and (when piloted) a verdict YAML emitted for the orchestrator.

- **Interactive (default).** Human types `/adr` or asks for help on a trade-off. The skill walks the 5 rounds — *frame → criteria → options → score → choose* — and refuses to write the file if any round is shortcut. The 30-minute conversation the operator wishes they'd had before silently picking Option A.
- **Piloted (called by `/tech-lead-orchestrator`).** The orchestrator has already mined the spec's Q.O.D. + Changes / Types sections, surfaced candidates to Hugo via `AskUserQuestion`, and is invoking `/adr` for each ratified candidate. The walk is **skipped** — the orchestrator hands over `{ slug, decision-summary, triggers, alternatives, supersedes? }` and expects the file written + a verdict YAML emitted per the [sub-agent contract](../tech-lead-orchestrator/sub-agent-contract.md).

Whichever mode runs, the skill calls the same **mechanical procedure** (numbering, conflict check, write, index update, supersedes handling) — described in *Procedure* below.

The canonical standard lives at [`standard.md`](./standard.md). The markdown template the skill emits is at [`template.md`](./template.md).

## Failure modes the skill exists to prevent

1. **Optimistic-default.** "We'll use X — everyone does." The skill forces the operator to name at least one viable alternative and articulate the cost of *not* picking it. (Interactive mode catches this in Round 3; piloted mode rejects an `alternatives` input of length < 2.)
2. **Retro-justification.** Listing criteria *after* the choice is made is opinion dressed as analysis. Interactive mode builds the rubric before scoring; piloted mode requires the orchestrator to pass `criteria[]` upfront.
3. **Decision-without-alternatives.** ≥ 2 viable options is the floor; one is a constraint, not a decision. The skill refuses to write the file.
4. **Missing consequences.** Two negative consequences are mandatory in *Consequences*. If the operator (or the orchestrator's payload) can't name them, the analysis was lopsided.
5. **Lopsided rubric.** If every cell of the comparison matrix agrees, the rubric doesn't differentiate. Push back.

## Mode A — Interactive walkthrough (5 rounds)

Each round is one `AskUserQuestion` (or two, when the answer drives the next question). The skill never synthesises rationale on the operator's behalf — that defeats the audit.

### Round 1 — Frame the problem

Ask the operator to describe, in 3–5 sentences:

- **What forces are pushing on the decision?** Concrete observable forces — cost, latency, operator skillset, vendor lock, schema-drift risk. Not "we want it to be good".
- **What constraints close which doors?** Things that are non-negotiable: regulatory, budget cap, must run on Lambda, must work offline at the race.
- **What's the blast radius of getting it wrong?** Reversible at zero cost → consider skipping the ADR. One-way door → the whole walk is justified.

If the framing is fuzzy, the skill pushes back ("name the force in one phrase") rather than letting fuzziness propagate.

### Round 2 — Define criteria *before* options

Build the rubric. The operator names 3–5 criteria with weights (`high` / `medium` / `low`) — not 1-to-5 scales (hides reasoning). For each criterion, a one-line justification: *why does it matter, anchored to the framing*.

Example:

| Criterion | Weight | Why it matters |
|---|---|---|
| Idle cost ($/mo at peak-of-zero) | high | The race runs once a year; idle dominates. |
| Time-to-recovery on vendor outage | medium | DSQL is regional; outages are rare but long. |
| Drizzle/Postgres tooling familiarity | low | The author already drives drizzle daily. |

If a criterion can't be tied to the framing in one line, the skill pushes back. "Generic best practice" is not a criterion.

### Round 3 — Surface options

Ask the operator to list **at least two** viable options. The skill prompts:

- The "obvious default" (whatever the operator was about to pick).
- The strict alternative (the option that wins under a different weighting).
- The "no" option (do nothing / postpone / pick a smaller scope).

If the operator can't name a second viable option, the skill calls it out: *"This isn't a decision — it's a constraint. Either find an alternative or drop the ADR and write a code comment."*

### Round 4 — Score against the rubric

For each (option, criterion) pair, the operator supplies `✓ <one-line justification>` or `✗ <one-line justification>`. No grades, no stars — the audit value is the justification.

The skill renders a comparison matrix:

|   | Option A | Option B | Option C |
|---|---|---|---|
| Idle cost | ✓ <30 USD | ✗ 150 USD | ✓ <30 USD |
| Time-to-recovery | ✓ vendor-managed | ✗ on-call | ✓ vendor-managed |
| Tooling | ✓ drizzle | ✓ drizzle | ✗ custom |

If every cell is `✓` or every cell is `✗`, the rubric is broken. Push back: a useful rubric *differentiates* options.

### Round 5 — Force the choice + its consequences

Ask the operator to:

- **Name the winner**, in one paragraph. The skill writes this into *Decision*.
- **List two negative consequences** of the winner. *Closed doors, costs we're now paying.* The skill writes them into *Consequences* under `-`. If the operator can't name a negative, the analysis was lopsided.
- **State the rejection rationale** for each non-winner: *"loses on criterion X by Y"*. The skill writes those into *Alternatives considered*.

Then call the *Procedure* below to write the file.

## Mode B — Piloted by `/tech-lead-orchestrator`

The orchestrator invokes this skill via the `Skill` tool with a payload describing one ratified ADR candidate. Expected inputs in the invocation prompt:

- `slug` — kebab-case, ≤ 6 words, describes the **decision**, not the feature.
- `triggers` — non-empty subset of the 4 ADR triggers (cf. [tech-lead-orchestrator/standard.md *ADR triggers*](../tech-lead-orchestrator/standard.md#adr-triggers-4-or)).
- `decision-summary` — one paragraph naming the chosen path.
- `alternatives` — list of ≥ 1 rejected option (+1 chosen = ≥ 2 total). Each entry carries `name`, `summary`, `rejection-rationale`.
- `criteria` — list of 3–5 criteria with weights and a one-line "why it matters" anchored to the spec.
- `score-matrix` — table mapping each (option, criterion) to `✓` / `✗` + justification.
- `consequences` — at least two `-` (closed doors / costs), one or more `+`, optional `~`.
- `supersedes?` — list of ADR numbers explicitly replaced (optional).
- `feature-path` — `docs/features/<app>/<slug>/` for the verdict YAML location.
- `run-id`, `step` — to locate `runs/<run-id>/agents/adr-<step>.md`.

The skill **does not** re-walk the rounds. It validates the payload (≥ 2 alternatives, ≥ 2 negative consequences, rubric differentiates), runs *Procedure*, and emits a verdict YAML to `<feature-path>/runs/<run-id>/agents/adr-<step>.md`. If validation fails (e.g. `alternatives.length < 2`), the verdict is `status: blocked` with `next: { kind: 'escalate', reason: '<why>' }`.

## Procedure (both modes)

1. **Read** the latest version of [`standard.md`](./standard.md) and [`template.md`](./template.md).
2. **List existing ADRs:** `ls docs/adr/`. Filter for filenames matching `NNNN-<slug>.md`.
3. **Pick the number.** Find the highest 4-digit prefix across the listing and add 1. Pad to 4 digits. If the directory has no matching files, the next number is `0001`.
4. **Check conflicts.** Iterate the existing ADRs. An ADR conflicts when **all** of:
   - its slug equals the new ADR's slug, **and**
   - its status is `accepted`, **and**
   - its number is **not** declared in the new ADR's `supersedes`.

   If any conflict exists:
   - **Piloted mode:** emit verdict `status: blocked`, `next: { kind: 'escalate', reason: 'adr-conflict-<slug>' }`, and stop. The orchestrator surfaces the conflict to the human.
   - **Interactive mode:** ask the operator via `AskUserQuestion` whether the new ADR supersedes the conflicting one(s). If yes, add the numbers to `supersedes` and continue. If no, bail out with a message.
5. **Fill the template.** Map inputs (interactive: collected across rounds; piloted: from the payload) to the 7 mandatory sections of [`template.md`](./template.md): header block, Context, Decision, Consequences, Alternatives considered (chosen first), Evaluation rubric, Implementation pointers.
6. **Write the file** at `docs/adr/NNNN-<slug>.md` with the rendered markdown. Header reads `# ADR-NNNN: <title>` with the number zero-padded to 4 digits.
7. **Update the index** `docs/adr/README.md`:
   - Append a row to the main `| # | Title | Status | Date |` table.
   - Append a one-line entry under the right area heading (CDK, App architecture, Data, Observability, Tooling / DevX). Create the heading if it doesn't exist. **Never reorder existing entries** — the README is manually curated.
8. **Mark superseded predecessors.** If `supersedes` is non-empty, edit each predecessor's header: set `**Status:** superseded by ADR-NNNN`, leave the rest of the file untouched.
9. **Piloted mode only — emit verdict YAML.** Write to `<feature-path>/runs/<run-id>/agents/adr-<step>.md`:
   ```yaml
   ---
   status: done
   summary: ADR-NNNN written at docs/adr/NNNN-<slug>.md.
   artifacts:
     - docs/adr/NNNN-<slug>.md
     - docs/adr/README.md
   ---
   ```
   Append `# Detail` + a short human-readable body below. The orchestrator reads only the front-matter.

## When to invoke

Yes:
- The operator faces two or more viable options. (Two is the floor; one is a constraint, not a decision.)
- The choice is hard to reverse — vendor lock, schema shape, framework choice, security model.
- A `/technical-conception` plan row already lists a trade-off but doesn't anchor *why this side won*.
- The operator says "I'm tempted to do X, but…"
- The orchestrator detects an ADR-qualifying decision in the spec's Q.O.D. + Changes / Types sections and Hugo confirmed *Write ADR*.

No:
- Reversible-at-zero-cost choices (variable names, file layout within a folder).
- Cases where `CLAUDE.md` or a `docs/knowledge/` entry already settles the question. Cross-link instead.
- A coding-style choice already covered by Biome / CLAUDE.md *Clean code* — those go in the linter.
- An accepted ADR with the same slug already exists and the new invocation hasn't declared `supersedes`. See *Procedure* step 4.

## What `/open-pr` reads back

The PR description's `## Architecture choices` section is *built from the ADRs* referenced by the diff or the plan. Each ADR contributes:

- Its **Decision** paragraph at level 1 (PR body, always visible) — the one-sentence "we picked X because Y".
- Its **Alternatives considered + Evaluation rubric** at level 2 (collapsed `<details>`).
- Its **Implementation pointers** at level 3 (nested `<details>`).

The ADR is the only source for those sections. `/open-pr` does **not** synthesise architecture-choice content from commits or plan rows — if a non-trivial decision in the diff has no ADR, `/open-pr` flags it in *Known gaps* and points back here.

That's the contract: the walk (or the orchestrator's payload) produces a record rich enough that the PR description carries the full reasoning without re-deriving it. If the inputs are sloppy, the PR body inherits the sloppiness.

## Auto-chain & maintenance

- On PR merge (`/after-task-dantotsus`), every ADR whose status is `proposed` and whose commit SHA matches the merge gets stamped to `accepted`.
- ADRs are append-only. To replace, the new ADR carries `**Supersedes:** ADR-XXXX` and the old one's status flips to `superseded by ADR-NNNN`. Both files stay.

## Repo-specific notes

- ADRs live at `docs/adr/`, next to `docs/dantotsus/` and `docs/knowledge/`.
- Filename: `NNNN-kebab-slug.md`. NNNN is zero-padded to 4 digits, monotonically increasing.
- The skill always reads [`standard.md`](./standard.md) before walking or rendering — that's where section names, status lifecycle, and the rubric format are pinned. Drift would break `/open-pr`.
- This skill is markdown-driven. No `package.json`, no test suite. The LLM is the runtime.
